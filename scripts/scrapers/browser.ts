import type { Browser } from "playwright";

/** One shared headless Chromium per process; each page gets its own isolated context. */
let browserPromise: Promise<Browser> | null = null;

export async function getBrowser(): Promise<Browser> {
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

/** A JSON response the page loaded while rendering that looks like it carries prices. */
export interface DataFeed {
  url: string;
  body: string;
  /** How many price-like values the body contains; used to keep the most relevant feeds. */
  prices: number;
}

export interface RenderOptions {
  /** Wait until the page has at least this many characters of text. */
  minChars?: number;
  mode?: TextMode;
  /** Fetch the HTML through our Vercel relay (sites that block the CI network). */
  relay?: boolean;
  /** Record JSON responses that look like they carry prices (the site's own plan data). */
  feeds?: boolean;
}

export interface RenderResult {
  /** Every text node of the rendered page, one per line (or `innerText` in "inner" mode). */
  text: string;
  /** The rendered DOM (after tabs, "show more" buttons and accordions were opened), for selector-based parsers. */
  html: string;
  /** JSON responses the page loaded that carry prices. */
  feeds: DataFeed[];
}

const PRICE_EVIDENCE = /(?:RM|S?\$)\s?\d|"[A-Za-z_]*(?:price|fee|rental|charge)[A-Za-z_]*"\s*:\s*"?\d/gi;
const NOISE_HOST = /google|doubleclick|facebook|fbcdn|adobe|omtrdc|newrelic|nr-data|hotjar|clarity\.ms|segment|tiktok|snapchat|criteo|taboola|linkedin|twitter|onetrust|cookielaw|tealium|optimizely|sentry|datadog|akamai|cloudflareinsights|youtube/i;
const MAX_FEEDS = 3;
const MAX_FEED_CHARS = 30_000;
/** Buttons that reveal more plans in place. Links are skipped on purpose: they navigate away. */
const SHOW_MORE = /^(load|view|see|show|explore)\s+(more|all)\b|^(more|see all|view all|show all)(\s+plans)?$/i;

const readText = (page: import("playwright").Page, mode: TextMode) =>
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

/**
 * Render a page with a realistic browser profile.
 * - text "nodes" (default): every text node in the DOM. Catches plan cards that `innerText` skips
 *   (off-screen or inactive panels) - this took TuneTalk from 2 visible prices to 111.
 * - text "inner": what a user sees, with layout-aware lines (StarHub/Zym parsers rely on this).
 * Also waits for client-side apps to render, scrolls to trigger lazy loading, clicks tabs, opens
 * accordions and "show more" buttons, records the site's own JSON price feeds, and returns the rendered DOM
 * so parsers can use selectors.
 */
export async function renderPage(url: string, opts: RenderOptions = {}): Promise<RenderResult> {
  const { minChars = 800, mode = "nodes", relay = false } = opts;
  const browser = await getBrowser();
  if (relay) return { ...(await renderViaRelay(browser, url)), feeds: [] };
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    locale: "en-SG",
    viewport: { width: 1366, height: 900 },
  });
  try {
    await context.addInitScript(() => Object.defineProperty(navigator, "webdriver", { get: () => false }));
    const page = await context.newPage();

    const feedReads: Promise<DataFeed | null>[] = [];
    if (opts.feeds) {
      page.on("response", (res) => {
        const type = res.request().resourceType();
        if ((type !== "xhr" && type !== "fetch") || NOISE_HOST.test(res.url()) || !/json/i.test(res.headers()["content-type"] ?? "")) return;
        feedReads.push(
          res
            .text()
            .then((body) => {
              if (body.length < 100 || body.length > 3_000_000) return null;
              const prices = (body.match(PRICE_EVIDENCE) ?? []).length;
              return prices >= 3 ? { url: res.url(), body, prices } : null;
            })
            .catch(() => null),
        );
      });
    }

    await page.goto(url, { waitUntil: "load", timeout: 45_000 }).catch(() => undefined);
    await page.waitForFunction((n) => document.body.innerText.length > n, minChars, { timeout: 30_000 }).catch(() => undefined);
    await page.waitForTimeout(3000);

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

    let text = await readText(page, mode);
    const seen = new Set(text.split("\n"));
    /** Lines that appeared since the last read, labelled so the model knows where they came from. */
    const takeNew = async (label: string) => {
      const extra = (await readText(page, mode)).split("\n").filter((l) => l.trim() && !seen.has(l));
      extra.forEach((l) => seen.add(l));
      if (extra.length) text += `\n[${label}]\n` + extra.join("\n");
      return extra.length;
    };
    const stillHere = (before: string) => page.url().split("#")[0] === before;

    // Tabbed pages may only build the active tab's content: click the other tabs and keep what appears.
    const tabs = page.locator('[role="tab"], [data-bs-toggle="tab"], [data-toggle="tab"], .nav-tabs a, .nav-tabs button');
    const count = Math.min(await tabs.count().catch(() => 0), 10);
    for (let i = 0; i < count; i++) {
      const tab = tabs.nth(i);
      if (!(await tab.isVisible().catch(() => false))) continue;
      const before = page.url().split("#")[0];
      await tab.click({ timeout: 2000 }).catch(() => undefined);
      await page.waitForTimeout(600);
      if (!stillHere(before)) {
        await page.goBack().catch(() => undefined); // it was a link, not a tab
        continue;
      }
      // Label what the tab revealed so the model knows e.g. "SUPPLEMENTARY LINE" plans from "PRINCIPAL LINE" ones.
      const label = ((await tab.innerText({ timeout: 1000 }).catch(() => "")) || "").replace(/\s+/g, " ").trim().slice(0, 60);
      await takeNew(`Content that appears when the tab "${label}" is selected`);
    }

    // "Show more plans" buttons: press them until they stop revealing anything.
    for (let i = 0; i < 6; i++) {
      const more = page.getByRole("button", { name: SHOW_MORE }).first();
      if (!(await more.isVisible().catch(() => false))) break;
      const before = page.url().split("#")[0];
      await more.click({ timeout: 2000 }).catch(() => undefined);
      await page.waitForTimeout(900);
      if (!stillHere(before)) {
        await page.goBack().catch(() => undefined);
        break;
      }
      if (!(await takeNew("More plans revealed by a 'show more' button"))) break;
    }

    // Collapsed accordions often hold plan details or whole plan groups (page furniture is skipped).
    const collapsed = page.locator('button[aria-expanded="false"]:not(header *):not(nav *):not(footer *)');
    const n = Math.min(await collapsed.count().catch(() => 0), 12);
    for (let i = 0; i < n; i++) {
      const btn = collapsed.nth(i);
      if (!(await btn.isVisible().catch(() => false))) continue;
      const before = page.url().split("#")[0];
      await btn.click({ timeout: 1500 }).catch(() => undefined);
      await page.waitForTimeout(250);
      if (!stillHere(before)) await page.goBack().catch(() => undefined);
    }
    if (n) await takeNew("Content revealed by expanding collapsed sections");

    const html = await page.content().catch(() => "");

    const feeds = (await Promise.all(feedReads))
      .filter((f): f is DataFeed => f !== null)
      .sort((a, b) => b.prices - a.prices)
      .slice(0, MAX_FEEDS)
      .map((f) => ({ ...f, body: f.body.slice(0, MAX_FEED_CHARS) }));
    return { text, html, feeds };
  } finally {
    await context.close().catch(() => undefined);
  }
}

