import type { Country, CrawlEngine, CrawlPageReport, Currency, PlanCategory, ScrapedPlan } from "../../src/types/database";
import { cleanPageText, renderPage } from "./browser";
import { extractPlansFromScreenshots, extractPlansWithLlm } from "./llm-extract";
import type { RawPlan, ScrapeResult, ScrapeTarget } from "./types";

const CATEGORIES = ["mobile_postpaid", "mobile_prepaid", "broadband"] as const;
const CURRENCY: Record<Country, Currency> = { MY: "MYR", SG: "SGD" };
const CURRENCY_SYMBOL: Record<Country, string> = { MY: "RM", SG: "S$" };

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Devices / wearables sold alongside a line - not plans. */
const NOT_A_PLAN = /\b(watch|ipad|tablet|smartphone|iphone|galaxy (?:s|z|a)\d)/i;
/** Broadband items that show up on mobile pages (cross-sell banners, bundles). */
const BROADBAND_WORDS = /\b(broadband|fib(?:re|er)|router|wi-?fi|home)\b|gbps/i;
/** Marketing copy / calls to action picked up as a "title". */
const MARKETING_TITLE = /^(buy|get|sign ?up|order|apply|learn|shop|rollover|free|join|switch)\b|\b(for just|free \d+ months?|buy online)\b|[$]\s?\d/i;

/** Page furniture and call/SMS rate rows that get parsed as plans. */
const JUNK_TITLE =
  /\?$|\b(add-?ons?|eligible|my account|promotions? valid|limited time offer|online exclusive|main difference|call rates?|streaming app|roam the world|power up)\b|^(sms|voice|to all)\b|\bvalue of$/i;

/** Section headings rather than a specific plan, e.g. "Postpaid Plans", "SIM Only Plans", "eSIM". */
/** Products that only exist as an extra line on someone else's account are not standalone plans. */
const SUPPLEMENTARY_TITLE = /\b(supplementary|additional line|extra line|second line|sub-?line|dependent line)\b/i;

const GENERIC_TITLE = /^(esim|sim)$|\bplans$/i;

export function isPlausibleTitle(title: string, category: PlanCategory): boolean {
  if (title.length < 3 || title.length > 70) return false;
  if (NOT_A_PLAN.test(title) || MARKETING_TITLE.test(title) || GENERIC_TITLE.test(title) || JUNK_TITLE.test(title) || SUPPLEMENTARY_TITLE.test(title)) return false;
  if (category !== "broadband" && BROADBAND_WORDS.test(title)) return false;
  // Upsell tiles for the other billing type (e.g. a postpaid plan advertised on a prepaid page).
  if (category === "mobile_prepaid" && /\bpostpaid\b/i.test(title)) return false;
  if (category === "mobile_postpaid" && (/\bprepaid\b/i.test(title) || /^hi!/i.test(title))) return false;
  return true;
}

