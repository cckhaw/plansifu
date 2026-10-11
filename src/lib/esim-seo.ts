import type { Faq } from "@/components/seo/JsonLdFaq";
import { COUNTRIES, formatData, formatPrice } from "@/lib/currency";
import type { EsimDestination } from "@/lib/esim-destinations";
import { dedupeRows, isTypicalTrip, type EsimRowView } from "@/lib/esim-rank";
import { faqsFor } from "@/lib/faqs";
import type { Country } from "@/types/database";

/** Short name without the bracket: "Indonesia (Bali)" -> "Indonesia", "Europe (multi-country)" -> "Europe". */
export const shortName = (d: EsimDestination) => d.name.replace(/ \(.*\)/, "");

const money = (n: number, c: Country) => formatPrice(Math.round(n * 100) / 100, COUNTRIES[c].currency);

export interface EsimSummary {
  count: number;
  brands: string[];
  low: number | null;
  high: number | null;
  bestPerGb: EsimRowView | null;
  cheapest: EsimRowView | null;
  cheapestUnlimited: EsimRowView | null;
}

/** Facts from the live plans, in the visitor's currency. Typical-trip plans only for "best per GB" so a 200GB bulk pack cannot win. */
export function summarize(rowsIn: EsimRowView[]): EsimSummary {
  const rows = dedupeRows(rowsIn).filter((r) => r.price !== null);
  const typical = rows.filter(isTypicalTrip);
  const prices = rows.map((r) => r.price!).filter((n) => n > 0);
  const by = (list: EsimRowView[], f: (r: EsimRowView) => number | null) => list.filter((r) => f(r) !== null).sort((a, b) => f(a)! - f(b)!)[0] ?? null;
  return {
    count: rows.length,
    brands: [...new Set(rows.map((r) => r.plan.provider.name))],
    low: prices.length ? Math.min(...prices) : null,
    high: prices.length ? Math.max(...prices) : null,
    bestPerGb: by(typical, (r) => r.perGb),
    cheapest: by(typical.length ? typical : rows, (r) => r.price),
    cheapestUnlimited: by(rows.filter((r) => r.unlimited && (r.plan.validity_days ?? 99) <= 15), (r) => r.price),
  };
}

const describe = (r: EsimRowView, c: Country) => `${r.plan.provider.name}'s ${formatData(r.plan.data_gb)}${r.plan.validity_days ? ` / ${r.plan.validity_days}-day` : ""} plan at ${money(r.price!, c)}`;

/** An intro paragraph that is specific to this destination and always matches the table. */
export function esimIntro(country: Country, d: EsimDestination, s: EsimSummary): string {
  const place = shortName(d);
  if (!s.count) return `We are collecting travel eSIM plans for ${place}. Check back after the next weekly update.`;
  const parts = [`PlanSifu compares ${s.count} travel eSIM plans for ${place} from ${s.brands.length} brands, priced from ${money(s.low!, country)} to ${money(s.high!, country)} (converted to ${COUNTRIES[country].currency}).`];
  if (s.bestPerGb) parts.push(`The lowest cost per GB on a typical trip plan is ${describe(s.bestPerGb, country)}, about ${money(s.bestPerGb.perGb!, country)} per GB.`);
  if (s.cheapestUnlimited) parts.push(`For unlimited data, the cheapest short-trip option is ${describe(s.cheapestUnlimited, country)}.`);
  return parts.join(" ");
}

/** General travel-eSIM FAQs plus destination-specific ones. Rendered visibly and as FAQPage JSON-LD from the same array. */
export function esimFaqs(country: Country, d: EsimDestination, s: EsimSummary): Faq[] {
  const place = shortName(d);
  const out: Faq[] = [];
  if (s.bestPerGb || s.cheapest) {
    out.push({
      q: `What is the cheapest travel eSIM for ${place}?`,
      a: `${s.bestPerGb ? `Right now the lowest cost per GB is ${describe(s.bestPerGb, country)} (about ${money(s.bestPerGb.perGb!, country)} per GB). ` : ""}${s.cheapest ? `The cheapest plan overall for a typical trip is ${describe(s.cheapest, country)}. ` : ""}Prices change, so check the table above, which is updated weekly.`,
    });
  }
  out.push({
    q: `How much data do I need for ${place}?`,
    a: d.type === "country"
      ? "As a rough guide, maps and messaging use around 0.3 to 0.5GB a day, while social media and some video can use 1 to 2GB a day. Multiply by the days of your trip and add a buffer; unlimited plans suit heavy users and tethering."
      : "Multi-country plans work the same way: estimate roughly 0.3 to 0.5GB a day for maps and messaging, and 1 to 2GB a day with social media and video. Check the plan's coverage list for the countries you will visit.",
  });
  if (d.type !== "country") {
    out.push({ q: `Which countries does a ${place} eSIM cover?`, a: "Coverage differs by brand and plan. The 'Plan' column shows how many countries each plan covers when the brand states it; always check the brand's country list for every stop on your trip before you buy." });
  }
  out.push({
    q: `Is a travel eSIM better than roaming in ${place}?`,
    a: "A travel eSIM usually costs less than daily roaming passes and avoids swapping SIM cards, but it depends on your home plan's roaming charges. Compare the price per day here with your telco's roaming pass, and make sure your phone is unlocked and supports eSIM.",
  });
  // The shared travel eSIM questions (phone number, cost per GB, eSIM compatibility, how we rank)
  out.push(...faqsFor(country, "travel-esim"));
  return out;
}
