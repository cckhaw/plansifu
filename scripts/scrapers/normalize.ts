import type { Country, Currency, PlanCategory, ScrapedPlan } from "../../src/types/database";
import type { RawPlan } from "./types";

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
