import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/app-updates.ts", import.meta.url), "utf8");
const js = ts.transpileModule(
  source.replaceAll("import.meta.env", '({BASE_URL:"/JUW-MicroSlides/",VITE_BUILD_ID:"fixture"})'),
  {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  },
).outputText;
const { checkAppBuild, refreshOfflineShell } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
);

test("published build discovery survives invalid, missing and hung service-worker registrations", async () => {
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (_url, options) => {
    calls++;
    assert.equal(options.cache, "no-store");
    return Response.json({ buildId: "new-build" });
  };
  const setWorker = (getRegistration) =>
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { onLine: true, serviceWorker: { getRegistration } },
    });
  try {
    let updates = 0;
    setWorker(async () => ({
      active: {},
      update: async () => {
        updates++;
        throw new DOMException("The object is in an invalid state.", "InvalidStateError");
      },
    }));
    assert.equal(await checkAppBuild(), "new-build");
    assert.equal(updates, 0, "Build discovery never waits for worker maintenance");
    assert.equal(await refreshOfflineShell(), false);
    assert.equal(updates, 1);
    setWorker(async () => ({
      update: async () => {
        throw Error("Must not update an empty registration");
      },
    }));
    assert.equal(await refreshOfflineShell(), false);
    setWorker(async () => ({ installing: {} }));
    assert.equal(await refreshOfflineShell(), true);
    setWorker(async () => undefined);
    assert.equal(await refreshOfflineShell(), true);
    setWorker(() => new Promise(() => {}));
    assert.equal(await checkAppBuild(), "new-build");
    assert.equal(await refreshOfflineShell(5), false, "Hung lookup has a finite deadline");
    assert.equal(calls, 2);
    let activated = false;
    setWorker(async () => ({
      active: {},
      update: async () => {},
      waiting: {
        postMessage: (message) => {
          assert.equal(message, "SKIP_WAITING");
          activated = true;
        },
      },
    }));
    assert.equal(await refreshOfflineShell(), true);
    assert(activated);
    globalThis.fetch = async () => Response.json({ buildId: "invalid / build" });
    await assert.rejects(checkAppBuild, /Invalid build metadata/);
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { onLine: false },
    });
    await assert.rejects(checkAppBuild, /Offline/);
    assert.equal(await refreshOfflineShell(), true);
  } finally {
    globalThis.fetch = originalFetch;
    if (navigatorDescriptor) Object.defineProperty(globalThis, "navigator", navigatorDescriptor);
    else delete globalThis.navigator;
  }
});
