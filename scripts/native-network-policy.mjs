// Tauri's virtual application and IPC hosts are local WebView transports.
// This allowlist is for the qualification harness, not an application permission grant.
export function isNativeTransportUrl(raw) {
  try {
    const url = new URL(raw);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      ["tauri.localhost", "ipc.localhost", "localhost"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}