/** Normalise raw extractor output into rows safe to upsert. Drops invalid entries, dedupes by title. */
export function normalizePlans(
  raw: RawPlan[],
  opts: { country: Country; category: PlanCategory; fallbackUrl: string; mixed?: boolean },
): { plans: ScrapedPlan[]; dropped: { title: string; reason: string }[] } {
  const seen = new Map<string, ScrapedPlan>();
  const dropped: { title: string; reason: string }[] = [];
  for (const r of raw) {
    // Models sometimes copy the price into the name ("hi! by Singtel $15/30 days Best Value"): strip it.
    const title = r.title
      ?.replace(/(?:RM|S\$|\$)\s?\d[\d.,]*(?:\s?\/\s?\w+(?: \w+)?)?/gi, " ")
      .replace(/\s+/g, " ")
      .replace(/^[\s\-–:|,]+|[\s\-–:|,]+$/g, "");
    const price = num(r.monthly_price);
    if (!title || price === null || price <= 0 || price > 2000) {
      dropped.push({ title: title || "(no title)", reason: price === null ? "no price" : `price out of range (${price})` });
      continue;
    }
    const category =
      opts.mixed && (CATEGORIES as readonly string[]).includes(r.category ?? "") ? (r.category as PlanCategory) : opts.category;
    if (!isPlausibleTitle(title, category)) {
      dropped.push({ title, reason: "title filter" });
      if (process.env.SCRAPE_DEBUG) console.log(`[debug] dropped by title filter (${category}): "${title}"`);
      continue;
    }
    // Real consumer plans: nothing under ~2 (call/SMS rates, add-on lines); mobile plans above ~600 are phones.
    if (price < 2 || (category !== "broadband" && price > 600 && !/year|12 ?months?/i.test(title))) {
      dropped.push({ title, reason: `price filter (${price})` });
      if (process.env.SCRAPE_DEBUG) console.log(`[debug] dropped by price filter: "${title}" ${price}`);
      continue;
    }
    // First occurrence wins: pages list the regular/principal version before promo or variant copies.
    if (seen.has(title.toLowerCase())) {
      dropped.push({ title, reason: "duplicate title" });
      continue;
    }
    seen.set(title.toLowerCase(), {
      title,
      category,
      monthly_price: Math.round(price * 100) / 100,
      currency: CURRENCY[opts.country],
      data_gb: num(r.data_gb),
      speed_mbps: num(r.speed_mbps) === null ? null : Math.round(num(r.speed_mbps)!),
      talktime_mins: num(r.talktime_mins) === null ? null : Math.round(num(r.talktime_mins)!),
      sms_count: num(r.sms_count) === null ? null : Math.round(num(r.sms_count)!),
      contract_months: Math.max(0, Math.round(num(r.contract_months) ?? 0)),
      features: [
        ...(Array.isArray(r.features) ? r.features.filter(Boolean).map((f) => f.trim()).slice(0, 8) : []),
        ...(num(r.supplementary_line_price) ? [`Extra line ${CURRENCY_SYMBOL[opts.country]}${num(r.supplementary_line_price)}/mth`] : []),
      ],
      affiliate_url: r.affiliate_url || opts.fallbackUrl,
      promotion_badge: r.promotion_badge?.trim() || null,
    });
  }
  return { plans: [...seen.values()], dropped };
}

/** Wording of the bot-check / CAPTCHA / 403 pages sites show to datacenter networks. */
const BOT_WALL =
  /^\s*403 ERROR|Request blocked|Access Denied|made us think that you are a bot|solve this CAPTCHA|verify (?:that )?you are (?:a )?human|Attention Required|Just a moment\.\.\.|unusual traffic/i;

/** Why a page's primary text read can't be trusted, so the screenshot fallback should be tried. */
class TextReadError extends Error {
  constructor(message: string, readonly blocked = false) {
    super(message);
  }
}

/**
 * Primary method: render the page in our own headless browser (free) and have Claude Haiku turn the
 * visible text, plus any JSON price feeds the page loaded, into structured plans.
 */
async function viaBrowserAndLlm(
  target: ScrapeTarget,
  country: Country,
  provider: string,
): Promise<{ raw: RawPlan[]; textChars: number; notes: string[] }> {
  let text = "";
  let feeds: { url: string; body: string }[] = [];
  for (let attempt = 0; attempt < 2 && text.length < 300; attempt++) {
    const r = await renderPage(target.url, { minChars: 800, mode: "nodes", relay: target.relay, feeds: true });
    text = cleanPageText(r.text);
    feeds = r.feeds;
  }
  // Blocked, empty or still-loading pages must fail loudly instead of "succeeding" with nothing.
  if (BOT_WALL.test(text.slice(0, 800))) {
    throw new TextReadError("blocked by the site's bot check on the CI network (CAPTCHA or 403 page)", true);
  }
  if (text.length < 300) throw new TextReadError(`page rendered only ${text.length} characters (blocked or not loaded)`);
  const { plans, notes } = await extractPlansWithLlm({ provider, country, url: target.url, category: target.category, pageText: text, hint: target.hint, feeds });
  if (feeds.length) notes.push(`Read ${feeds.length} data feed${feeds.length === 1 ? "" : "s"} the page loaded`);
  if (process.env.SCRAPE_DEBUG && plans.length === 0) {
    console.log(`[debug] 0 plans from ${text.length} chars at ${target.url}; text starts: ${text.slice(0, 700).replace(/\n/g, " | ")}`);
  }
  return { raw: plans, textChars: text.length, notes };
}

