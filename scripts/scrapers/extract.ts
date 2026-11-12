import type { Country, CrawlPageReport, ScrapedPlan } from "../../src/types/database";
import { cleanPageText, renderPage } from "./browser";
import { normalizePlans } from "./normalize";
import type { ScrapeResult, ScrapeTarget } from "./types";

export { isPlausibleTitle, normalizePlans } from "./normalize";

/** Wording of the bot-check / CAPTCHA / 403 pages sites show to datacenter networks. */
const BOT_WALL =
  /^\s*403 ERROR|Request blocked|Access Denied|made us think that you are a bot|solve this CAPTCHA|verify (?:that )?you are (?:a )?human|Attention Required|Just a moment\.\.\.|unusual traffic/i;

/**
 * Scrape one page: render it in our own headless browser, then hand it to the site-specific parser.
 * No model is involved anywhere, so a crawl costs nothing. A page that fails (blocked, not rendered, or the
 * parser finds nothing because the site changed) is reported with its error and the provider keeps its
 * existing plans.
 */
export async function scrapeTarget(
  target: ScrapeTarget,
  country: Country,
  _provider = "the provider",
): Promise<{ plans: ScrapedPlan[]; page: CrawlPageReport }> {
  const opts = { country, category: target.category, fallbackUrl: target.url, mixed: target.mixed };
  const started = Date.now();
  const page: CrawlPageReport = {
    url: target.url,
    engine: "custom parser",
    raw_count: 0,
    kept_count: 0,
    dropped: [],
    expect_empty: target.expectEmpty || undefined,
  };
  try {
    let rendered = await renderPage(target.url, { minChars: 800, mode: "nodes", relay: target.relay, feeds: true });
    let text = cleanPageText(rendered.text);
    // Blocked or still-loading pages must fail loudly instead of "succeeding" with nothing; one retry for slow loads.
    if (text.length < 300 && !BOT_WALL.test(text)) {
      rendered = await renderPage(target.url, { minChars: 800, mode: "nodes", relay: target.relay, feeds: true });
      text = cleanPageText(rendered.text);
    }
    if (BOT_WALL.test(text.slice(0, 800))) throw new Error("blocked by the site's bot check on the CI network (CAPTCHA or 403 page)");
    if (text.length < 300) throw new Error(`page rendered only ${text.length} characters (blocked or not loaded)`);

    const raw = target.parse({ url: target.url, html: rendered.html, text, feeds: rendered.feeds });
    if (raw.length === 0 && !target.expectEmpty) {
      throw new Error(`parser found no plans in ${text.length} characters of page text (the site's layout may have changed)`);
    }
    const { plans, dropped } = normalizePlans(raw, opts);
    console.log(`[extract] parser ${plans.length}/${raw.length} plans  ${target.url}`);
    return { plans, page: { ...page, text_chars: text.length, raw_count: raw.length, kept_count: plans.length, dropped, ms: Date.now() - started } };
  } catch (err) {
    const message = (err as Error).message;
    console.warn(`[extract] failed ${target.url}: ${message}`);
    return { plans: [], page: { ...page, error: message, ms: Date.now() - started } };
  }
}

export async function scrapeTargets(targets: ScrapeTarget[], country: Country, provider?: string): Promise<ScrapeResult> {
  const results: ScrapedPlan[] = [];
  const pages: CrawlPageReport[] = [];
  for (const t of targets) {
    const r = await scrapeTarget(t, country, provider);
    results.push(...r.plans);
    pages.push(r.page);
  }
  // The same plan can appear on several pages of one site; keep the first.
  const unique = new Map<string, ScrapedPlan>();
  for (const p of results) if (!unique.has(p.title.toLowerCase())) unique.set(p.title.toLowerCase(), p);
  // A failed page makes the scrape incomplete, so missing plans are kept active rather than hidden.
  return { plans: [...unique.values()], complete: pages.every((p) => !p.error), pages };
}
