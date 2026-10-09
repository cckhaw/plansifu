import Firecrawl from "@mendable/firecrawl-js";
import type { Country, Currency, PlanCategory, ScrapedPlan } from "../../src/types/database";
import type { RawPlan, ScrapeTarget } from "./types";

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
const BROADBAND_WORDS = /\b(broadband|fib(?:re|er)|gbps|router|wi-?fi|home)\b/i;
/** Marketing copy / calls to action picked up as a "title". */
const MARKETING_TITLE = /^(buy|get|sign ?up|order|apply|learn|shop|rollover|free|join|switch)\b|\b(for just|free \d+ months?|buy online)\b|[$]\s?\d/i;

export function isPlausibleTitle(title: string, category: PlanCategory): boolean {
  if (title.length < 3 || title.length > 70) return false;
  if (NOT_A_PLAN.test(title) || MARKETING_TITLE.test(title)) return false;
  if (category !== "broadband" && BROADBAND_WORDS.test(title)) return false;
  return true;
}

/** Normalise raw extractor output into rows safe to upsert. Drops invalid entries, dedupes by title. */
export function normalizePlans(
  raw: RawPlan[],
  opts: { country: Country; category: PlanCategory; fallbackUrl: string; mixed?: boolean },
): ScrapedPlan[] {
  const seen = new Map<string, ScrapedPlan>();
  for (const r of raw) {
    const title = r.title?.trim().replace(/\s+/g, " ");
    const price = num(r.monthly_price);
    if (!title || price === null || price <= 0 || price > 2000) continue;
    const category =
      opts.mixed && (CATEGORIES as readonly string[]).includes(r.category ?? "") ? (r.category as PlanCategory) : opts.category;
    if (!isPlausibleTitle(title, category)) continue;
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

const isRateLimit = (err: unknown) => /rate limit|429/i.test(err instanceof Error ? err.message : String(err));

async function viaFirecrawl(url: string): Promise<RawPlan[]> {
  for (let attempt = 0; ; attempt++) {
    await firecrawlSlot();
    try {
      return await firecrawlOnce(url);
    } catch (err) {
      if (!isRateLimit(err) || attempt >= 3) throw err;
      const wait = Number(String(err).match(/retry after (\d+)s/i)?.[1] ?? 15);
      console.warn(`[extract] rate limited on ${url}; waiting ${wait + 2}s (attempt ${attempt + 1})`);
      nextSlot = Math.max(nextSlot, Date.now() + (wait + 2) * 1000);
    }
  }
}

async function firecrawlOnce(url: string): Promise<RawPlan[]> {
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
    waitFor: 2000,
  });
  const json = doc.json as { plans?: RawPlan[] } | undefined;
  return json?.plans ?? [];
}

/** Heuristic text parser used when Firecrawl is unavailable or returns nothing. */
export function parsePlansFromText(text: string): RawPlan[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const priceRe = /(?:RM|S\$|SGD|\$)\s?(\d{1,4}(?:\.\d{1,2})?)/i;
  const out: RawPlan[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(priceRe);
    if (!m) continue;
    // Specs usually sit between this price and the next one.
    let end = i + 1;
    while (end < lines.length && end < i + 8 && !priceRe.test(lines[end])) end++;
    const window = lines.slice(Math.max(0, i - 1), end).join(" ");
    const title = [...lines.slice(Math.max(0, i - 3), i + 1)].reverse().find((l) => !priceRe.test(l) && l.length > 3 && l.length < 60);
    if (!title) continue;
    const gb = window.match(/(\d{1,4})\s?GB\b/i);
    const gbps = window.match(/(\d(?:\.\d)?)\s?Gbps/i);
    const mbps = window.match(/(\d{2,4})\s?Mbps/i);
    out.push({
      title,
      monthly_price: Number(m[1]),
      data_gb: /unlimited data/i.test(window) ? -1 : gb ? Number(gb[1]) : null,
      speed_mbps: gbps ? Number(gbps[1]) * 1000 : mbps ? Number(mbps[1]) : null,
    });
  }
  return out;
}

async function viaPlaywright(url: string): Promise<RawPlan[]> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForTimeout(3000);
    const text = await page.evaluate(() => document.body.innerText);
    return parsePlansFromText(text);
  } finally {
    await browser.close();
  }
}

/** Scrape one page: Firecrawl first, Playwright heuristic fallback. */
export async function scrapeTarget(target: ScrapeTarget, country: Country): Promise<ScrapedPlan[]> {
  const opts = { country, category: target.category, fallbackUrl: target.url, mixed: target.mixed };
  try {
    const plans = normalizePlans(await viaFirecrawl(target.url), opts);
    console.log(`[extract] firecrawl ${plans.length} plans  ${target.url}`);
    if (plans.length) return plans;
    console.warn(`[extract] Firecrawl returned no plans for ${target.url}; trying Playwright`);
  } catch (err) {
    console.warn(`[extract] Firecrawl failed for ${target.url}: ${(err as Error).message}; trying Playwright`);
  }
  const fallback = normalizePlans(await viaPlaywright(target.url), opts);
  console.log(`[extract] playwright ${fallback.length} plans  ${target.url}`);
  return fallback;
}

export async function scrapeTargets(targets: ScrapeTarget[], country: Country): Promise<ScrapedPlan[]> {
  const results: ScrapedPlan[] = [];
  const errors: string[] = [];
  for (const t of targets) {
    try {
      results.push(...(await scrapeTarget(t, country)));
    } catch (err) {
      errors.push(`${t.url}: ${(err as Error).message}`);
      console.warn(`[extract] failed ${t.url}: ${(err as Error).message}`);
    }
  }
  // The same plan can appear on several pages of one site; keep the first.
  const unique = new Map<string, ScrapedPlan>();
  for (const p of results) if (!unique.has(p.title.toLowerCase())) unique.set(p.title.toLowerCase(), p);
  results.length = 0;
  results.push(...unique.values());
  // Only fail the provider if every target failed; partial results are still useful.
  if (!results.length && errors.length) throw new Error(errors.join(" | "));
  return results;
}
