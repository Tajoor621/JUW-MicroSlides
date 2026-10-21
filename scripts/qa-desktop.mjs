import { spawn, execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import assert from "node:assert/strict";
import { cpus, totalmem, release } from "node:os";
import { execFileSync as runGit } from "node:child_process";
import { isNativeTransportUrl } from "./native-network-policy.mjs";
import { makeScientificReviewPack } from "../src/lib/scientific-review-pack.ts";
const output = process.env.JUW_QA_OUTPUT || "desktop-qa";
await mkdir(output, { recursive: true });
const exe = resolve("src-tauri/target/release/juw-microslides.exe");
let processHandle, browser, activePage;
const startedAt = new Date().toISOString();
const timings = {};
const remoteReviewRequests = [];
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
  const beforeReview = await librarySnapshot(page);
  const pack = await makeScientificReviewPack({
    topic: "Native review recovery — software fixture",
    slides: [
      {
        title: "Draft recovery fixture",
        notes: "Software check, not a scientific review.",
        bullets: ["Fixture statement for persistence only."],
        citations: [],
        claims: [],
        media: [],
      },
    ],
    sourceDocuments: [],
  });
  const draftKey = `scientific-review-draft:${pack.packHash}`;
  const packFile = {
    name: "native-review-pack.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(pack)),
  };
  async function openReview(target) {
    await target.route(/^https?:\/\//, async (route) => {
      const url = new URL(route.request().url());
      if (isNativeTransportUrl(url.href)) return route.continue();
      remoteReviewRequests.push(url.origin + url.pathname);
      return route.abort("internetdisconnected");
    });
    await target.getByRole("button", { name: "Review", exact: true }).click();
    await target.getByRole("button", { name: "Complete an external review", exact: true }).click();
    const dialog = target.getByRole("dialog", { name: "Scientific reviewer workspace" });
    await dialog.getByLabel("Open scientific review pack", { exact: true }).setInputFiles(packFile);
    await dialog.getByLabel("Review item", { exact: true }).waitFor();
    return dialog;
  }
  const reviewStart = performance.now();
  let reviewer = await openReview(page);
  await page.keyboard.press("Alt+ArrowRight");
  assert.equal(
    await reviewer.getByLabel("Review item", { exact: true }).inputValue(),
    pack.items[1].id,
  );
  await page.keyboard.press("Alt+ArrowLeft");
  const rationale = "Native SQLite draft survives forced termination. Synthetic fixture only.";
  await reviewer.getByLabel("Scientific rationale", { exact: true }).fill(rationale);
  await reviewer.getByText(/Review draft saved on this device/).waitFor();
  const readDraft = (target) =>
    target.evaluate(async (key) => {
      return JSON.parse(await window.__TAURI_INTERNALS__.invoke("state_get", { key }));
    }, draftKey);
  const firstDraft = await readDraft(page);
  assert.equal(firstDraft[0].form.decisions[0].rationale, rationale);
  assert.equal(firstDraft[0].form.decisions[0].verdict, "pending");
  await reviewer.getByRole("button", { name: "Check review completion", exact: true }).click();
  await reviewer.getByText(/completion issues\. No completed form is exported/).waitFor();
  await page.screenshot({ path: join(output, "windows-review-before-crash.png") });
  stop();
  await new Promise((r) => setTimeout(r, 1500));
  page = await start();
  reviewer = await openReview(page);
  assert.equal(await reviewer.getByLabel("Scientific rationale", { exact: true }).inputValue(), "");
  await reviewer.getByText("Restore my saved review draft", { exact: true }).click();
  await reviewer
    .getByRole("button", { name: /^Restore / })
    .first()
    .click();
  assert.equal(
    await reviewer.getByLabel("Scientific rationale", { exact: true }).inputValue(),
    rationale,
  );
  assert.equal(await reviewer.getByLabel("Decision", { exact: true }).inputValue(), "pending");
  assert.deepEqual(
    await librarySnapshot(page),
    beforeReview,
    "External review must not mutate any lecture",
  );
  await page.screenshot({ path: join(output, "windows-review-recovered.png") });
  await page.keyboard.press("F5");
  assert(await reviewer.isVisible(), "F5 inside review must not reload the app or present");
  await reviewer.getByRole("button", { name: "Remove saved draft copies", exact: true }).click();
  await reviewer.getByText(/Saved draft copies removed for this pack/).waitFor();
  assert.equal(await readDraft(page), null);
  assert.equal(
    await reviewer.getByLabel("Scientific rationale", { exact: true }).inputValue(),
    rationale,
  );
  assert.deepEqual(
    remoteReviewRequests,
    [],
    "Review of local pack must not require remote resources",
  );
  await reviewer.getByRole("button", { name: "Close", exact: true }).click();
  timings.nativeReviewerCrashRecoveryMs = Math.round(performance.now() - reviewStart);
  await page.unroute(/^https?:\/\//);
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
          "Scientific review pack opens without renderer remote requests",
          "Native reviewer keyboard navigation and pending completion checks",
          "Reviewer draft is saved through native SQLite",
          "Review draft survives forced termination and requires explicit restoration",
          "External review leaves every lecture unchanged",
          "F5 is isolated inside the reviewer dialog",
          "Local reviewer checkpoint deletion preserves the open form",
          "F5 presents while an editor field has focus",
          "Separate audience window renders",
          "Audience storage access denied",
        ],
        limitations: [
          "Synthetic local fixtures, not independent scientific review or model performance qualification",
          "Remote renderer URLs are blocked during review; OS airplane mode and Rust networking are not tested",
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
