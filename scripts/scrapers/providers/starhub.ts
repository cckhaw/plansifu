import { renderPageText } from "../browser";
import { scrapeTargets } from "../extract";
import type { ScrapedPlan } from "../../../src/types/database";
import type { ProviderScraper, ScrapeResult } from "../types";
import { t } from "./define";

const POSTPAID_URL = "https://consumer.starhub.com/personal/store/mobile-plans";

/**
 * The store page is an OutSystems app that Firecrawl can't reliably render, and its text has a
 * regular layout: `<name>`, `$NN.00`, `/mth`, ..., `Select plan`. Parse that directly.
 */
export function parseStarhubPostpaid(text: string): ScrapedPlan[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const plans: ScrapedPlan[] = [];
  for (let i = 0; i < lines.length - 1; i++) {
    const price = lines[i].match(/^\$(\d+(?:\.\d{1,2})?)$/);
    if (!price || lines[i + 1] !== "/mth") continue;

    let j = i - 1;
    while (j >= 0 && /^(limited time|new|best seller)/i.test(lines[j])) j--;
    const name = lines[j];
    if (!name || name.length > 40) continue;

    // Details (roaming, SG allowance) follow "Select plan", up to the next plan's price.
    let end = i + 2;
    while (end < lines.length && !(/^\$\d+(?:\.\d{1,2})?$/.test(lines[end]) && lines[end + 1] === "/mth")) end++;
    const block = lines.slice(i + 2, end).join("\n");
    const sg = (block.split("When in Singapore")[1] ?? "").split(/\nSecurity\b/)[0];
    const promo = block.match(/(\$\d+(?:\.\d+)?)\/mth with code (\w+)/);

    const unlimitedData = /unlimited data/i.test(sg);
    const dataGb = unlimitedData ? -1 : Number(sg.match(/(\d+)\s?GB data/i)?.[1] ?? NaN);
    const mins = Number(sg.match(/([\d,]+)\s?mins/i)?.[1]?.replace(/,/g, "") ?? NaN);
    const sms = Number(sg.match(/([\d,]+)\s?SMS/i)?.[1]?.replace(/,/g, "") ?? NaN);
    const unlimitedCalls = /unlimited (?:data, )?calls/i.test(sg);

    plans.push({
      title: name === "Lite" ? "Unlimited+ Lite" : name,
      category: "mobile_postpaid",
      monthly_price: Number(price[1]),
      currency: "SGD",
      data_gb: Number.isFinite(dataGb) ? dataGb : null,
      speed_mbps: null,
      talktime_mins: unlimitedCalls ? -1 : Number.isFinite(mins) ? mins : null,
      sms_count: unlimitedCalls ? -1 : Number.isFinite(sms) ? sms : null,
      contract_months: 0,
      features: [...block.matchAll(/^(\d+GB (?:global|SEA|APAC) data)$/gim)].map((m) => `${m[1]} roaming`).slice(0, 4),
      affiliate_url: POSTPAID_URL,
      promotion_badge: promo ? `${promo[1]}/mth with code ${promo[2]}` : null,
    });
  }
  return plans;
}

export const starhub: ProviderScraper = {
  name: "StarHub",
  country: "SG",
  website: "https://www.starhub.com",
  async scrape(): Promise<ScrapeResult> {
    const [postpaid, rest] = await Promise.allSettled([
      renderPageText(POSTPAID_URL).then(parseStarhubPostpaid),
      scrapeTargets(
        [
          t.pre("https://www.starhub.com/personal/mobile/starhub-prepaid.html"),
          t.bb("https://www.starhub.com/personal/broadband.html"),
        ],
        "SG",
        "StarHub",
      ),
    ]);
    const plans = [
      ...(postpaid.status === "fulfilled" ? postpaid.value : []),
      ...(rest.status === "fulfilled" ? rest.value.plans : []),
    ];
    const complete =
      postpaid.status === "fulfilled" && postpaid.value.length > 0 && rest.status === "fulfilled" && rest.value.complete;
    if (postpaid.status === "rejected") console.warn(`[starhub] postpaid page failed: ${postpaid.reason}`);
    if (rest.status === "rejected") console.warn(`[starhub] prepaid/broadband failed: ${rest.reason}`);
    if (postpaid.status === "fulfilled" && postpaid.value.length === 0) console.warn("[starhub] postpaid page parsed 0 plans");
    if (!plans.length) throw new Error("StarHub: no plans extracted");
    return { plans, complete };
  },
};
