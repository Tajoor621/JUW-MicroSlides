import { spawn, execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import assert from "node:assert/strict";
import { cpus, totalmem, release } from "node:os";
import { execFileSync as runGit } from "node:child_process";
const output = process.env.JUW_QA_OUTPUT || "desktop-qa";
await mkdir(output, { recursive: true });
const exe = resolve("src-tauri/target/release/juw-microslides.exe");
let processHandle, browser, activePage;
const startedAt = new Date().toISOString();
const timings = {};
const environment = {
  commit: runGit("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  platform: process.platform,
  windowsBuild: release(),
  node: process.version,
  cpu: cpus()[0]?.model || "unknown",
  logicalCpus: cpus().length,
  ramGiB: Math.round((totalmem() / 1073741824) * 100) / 100,
  fixtureOnly: true,
  representativeClassroomHardware: false,
};
const startupLog = [];
const startupErrors = [];
async function start() {
  processHandle = spawn(exe, [], {
    env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: "--remote-debugging-port=9222" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  processHandle.stdout.on("data", (chunk) => startupLog.push(String(chunk)));
  processHandle.stderr.on("data", (chunk) => startupLog.push(String(chunk)));
  processHandle.on("error", (error) => startupErrors.push(String(error)));
  let lastPage;
  let lastError = "";
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (processHandle.exitCode !== null) throw Error(`Desktop exited ${processHandle.exitCode}`);
    try {
      browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { timeout: 1000 });
      const pages = browser.contexts().flatMap((c) => c.pages());
      startupLog.push(`CDP pages: ${pages.map((p) => p.url()).join(", ")}`);
      const page =
        pages.find((p) => !p.url().includes("audience") && p.url().includes("tauri.localhost")) ||
        pages.find((p) => !p.url().includes("audience"));
      if (page) {
        lastPage = page;
        activePage = page;
        page.on("pageerror", (error) => {
          startupErrors.push(error.message);
          errors.push(error.message);
        });
        page.on("console", (message) => {
          if (message.type() === "error") startupErrors.push(message.text());
        });
        await page.getByText(/Windows desktop · V6.2.1/).waitFor({ timeout: 15000 });
        return page;
      }
    } catch (error) {
      lastError = String(error);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  if (lastPage) {
    await lastPage.screenshot({ path: join(output, "startup-failure.png") }).catch(() => {});
    startupLog.push(
      await lastPage
        .locator("body")
        .innerText()
        .catch(() => "Body unavailable"),
    );
  }
  await writeFile(
    join(output, "startup-diagnostics.json"),
    JSON.stringify(
      { lastError, startupLog, startupErrors, exitCode: processHandle.exitCode },
      null,
      2,
    ),
  );
  throw Error(`Desktop UI did not become ready: ${lastError}; ${startupErrors.join("; ")}`);
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
  const localModel = createServer((req, res) => {
    if (req.url === "/api/tags") {
      res.setHeader("content-type", "application/json");
      res.end('{"models":[]}');
    }
    // Chat deliberately remains pending to exercise cancellation of the native request.
  });
  await new Promise((resolve) => localModel.listen(0, "127.0.0.1", resolve));
  try {
    const port = localModel.address().port;
    const native = await page.evaluate(async (port) => {
      const invoke = (command, args) => window.__TAURI_INTERNALS__.invoke(command, args);
      const text = await invoke("local_ai_request", {
        id: "qa-tags",
        url: `http://127.0.0.1:${port}/api/tags`,
        body: null,
      });
      let publicRejected = false;
      try {
        await invoke("local_ai_request", {
          id: "qa-public",
          url: "https://example.com/api/tags",
          body: null,
        });
      } catch {
        publicRejected = true;
      }
      const pending = invoke("local_ai_request", {
        id: "qa-cancel",
        url: `http://127.0.0.1:${port}/api/chat`,
        body: "{}",
      }).then(
        () => false,
        (e) => String(e).includes("cancelled"),
      );
      await invoke("cancel_local_ai", { id: "qa-cancel" });
      return { models: JSON.parse(text).models, publicRejected, cancelled: await pending };
    }, port);
    assert.deepEqual(native, { models: [], publicRejected: true, cancelled: true });
  } finally {
    localModel.closeAllConnections();
    await new Promise((r) => localModel.close(r));
  }
  await page.getByLabel("Research approach", { exact: true }).selectOption("standard");
  await page.locator("#gen-topic").fill("Bacterial genome architecture");
  await page.locator("#gen-count").fill("6");
  const generationStart = performance.now();
  await page.getByRole("button", { name: "Generate deck", exact: true }).click();
  await page.getByText("Slide 1 of 6", { exact: true }).waitFor();
  timings.sixSlideBundledFixtureMs = Math.round(performance.now() - generationStart);
  await page
    .getByRole("textbox", { name: "Lecture topic", exact: true })
    .fill("Windows persistence fixture");
  await page.getByRole("textbox", { name: "Lecture topic", exact: true }).press("Tab");
  await page
    .getByRole("status")
    .filter({ hasText: /Saved on this device/ })
    .waitFor();
  const duplicate = spawn(exe, [], { stdio: "ignore" });
  const duplicateExit = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      duplicate.kill();
      reject(Error("A second authoring instance stayed open"));
    }, 10000);
    duplicate.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    duplicate.once("exit", (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });
  assert.equal(duplicateExit, 0, "Second launch should hand focus to the existing workspace");
  assert.equal(
    await page.getByRole("textbox", { name: "Lecture topic", exact: true }).inputValue(),
    "Windows persistence fixture",
  );
  const fileOpenerDenied = await page.evaluate(async () => {
    try {
      await window.__TAURI_INTERNALS__.invoke("plugin:opener|open_url", {
        url: "file:///C:/Windows/System32/cmd.exe",
      });
      return false;
    } catch {
      return true;
    }
  });
  assert(fileOpenerDenied, "Source links must not open local executable paths");
  await page.screenshot({ path: join(output, "windows-editor.png") });
  stop();
  await new Promise((r) => setTimeout(r, 1500));
  page = await start();
  await page.getByRole("textbox", { name: "Lecture topic", exact: true }).waitFor();
  assert.equal(
    await page.getByRole("textbox", { name: "Lecture topic", exact: true }).inputValue(),
    "Windows persistence fixture",
  );
  const librarySnapshot = async (target) =>
    target.evaluate(async () => {
      const raw = await window.__TAURI_INTERNALS__.invoke("state_get", {
        key: "juw-microslides-schema-1",
      });
      return JSON.parse(raw).state.library;
    });
  const beforeNotes = await librarySnapshot(page);
  await page.getByRole("button", { name: "Writing Notes", exact: true }).click();
  await page.getByLabel("Notes topic", { exact: true }).fill("Native notes persistence fixture");
  await page
    .getByLabel("Editable notes", { exact: true })
    .fill("SQLite notes persist independently from lecture decks.");
  await page
    .getByText(/Saved on this device/)
    .first()
    .waitFor();
  await page.waitForTimeout(1000);
  stop();
  await new Promise((r) => setTimeout(r, 1500));
  page = await start();
  await page.getByRole("button", { name: "Writing Notes", exact: true }).click();
  assert.equal(
    await page.getByLabel("Editable notes", { exact: true }).inputValue(),
    "SQLite notes persist independently from lecture decks.",
  );
  assert.deepEqual(
    await librarySnapshot(page),
    beforeNotes,
    "Writing Notes must not change the deck",
  );
  await page.screenshot({ path: join(output, "windows-notes-recovered.png") });
  await page.getByRole("textbox", { name: "Lecture topic", exact: true }).press("F5");
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
  assert(
    await audience.evaluate(async () => {
      try {
        await window.__TAURI_INTERNALS__.invoke("local_ai_request", {
          id: "qa-audience",
          url: "http://localhost/api/tags",
          body: null,
        });
        return false;
      } catch {
        return true;
      }
    }),
    "Audience window must not invoke local model requests",
  );
  await page.screenshot({ path: join(output, "windows-presenter.png") });
  await audience.screenshot({ path: join(output, "windows-audience.png") });
  assert.deepEqual(errors, []);
  assert.deepEqual(startupErrors, [], "No native renderer errors across any restart");
  await writeFile(
    join(output, "windows-result.json"),
    JSON.stringify(
      {
        ok: true,
        startedAt,
        completedAt: new Date().toISOString(),
        environment,
        timings,
        checks: [
          "Native WebView UI renders",
          "Native local-AI bridge returns local JSON, rejects public hosts and cancels requests",
          "Exact six-slide generation",
          "Second launch preserves a single workspace writer",
          "SQLite persistence survives forced termination",
          "Writing Notes survive forced termination through native SQLite without changing lecture content",
          "F5 presents while an editor field has focus",
          "Separate audience window renders",
          "Audience storage access denied",
        ],
        limitations: [
          "Synthetic local fixtures, not independent scientific review or model performance qualification",
          "Local note persistence is exercised; loopback Rust transport uses a synthetic fixture. OS airplane mode, physical LAN reachability and real-model inference remain untested",
          "Generation timing is one bundled six-slide fixture on hosted CI, not P95 time-to-reviewed-deck",
          "Physical projectors, mixed DPI and installer UX require real-device review",
        ],
      },
      null,
      2,
    ),
  );
  console.log("Windows native smoke passed");
} catch (error) {
  await activePage?.screenshot({ path: join(output, "native-failure.png") }).catch(() => {});
  await writeFile(
    join(output, "windows-result.json"),
    JSON.stringify(
      {
        ok: false,
        startedAt,
        completedAt: new Date().toISOString(),
        environment,
        timings,
        error: String(error),
        startupErrors,
        errors,
      },
      null,
      2,
    ),
  );
  throw error;
} finally {
  stop();
}
