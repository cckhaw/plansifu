import Firecrawl from "@mendable/firecrawl-js";
import type { Country, Currency, PlanCategory, ScrapedPlan } from "../../src/types/database";
import { cleanPageText, renderPageText } from "./browser";
import { extractPlansWithLlm } from "./llm-extract";
import type { RawPlan, ScrapeResult, ScrapeTarget } from "./types";

const PLAN_SCHEMA = {
  type: "object",
  properties: {
    plans: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Plan name, e.g. 'Postpaid 5G 89'" },
          category: {
            type: "string",
            enum: ["mobile_postpaid", "mobile_prepaid", "broadband"],
            description:
              "mobile_prepaid ONLY if the page calls it prepaid / tourist SIM / top-up / pay-as-you-go / daily-weekly pass. " +
              "mobile_postpaid = monthly-billed SIM-only or phone plan (the default for monthly SIM-only plans). broadband = home fibre/wireless internet",
          },
          monthly_price: { type: "number", description: "Monthly fee as a number, no currency symbol" },
          data_gb: { type: "number", description: "Data in GB; -1 if unlimited; omit if unknown" },
          speed_mbps: { type: "number", description: "Broadband speed in Mbps (1Gbps = 1000)" },
          talktime_mins: { type: "number", description: "Included call minutes; -1 if unlimited" },
          sms_count: { type: "number" },
          contract_months: { type: "number", description: "0 if no contract" },
          features: { type: "array", items: { type: "string" }, description: "Perks, e.g. Free Router, Disney+" },
          promotion_badge: { type: "string", description: "Headline promotion / rebate / voucher" },
        },
        required: ["title", "monthly_price"],
      },
    },
  },
  required: ["plans"],
};

const CATEGORIES = ["mobile_postpaid", "mobile_prepaid", "broadband"] as const;
const CURRENCY: Record<Country, Currency> = { MY: "MYR", SG: "SGD" };

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
const GENERIC_TITLE = /^(esim|sim)$|\bplans$/i;

export function isPlausibleTitle(title: string, category: PlanCategory): boolean {
  if (title.length < 3 || title.length > 70) return false;
  if (NOT_A_PLAN.test(title) || MARKETING_TITLE.test(title) || GENERIC_TITLE.test(title) || JUNK_TITLE.test(title)) return false;
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
): ScrapedPlan[] {
  const seen = new Map<string, ScrapedPlan>();
  for (const r of raw) {
    // Models sometimes copy the price into the name ("hi! by Singtel $15/30 days Best Value"): strip it.
    const title = r.title
      ?.replace(/(?:RM|S\$|\$)\s?\d[\d.,]*(?:\s?\/\s?\w+(?: \w+)?)?/gi, " ")
      .replace(/\s+/g, " ")
      .replace(/^[\s\-–:|,]+|[\s\-–:|,]+$/g, "");
    const price = num(r.monthly_price);
    if (!title || price === null || price <= 0 || price > 2000) continue;
    const category =
      opts.mixed && (CATEGORIES as readonly string[]).includes(r.category ?? "") ? (r.category as PlanCategory) : opts.category;
    if (!isPlausibleTitle(title, category)) {
      if (process.env.SCRAPE_DEBUG) console.log(`[debug] dropped by title filter (${category}): "${title}"`);
      continue;
    }
    // Real consumer plans: nothing under ~2 (call/SMS rates, add-on lines); mobile plans above ~600 are phones.
    if (price < 2 || (category !== "broadband" && price > 600 && !/year|12 ?months?/i.test(title))) {
      if (process.env.SCRAPE_DEBUG) console.log(`[debug] dropped by price filter: "${title}" ${price}`);
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
      features: Array.isArray(r.features) ? r.features.filter(Boolean).map((f) => f.trim()).slice(0, 8) : [],
      affiliate_url: r.affiliate_url || opts.fallbackUrl,
      promotion_badge: r.promotion_badge?.trim() || null,
    });
  }
  return [...seen.values()];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Firecrawl's plan allows ~10 req/min; space request starts out across all providers. */
const FIRECRAWL_GAP_MS = Number(process.env.FIRECRAWL_GAP_MS ?? 6500);
let nextSlot = 0;
async function firecrawlSlot(): Promise<void> {
  const now = Date.now();
  const start = Math.max(now, nextSlot);
  nextSlot = start + FIRECRAWL_GAP_MS;
  if (start > now) await sleep(start - now);
}

/** Once Firecrawl reports no credits, stop calling it for the rest of the run. */
let outOfCredits = false;
const isOutOfCredits = (err: unknown) => /insufficient credits|payment required|\b402\b/i.test(err instanceof Error ? err.message : String(err));

const isRateLimit = (err: unknown) => /rate limit|429/i.test(err instanceof Error ? err.message : String(err));

