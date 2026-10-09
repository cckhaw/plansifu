import { renderPageText } from "../browser";
import type { ScrapedPlan } from "../../../src/types/database";
import type { ProviderScraper, ScrapeResult } from "../types";

/**
 * Zym's home page shows banners only; each plan's details and price live on its own order page
 * (linked from the "Get SIM" buttons on https://zym.sg/). Each order page has a regular layout:
 * name, allowances, `$ NN.NN` + `/mo`.
 */
const ORDER_PAGES = [
  "https://order.zym.sg/4aa5708d-4fac-45c5-a27f-aad4205d3111",
  "https://order.zym.sg/dc9a835b-29a4-4670-bdda-507df8c04981",
  "https://order.zym.sg/723f9b94-1f9f-4fdd-954d-caaa92dea9c4",
  "https://order.zym.sg/430f6719-a5cf-42ca-a3ac-d9e6fc0f79c2",
  "https://order.zym.sg/12c619d9-3acb-4026-8d63-34deba664bc0",
];

const num = (v: string | undefined) => (v ? Number(v.replace(/,/g, "")) : null);

export function parseZymOrderPage(text: string, url: string): ScrapedPlan | null {
  const lines = text.replace(/\u00a0/g, " ").split("\n").map((l) => l.trim()).filter(Boolean);
  const start = lines.indexOf("Where to get a code?");
  const title = start >= 0 ? lines[start + 1] : undefined;
  const priceIdx = lines.findIndex((l, i) => /^\$\s?\d+(?:\.\d{1,2})?$/.test(l) && /^\/mo/i.test(lines[i + 1] ?? ""));
  if (!title || priceIdx < 0) return null;

  const body = lines.slice(start + 2, priceIdx);
  const joined = body.join("\n");
  const discount = body.find((l) => /discount per month/i.test(l));
  return {
    title,
    category: "mobile_postpaid",
    monthly_price: Number(lines[priceIdx].replace(/[^\d.]/g, "")),
    currency: "SGD",
    data_gb: num(joined.match(/(\d[\d,]*)\s?GB Monthly/i)?.[1]),
    speed_mbps: null,
    talktime_mins: num(joined.match(/([\d,]+)\s+Monthly Mins/i)?.[1]),
    sms_count: num(joined.match(/([\d,]+)\s+Monthly SMS/i)?.[1]),
    contract_months: 0,
    features: body.filter((l) => /^FREE .*roaming/i.test(l)).slice(0, 3),
    affiliate_url: url,
    promotion_badge: discount ? discount.replace(/^Port in from any non-Singtel network and /i, "Port-in: ").slice(0, 120) : null,
  };
}

export const zym: ProviderScraper = {
  name: "Zym",
  country: "SG",
  website: "https://zym.sg",
  async scrape(): Promise<ScrapeResult> {
    const plans: ScrapedPlan[] = [];
    for (const url of ORDER_PAGES) {
      try {
        const plan = parseZymOrderPage(await renderPageText(url, 300), url);
        if (plan) plans.push(plan);
        else console.warn(`[zym] could not parse ${url}`);
      } catch (err) {
        console.warn(`[zym] ${url}: ${(err as Error).message}`);
      }
    }
    if (!plans.length) throw new Error("Zym: no plans extracted");
    return { plans, complete: plans.length === ORDER_PAGES.length };
  },
};
