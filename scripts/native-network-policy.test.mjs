import test from "node:test";
import assert from "node:assert/strict";
import { isNativeTransportUrl } from "./native-network-policy.mjs";
test("native qualification allows the local app and IPC bridge without allowing remote lookalikes", () => {
  for (const url of [
    "http://tauri.localhost/index.html",
    "http://ipc.localhost/state_put",
    "https://ipc.localhost/state_get",
    "http://localhost/",
  ]) {
    assert.equal(isNativeTransportUrl(url), true, url);
  }
  for (const url of [
    "https://example.org/paper",
    "https://ipc.localhost.example.org/state_put",
    "https://ipc.localhost@example.org/state_put",
    "https://user:pass@ipc.localhost/state_get",
    "file:///C:/Windows/System32/cmd.exe",
    "invalid",
  ]) {
    assert.equal(isNativeTransportUrl(url), false, url);
  }
});
