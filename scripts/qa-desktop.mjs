import { spawn, execFileSync } from "node:child_process";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import assert from "node:assert/strict";
const output = process.env.JUW_QA_OUTPUT || "desktop-qa";
await mkdir(output, { recursive: true });
const exe = resolve("src-tauri/target/release/juw-microslides.exe");
let processHandle, browser;
async function start() {
  processHandle = spawn(exe, [], {
    env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: "--remote-debugging-port=9222" },
    stdio: "ignore",
  });
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (processHandle.exitCode !== null) throw Error(`Desktop exited ${processHandle.exitCode}`);
    try {
      browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { timeout: 1000 });
      const pages = browser.contexts().flatMap((c) => c.pages());
      const page = pages.find((p) => !p.url().includes("audience"));
      if (page) {
        await page.getByText(/Windows desktop · V6.2.1/).waitFor({ timeout: 15000 });
        return page;
      }
    } catch {
      /* WebView2 is still starting. */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw Error("Desktop UI did not become ready");
}
function stop() {
  if (processHandle?.pid) {
    try {
      execFileSync("taskkill", ["/PID", String(processHandle.pid), "/T", "/F"], {
        stdio: "ignore",
      });
    } catch {
      /* Already exited. */
    }
  }
}
const errors = [];
try {
  let page = await start();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.locator("#gen-topic").fill("Bacterial genome architecture");
  await page.locator("#gen-count").fill("6");
  await page.getByRole("button", { name: "Generate deck", exact: true }).click();
  await page.getByText("Slide 1 of 6", { exact: true }).waitFor();
  await page
    .getByRole("textbox", { name: "Lecture topic", exact: true })
    .fill("Windows persistence fixture");
  await page.getByRole("textbox", { name: "Lecture topic", exact: true }).press("Tab");
  await page
    .getByRole("status")
    .filter({ hasText: /Saved on this device/ })
    .waitFor();
  await page.screenshot({ path: join(output, "windows-editor.png") });
  stop();
  await new Promise((r) => setTimeout(r, 1500));
  page = await start();
  await page.getByRole("textbox", { name: "Lecture topic", exact: true }).waitFor();
  assert.equal(
    await page.getByRole("textbox", { name: "Lecture topic", exact: true }).inputValue(),
    "Windows persistence fixture",
  );
  await page.getByRole("button", { name: "Present", exact: true }).click();
  await page.getByRole("button", { name: "Open audience display", exact: true }).click();
  const deadline = Date.now() + 15000;
  let audience;
  while (Date.now() < deadline) {
    audience = browser
      .contexts()
      .flatMap((c) => c.pages())
      .find((p) => p.url().includes("audience=1"));
    if (audience) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  assert(audience, "A separate audience window must exist");
  await audience.locator("[data-slide-stage]").waitFor();
  assert(!(await audience.locator("body").innerText()).includes("Private presenter console"));
  const rejected = await audience.evaluate(async () => {
    try {
      await window.__TAURI_INTERNALS__.invoke("state_get", { key: "juw-microslides-schema-1" });
      return false;
    } catch {
      return true;
    }
  });
  assert(rejected, "Audience window must not read project storage");
  await page.screenshot({ path: join(output, "windows-presenter.png") });
  await audience.screenshot({ path: join(output, "windows-audience.png") });
  assert.deepEqual(errors, []);
  await writeFile(
    join(output, "windows-result.json"),
    JSON.stringify(
      {
        ok: true,
        checks: [
          "Native WebView UI renders",
          "Exact six-slide generation",
          "SQLite persistence survives forced termination",
          "Separate audience window renders",
          "Audience storage access denied",
        ],
        limitations: ["Physical projectors, mixed DPI and installer UX require real-device review"],
      },
      null,
      2,
    ),
  );
  console.log("Windows native smoke passed");
} finally {
  stop();
}