/** Page text only; what the StarHub and Zym parsers and the Travel eSIM crawler use. */
export async function renderPageText(url: string, minChars = 800, mode: TextMode = "nodes", relay = false): Promise<string> {
  return (await renderPage(url, { minChars, mode, relay })).text;
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

const RELAY_PATH = "/api/fetch-page";

/**
 * For sites that block the CI network (CloudFront 403 on GitHub's IPs): the site's own Vercel deployment
 * fetches the HTML (src/app/api/fetch-page, authenticated with the Supabase service-role key), and we read the
 * text from that server-rendered HTML in a script-free browser context.
 */
async function renderViaRelay(browser: Browser, url: string): Promise<{ text: string; html: string }> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("relay needs SUPABASE_SERVICE_ROLE_KEY");
  const base = (process.env.SITE_URL || "https://plansifu.vercel.app").replace(/\/$/, "");
  const res = await fetch(`${base}${RELAY_PATH}?url=${encodeURIComponent(url)}`, {
    headers: { authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(60_000),
  });
  const html = await res.text();
  if (!res.ok) throw new Error(`relay ${res.status}: ${html.slice(0, 120)}`);
  return pageFromHtml(browser, html);
}

/**
 * What a relayed page looks like to a parser: the server-rendered HTML as given (no scripts run), plus its text nodes.
 * Also used by the capture tool to reproduce a relayed page locally.
 */
export async function pageFromHtml(browser: Browser, html: string): Promise<{ text: string; html: string }> {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    const text = await page
      .evaluate(() => {
        const out: string[] = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const el = n.parentElement;
          if (!el || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName)) continue;
          const t = (n.textContent || "").replace(/\s+/g, " ").trim();
          if (t) out.push(t);
        }
        return out.join("\n");
      })
      .then((t) => t.replace(/\u00a0/g, " "));
    return { text, html };
  } finally {
    await context.close().catch(() => undefined);
  }
}
