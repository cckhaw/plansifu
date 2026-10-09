import type { Browser } from "playwright";

/** One shared headless Chromium per process; each page gets its own isolated context. */
let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserPromise) {
    const b = await browserPromise.catch(() => null);
    if (b?.isConnected()) return b;
    browserPromise = null;
  }
  const { chromium } = await import("playwright");
  browserPromise = chromium.launch({
    // Optional override for sandboxes where Playwright's bundled browser version isn't installed.
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  return browserPromise;
}

export async function closeBrowser(): Promise<void> {
  const p = browserPromise;
  browserPromise = null;
  if (p) await (await p.catch(() => null))?.close().catch(() => undefined);
}

/**
 * Render a page with a realistic browser profile and wait for client-side apps (e.g. OutSystems)
 * to fill in the content. Returns the visible text with newlines preserved.
 */
export async function renderPageText(url: string, minChars = 800): Promise<string> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    locale: "en-SG",
    viewport: { width: 1366, height: 900 },
  });
  try {
    await context.addInitScript(() => Object.defineProperty(navigator, "webdriver", { get: () => false }));
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "load", timeout: 45_000 }).catch(() => undefined);
    await page
      .waitForFunction((n) => document.body.innerText.length > n, minChars, { timeout: 30_000 })
      .catch(() => undefined);
    await page.waitForTimeout(3000);
    return (await page.evaluate(() => document.body.innerText)).replace(/ /g, " ");
  } finally {
    await context.close().catch(() => undefined);
  }
}

/** Trim whitespace, drop blank and immediately repeated lines, and cap the size sent to the model. */
export function cleanPageText(text: string, maxChars = 90_000): string {
  const out: string[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (line && line !== out[out.length - 1]) out.push(line);
  }
  return out.join("\n").slice(0, maxChars);
}