/** Fallback: screenshot the page and let the model read the plans off the images. Not available through the relay. */
async function viaScreenshots(target: ScrapeTarget, country: Country, provider: string): Promise<{ raw: RawPlan[]; textChars: number }> {
  if (target.relay) throw new Error("screenshots are not available for relayed pages");
  const r = await renderPage(target.url, { minChars: 300, mode: "nodes", shots: true });
  if (!r.shots.length) throw new Error("could not take screenshots");
  const text = cleanPageText(r.text);
  const raw = await extractPlansFromScreenshots({ provider, country, url: target.url, category: target.category, hint: target.hint, shots: r.shots, pageText: text });
  return { raw, textChars: text.length };
}

/**
 * Scrape one page. Playwright + Haiku on the page text (and the site's own JSON feeds) comes first; when that
 * errors or finds nothing on a page that should have plans, the page is screenshotted and read by the model
 * as an image. There is deliberately no fallback to a generic text parser: it produced junk rows (page
 * furniture, call rates) that replaced good data. A failed page is reported with its error, and the provider
 * keeps its existing plans.
 */
export async function scrapeTarget(
  target: ScrapeTarget,
  country: Country,
  provider = "the provider",
): Promise<{ plans: ScrapedPlan[]; page: CrawlPageReport }> {
  const opts = { country, category: target.category, fallbackUrl: target.url, mixed: target.mixed };
  const started = Date.now();
  const page: CrawlPageReport = {
    url: target.url,
    engine: "browser+llm",
    raw_count: 0,
    kept_count: 0,
    dropped: [],
    expect_empty: target.expectEmpty || undefined,
  };
  const problems: string[] = [];
  let best: { engine: CrawlEngine; raw: RawPlan[]; textChars?: number; notes: string[] } | undefined;

  let tryVision = true;
  try {
    const r = await viaBrowserAndLlm(target, country, provider);
    if (r.raw.length > 0 || target.expectEmpty) best = { engine: "browser+llm", raw: r.raw, textChars: r.textChars, notes: r.notes };
    else problems.push("Playwright + Haiku found no plans");
  } catch (err) {
    problems.push(`Playwright + Haiku: ${(err as Error).message}`);
    // A bot-block page looks the same in a screenshot, so don't spend a model call on it.
    if (err instanceof TextReadError && err.blocked) tryVision = false;
  }

  if (!best && tryVision && !target.relay) {
    try {
      const r = await viaScreenshots(target, country, provider);
      if (r.raw.length > 0) best = { engine: "browser+vision", raw: r.raw, textChars: r.textChars, notes: [] };
      else problems.push("Screenshot read found no plans");
    } catch (err) {
      problems.push(`Screenshot read: ${(err as Error).message}`);
    }
  }

  if (!best) {
    const message = problems.join(" | ") || "no engine available";
    console.warn(`[extract] failed ${target.url}: ${message}`);
    return { plans: [], page: { ...page, error: message, ms: Date.now() - started } };
  }
  const { plans, dropped } = normalizePlans(best.raw, opts);
  const usedFallback = best.engine !== "browser+llm";
  const notes = [...best.notes, ...(usedFallback ? [`Read from screenshots because the text read failed: ${problems.join(" | ")}`] : [])];
  console.log(`[extract] ${best.engine}${usedFallback ? " (fallback)" : ""} ${plans.length}/${best.raw.length} plans  ${target.url}`);
  return {
    plans,
    page: {
      ...page,
      engine: best.engine,
      text_chars: best.textChars,
      raw_count: best.raw.length,
      kept_count: plans.length,
      dropped,
      notes: notes.length ? notes : undefined,
      ms: Date.now() - started,
    },
  };
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
