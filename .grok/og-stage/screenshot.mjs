import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const html = resolve("/workspace/.grok/og-stage/card.html");
const out = resolve("/workspace/.grok/og-stage/card-raw.png");
const shell =
  "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";

const browser = await chromium.launch({
  executablePath: shell,
  args: ["--no-sandbox", "--disable-gpu", "--allow-file-access-from-files"],
});
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 2,
});
await page.goto(pathToFileURL(html).href, { waitUntil: "networkidle", timeout: 30000 });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(async () => {
  const imgs = [...document.images];
  await Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalWidth
        ? null
        : new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          }),
    ),
  );
});
await page.waitForTimeout(250);
await page.screenshot({ path: out, type: "png", omitBackground: false });
await browser.close();
console.log("wrote", out);
