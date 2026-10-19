#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use rusqlite::{Connection, OptionalExtension, params};
use std::sync::Mutex;
use tauri::{Manager, State, WebviewWindow, Emitter};
struct Database(Mutex<Connection>);
fn authorized(window: &WebviewWindow) -> Result<(), String> {
    if window.label() == "main" { Ok(()) } else { Err("Audience window cannot access project storage".into()) }
}
#[tauri::command]
fn state_get(window: WebviewWindow, db: State<Database>, key: String) -> Result<Option<String>,String> {
    authorized(&window)?;
    let conn=db.0.lock().map_err(|e|e.to_string())?;
    conn.query_row("SELECT value FROM state WHERE key=?1",[key],|row|row.get(0)).optional().map_err(|e|e.to_string())
}
#[tauri::command]
fn state_put(window: WebviewWindow, db: State<Database>, key: String, value: Option<String>) -> Result<(),String> {
    authorized(&window)?;
    let mut conn=db.0.lock().map_err(|e|e.to_string())?;
    persist_state(&mut conn, &key, value)
}
fn persist_state(conn: &mut Connection,key: &str,value:Option<String>) -> Result<(),String> {
    let tx=conn.transaction().map_err(|e|e.to_string())?;
    if key == "juw-microslides-schema-1" {
        if let Some(ref next)=value {
            let previous:Option<String>=tx.query_row("SELECT value FROM state WHERE key=?1",[&key],|r|r.get(0)).optional().map_err(|e|e.to_string())?;
            let mut history:Vec<serde_json::Value>=tx.query_row("SELECT value FROM state WHERE key='deck-revisions'",[],|r|r.get::<_,String>(0)).optional().map_err(|e|e.to_string())?.and_then(|s|serde_json::from_str(&s).ok()).unwrap_or_default();
            let after:serde_json::Value=serde_json::from_str(next).map_err(|e|e.to_string())?;
            if let Some(old)=previous.and_then(|s|serde_json::from_str::<serde_json::Value>(&s).ok()) {
                if let Some(decks)=old["state"]["library"].as_array() {
                    let now=std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_err(|e|e.to_string())?.as_millis() as u64;
                    for (i,deck) in decks.iter().enumerate() {
                        let unchanged=after["state"]["library"].as_array().map(|a|a.iter().any(|d| d==deck)).unwrap_or(false);
                        if !unchanged {history.push(serde_json::json!({"id":format!("{}-{}-{}",now,i,history.len()),"createdAt":now,"deck":deck}));}
                    }
                }
            }
            while history.len()>100 || serde_json::to_vec(&history).map_err(|e|e.to_string())?.len()>20_000_000 { if history.is_empty(){break;} history.remove(0); }
            tx.execute("INSERT INTO state(key,value) VALUES('deck-revisions',?1) ON CONFLICT(key) DO UPDATE SET value=excluded.value",[serde_json::to_string(&history).map_err(|e|e.to_string())?]).map_err(|e|e.to_string())?;
        }
    }
    match value {
        Some(v)=> {tx.execute("INSERT INTO state(key,value) VALUES(?1,?2) ON CONFLICT(key) DO UPDATE SET value=excluded.value",params![key,v]).map_err(|e|e.to_string())?;}
        None=> {tx.execute("DELETE FROM state WHERE key=?1",[key]).map_err(|e|e.to_string())?;}
    }
    tx.commit().map_err(|e|e.to_string())
}
#[tauri::command]
fn launch_project(window:WebviewWindow)->Result<Option<Vec<u8>>,String>{
 authorized(&window)?;
 if let Some(path)=std::env::args().skip(1).find(|arg|arg.to_lowercase().ends_with(".juwslides")) {
  let metadata=std::fs::metadata(&path).map_err(|e|e.to_string())?;
  if metadata.len()>100_000_000 {return Err("Project exceeds 100 MB".into());}
  return std::fs::read(path).map(Some).map_err(|e|e.to_string());
 }
 Ok(None)
}

fn main() {
    tauri::Builder::default()
      .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
          if let Some(window)=app.get_webview_window("main") {
              let _=window.unminimize(); let _=window.set_focus();
              let _=window.emit("workspace-already-open", ());
          }
      }))
      .plugin(tauri_plugin_dialog::init())
      .plugin(tauri_plugin_fs::init())
      .plugin(tauri_plugin_opener::init())
      .setup(|app| {
          let dir=app.path().app_data_dir()?; std::fs::create_dir_all(&dir)?;
          let conn=Connection::open(dir.join("workspace.sqlite"))?;
          conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS state(key TEXT PRIMARY KEY,value TEXT NOT NULL);")?;
          app.manage(Database(Mutex::new(conn))); Ok(())
      })
      .invoke_handler(tauri::generate_handler![state_get,state_put,launch_project])
      .run(tauri::generate_context!()).expect("Application startup failed; existing database remains on disk");
}

#[cfg(test)]
mod tests {
 use super::*;
 fn db()->Connection{let c=Connection::open_in_memory().unwrap();c.execute_batch("CREATE TABLE state(key TEXT PRIMARY KEY,value TEXT NOT NULL);").unwrap();c}
 #[test]fn edits_and_recovery_snapshot_commit_together(){
  let mut c=db();let key="juw-microslides-schema-1";
  let first=serde_json::json!({"state":{"library":[{"id":"one","slides":["original"]}]}}).to_string();
  let next=serde_json::json!({"state":{"library":[{"id":"one","slides":["edited"]}]}}).to_string();
  persist_state(&mut c,key,Some(first)).unwrap();persist_state(&mut c,key,Some(next.clone())).unwrap();
  let stored:String=c.query_row("SELECT value FROM state WHERE key=?1",[key],|r|r.get(0)).unwrap();assert_eq!(stored,next);
  let raw:String=c.query_row("SELECT value FROM state WHERE key='deck-revisions'",[],|r|r.get(0)).unwrap();let history:serde_json::Value=serde_json::from_str(&raw).unwrap();assert_eq!(history[0]["deck"]["slides"][0],"original");
 }
 #[test]fn malformed_workspace_does_not_replace_last_good_save(){let mut c=db();let key="juw-microslides-schema-1";let original="{\"state\":{\"library\":[]}}";persist_state(&mut c,key,Some(original.into())).unwrap();assert!(persist_state(&mut c,key,Some("broken".into())).is_err());let raw:String=c.query_row("SELECT value FROM state WHERE key=?1",[key],|r|r.get(0)).unwrap();assert_eq!(raw,original);}
}