async function viaFirecrawl(url: string): Promise<RawPlan[]> {
  for (let attempt = 0; ; attempt++) {
    await firecrawlSlot();
    try {
      return await firecrawlOnce(url);
    } catch (err) {
      if (isOutOfCredits(err)) {
        outOfCredits = true;
        throw new Error("Firecrawl credits exhausted - top up your plan at firecrawl.dev");
      }
      if (!isRateLimit(err) || attempt >= 3) throw err;
      const wait = Number(String(err).match(/retry after (\d+)s/i)?.[1] ?? 15);
      console.warn(`[extract] rate limited on ${url}; waiting ${wait + 2}s (attempt ${attempt + 1})`);
      nextSlot = Math.max(nextSlot, Date.now() + (wait + 2) * 1000);
    }
  }
}

async function firecrawlOnce(url: string): Promise<RawPlan[]> {
  if (outOfCredits) throw new Error("Firecrawl credits exhausted - top up your plan at firecrawl.dev");
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY not set");
  const app = new Firecrawl({ apiKey });
  const doc = await app.scrape(url, {
    formats: [
      {
        type: "json",
        schema: PLAN_SCHEMA,
        prompt:
          "Extract every consumer mobile (postpaid, prepaid, SIM-only, eSIM) or home broadband plan listed on this page. " +
          "monthly_price is the recurring price per month, or the pack price for prepaid packs. " +
          "Skip: business/enterprise plans, devices, smartwatch / wearable / tablet / device bundles, add-ons, roaming-only passes, " +
          "and any plan shown only inside a comparison table against OTHER telcos (competitors). " +
          "Set category for each plan.",
      },
    ],
    waitFor: 4000,
  });
  const json = doc.json as { plans?: RawPlan[] } | undefined;
  const plans = json?.plans ?? [];
  if (process.env.SCRAPE_DEBUG) {
    console.log(`[debug] ${url} -> ${plans.length} raw: ` + plans.slice(0, 12).map((p) => `${p.title} (${p.monthly_price})`).join("; "));
  }
  return plans;
}

/**
 * Default engine: render the page in our own headless browser (free) and have Claude Haiku turn
 * the visible text into structured plans. `SCRAPE_ENGINE=firecrawl` selects the Firecrawl engine.
 */
async function viaBrowserAndLlm(target: ScrapeTarget, country: Country, provider: string): Promise<RawPlan[]> {
  let text = "";
  for (let attempt = 0; attempt < 2 && text.length < 300; attempt++) {
    text = cleanPageText(await renderPageText(target.url));
  }
  // Blocked, empty or still-loading pages must fail loudly instead of "succeeding" with nothing.
  if (text.length < 300) throw new Error(`page rendered only ${text.length} characters (blocked or not loaded)`);
  const raw = await extractPlansWithLlm({ provider, country, url: target.url, category: target.category, pageText: text, hint: target.hint });
  if (process.env.SCRAPE_DEBUG && raw.length === 0) {
    console.log(`[debug] 0 plans from ${text.length} chars at ${target.url}; text starts: ${text.slice(0, 700).replace(/\n/g, " | ")}`);
  }
  return raw;
}

/**
 * Scrape one page. There is deliberately no fallback to a generic text parser: it produced junk
 * rows (page furniture, call rates) that replaced good data. A failed page throws, and the
 * provider keeps its existing plans.
 */
export async function scrapeTarget(target: ScrapeTarget, country: Country, provider = "the provider"): Promise<ScrapedPlan[]> {
  const opts = { country, category: target.category, fallbackUrl: target.url, mixed: target.mixed };
  const engine = target.engine === "firecrawl" || process.env.SCRAPE_ENGINE === "firecrawl" ? "firecrawl" : "browser+llm";
  const raw = engine === "firecrawl" ? await viaFirecrawl(target.url) : await viaBrowserAndLlm(target, country, provider);
  const plans = normalizePlans(raw, opts);
  console.log(`[extract] ${engine} ${plans.length}/${raw.length} plans  ${target.url}`);
  return plans;
}

export async function scrapeTargets(targets: ScrapeTarget[], country: Country, provider?: string): Promise<ScrapeResult> {
  const results: ScrapedPlan[] = [];
  const errors: string[] = [];
  for (const t of targets) {
    try {
      results.push(...(await scrapeTarget(t, country, provider)));
    } catch (err) {
      errors.push(`${t.url}: ${(err as Error).message}`);
      console.warn(`[extract] failed ${t.url}: ${(err as Error).message}`);
    }
  }
  // Every page failed: nothing to save (and nothing should be hidden).
  if (!results.length && errors.length) throw new Error(errors.join(" | "));
  // The same plan can appear on several pages of one site; keep the first.
  const unique = new Map<string, ScrapedPlan>();
  for (const p of results) if (!unique.has(p.title.toLowerCase())) unique.set(p.title.toLowerCase(), p);
  return { plans: [...unique.values()], complete: errors.length === 0 };
}
