use std::{collections::HashMap, net::IpAddr, sync::Mutex, time::Duration};
use tauri::{State, WebviewWindow};
use tokio::sync::watch;

enum RequestState {
    Cancelled,
    Running(watch::Sender<bool>),
}
#[derive(Default)]
pub struct Requests(Mutex<HashMap<String, RequestState>>);

fn endpoint(raw: &str, post: bool) -> Result<reqwest::Url, String> {
    let url = reqwest::Url::parse(raw).map_err(|_| "Invalid local AI URL")?;
    let host = url.host_str().unwrap_or("").trim_matches(['[', ']']);
    let local = host == "localhost"
        || host
            .parse::<IpAddr>()
            .map(|ip| match ip {
                IpAddr::V4(v) => v.is_loopback() || v.is_private(),
                IpAddr::V6(v) => v.is_loopback(),
            })
            .unwrap_or(false);
    let path_ok = if post {
        matches!(url.path(), "/api/chat" | "/api/embed" | "/api/show")
    } else {
        url.path() == "/api/tags"
    };
    if !local
        || !matches!(url.scheme(), "http" | "https")
        || !url.username().is_empty()
        || url.password().is_some()
        || url.query().is_some()
        || url.fragment().is_some()
        || !path_ok
    {
        return Err(
            "Only local/private Ollama chat, embed, show and tags endpoints are permitted".into(),
        );
    }
    Ok(url)
}
fn authorize(window: &WebviewWindow, id: &str) -> Result<(), String> {
    if window.label() != "main"
        || id.is_empty()
        || id.len() > 80
        || !id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-')
    {
        return Err("Local AI access denied".into());
    }
    Ok(())
}
#[tauri::command]
pub fn cancel_local_ai(
    window: WebviewWindow,
    requests: State<Requests>,
    id: String,
) -> Result<(), String> {
    authorize(&window, &id)?;
    let mut map = requests.0.lock().map_err(|e| e.to_string())?;
    if let Some(RequestState::Running(tx)) = map.get(&id) {
        let _ = tx.send(true);
    } else if map.len() < 128 {
        map.insert(id, RequestState::Cancelled);
    }
    Ok(())
}
#[tauri::command]
pub async fn local_ai_request(
    window: WebviewWindow,
    requests: State<'_, Requests>,
    id: String,
    url: String,
    body: Option<String>,
) -> Result<String, String> {
    authorize(&window, &id)?;
    let url = endpoint(&url, body.is_some())?;
    if body.as_ref().is_some_and(|b| b.len() > 24_000_000) {
        return Err("Local AI request exceeds 24 MB".into());
    }
    let (tx, mut cancelled) = watch::channel(false);
    {
        let mut map = requests.0.lock().map_err(|e| e.to_string())?;
        match map.get(&id) {
            Some(RequestState::Cancelled) => {
                map.remove(&id);
                return Err("Local AI request cancelled".into());
            }
            Some(_) => return Err("Duplicate local AI request".into()),
            None => {}
        }
        if map.len() >= 128 {
            return Err("Too many local AI requests".into());
        }
        map.insert(id.clone(), RequestState::Running(tx));
    }
    let request = async {
        let client = reqwest::Client::builder()
            .no_proxy()
            .redirect(reqwest::redirect::Policy::none())
            .timeout(Duration::from_secs(180))
            .build()
            .map_err(|e| e.to_string())?;
        let builder = if let Some(body) = body {
            client
                .post(url)
                .header("Content-Type", "application/json")
                .body(body)
        } else {
            client.get(url)
        };
        let mut response = builder.send().await.map_err(|e| e.to_string())?;
        if !response.status().is_success() {
            return Err(format!("Local AI returned {}", response.status()));
        }
        let mut bytes = Vec::new();
        while let Some(chunk) = response.chunk().await.map_err(|e| e.to_string())? {
            if bytes.len() + chunk.len() > 8_000_000 {
                return Err("Local AI response exceeds 8 MB".into());
            }
            bytes.extend_from_slice(&chunk);
        }
        String::from_utf8(bytes).map_err(|_| "Local AI response is not UTF-8".into())
    };
    let result = tokio::select! { value = request => value, _ = cancelled.changed() => Err("Local AI request cancelled".into()) };
    requests.0.lock().map_err(|e| e.to_string())?.remove(&id);
    result
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn restricts_ollama_endpoints() {
        for url in [
            "http://localhost:11434/api/chat",
            "http://localhost:11434/api/show",
            "http://127.0.0.1:11434/api/chat",
            "http://[::1]:11434/api/chat",
            "http://192.168.1.2:11434/api/chat",
            "http://10.0.0.2:11434/api/chat",
            "https://172.16.0.2/api/chat",
        ] {
            assert!(endpoint(url, true).is_ok(), "{url}");
        }
        for url in [
            "https://example.com/api/chat",
            "http://169.254.169.254/api/chat",
            "http://192.168.1.2/api/pull",
            "http://user@localhost/api/chat",
            "http://localhost/api/chat?x=1",
            "http://localhost/api/chat#x",
            "file:///api/chat",
        ] {
            assert!(endpoint(url, true).is_err(), "{url}");
        }
        assert!(endpoint("http://localhost/api/tags", false).is_ok());
        assert!(endpoint("http://localhost/api/tags", true).is_err());
    }
}
