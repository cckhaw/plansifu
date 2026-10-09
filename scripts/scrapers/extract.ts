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

const CURRENCY: Record<Country, Currency> = { MY: "MYR", SG: "SGD" };

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Normalise raw extractor output into rows safe to upsert. Drops invalid entries, dedupes by title. */
export function normalizePlans(
  raw: RawPlan[],
  opts: { country: Country; category: PlanCategory; fallbackUrl: string },
): ScrapedPlan[] {
  const seen = new Map<string, ScrapedPlan>();
  for (const r of raw) {
    const title = r.title?.trim().replace(/\s+/g, " ");
    const price = num(r.monthly_price);
    if (!title || price === null || price <= 0 || price > 2000) continue;
    seen.set(title.toLowerCase(), {
      title,
      category: opts.category,
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

async function viaFirecrawl(url: string): Promise<RawPlan[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY not set");
  const app = new Firecrawl({ apiKey });
  const doc = await app.scrape(url, {
    formats: [
      {
        type: "json",
        schema: PLAN_SCHEMA,
        prompt: "Extract every consumer mobile or home broadband plan listed on this page with its monthly price and specs.",
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
    await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
    const text = await page.evaluate(() => document.body.innerText);
    return parsePlansFromText(text);
  } finally {
    await browser.close();
  }
}

/** Scrape one page: Firecrawl first, Playwright heuristic fallback. */
export async function scrapeTarget(target: ScrapeTarget, country: Country): Promise<ScrapedPlan[]> {
  const opts = { country, category: target.category, fallbackUrl: target.url };
  try {
    const plans = normalizePlans(await viaFirecrawl(target.url), opts);
    if (plans.length) return plans;
    console.warn(`[extract] Firecrawl returned no plans for ${target.url}; trying Playwright`);
  } catch (err) {
    console.warn(`[extract] Firecrawl failed for ${target.url}: ${(err as Error).message}; trying Playwright`);
  }
  return normalizePlans(await viaPlaywright(target.url), opts);
}

export async function scrapeTargets(targets: ScrapeTarget[], country: Country): Promise<ScrapedPlan[]> {
  const results: ScrapedPlan[] = [];
  const errors: string[] = [];
  for (const t of targets) {
    try {
      results.push(...(await scrapeTarget(t, country)));
    } catch (err) {
      errors.push(`${t.url}: ${(err as Error).message}`);
    }
  }
  // Only fail the provider if every target failed; partial results are still useful.
  if (!results.length && errors.length) throw new Error(errors.join(" | "));
  return results;
}
