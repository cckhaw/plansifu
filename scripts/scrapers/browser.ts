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

export type TextMode = "nodes" | "inner";

/**
 * Render a page with a realistic browser profile and return its text, newlines preserved.
 * - "nodes" (default): every text node in the DOM. Catches plan cards that `innerText` skips
 *   (off-screen or inactive panels) - this took TuneTalk from 2 visible prices to 111.
 * - "inner": what a user sees, with layout-aware lines (StarHub/Zym parsers rely on this).
 * Also waits for client-side apps to render, scrolls to trigger lazy loading, and clicks tabs.
 */
export async function renderPageText(url: string, minChars = 800, mode: TextMode = "nodes"): Promise<string> {
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

    const read = () =>
      page
        .evaluate((m) => {
          if (m === "inner") return document.body.innerText;
          const out: string[] = [];
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            const el = n.parentElement;
            if (!el || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName)) continue;
            const t = (n.textContent || "").replace(/\s+/g, " ").trim();
            if (t) out.push(t);
          }
          return out.join("\n");
        }, mode)
        .then((t) => t.replace(/\u00a0/g, " "))
        .catch(() => "");

    // Lazy-loaded plan cards appear as they scroll into view.
    await page
      .evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight && y < 30_000; y += 700) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 250));
        }
        window.scrollTo(0, 0);
      })
      .catch(() => undefined);
    await page.waitForTimeout(800);

    let text = await read();

    // Tabbed pages may only build the active tab's content: click the other tabs and keep what appears.
    const tabs = page.locator('[role="tab"], [data-bs-toggle="tab"], [data-toggle="tab"], .nav-tabs a, .nav-tabs button');
    const count = Math.min(await tabs.count().catch(() => 0), 10);
    const seen = new Set(text.split("\n"));
    for (let i = 0; i < count; i++) {
      const tab = tabs.nth(i);
      if (!(await tab.isVisible().catch(() => false))) continue;
      const before = page.url().split("#")[0];
      await tab.click({ timeout: 2000 }).catch(() => undefined);
      await page.waitForTimeout(600);
      if (page.url().split("#")[0] !== before) {
        await page.goBack().catch(() => undefined); // it was a link, not a tab
        continue;
      }
      const extra = (await read()).split("\n").filter((l) => l.trim() && !seen.has(l));
      extra.forEach((l) => seen.add(l));
      if (extra.length) text += "\n" + extra.join("\n");
    }
    return text;
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
