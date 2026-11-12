import { clean, dataGb, dom } from "../../scrapers/parse-utils";
import { esimPlan, type EsimParser, type RawEsimPlan } from "../types";

const CURRENCIES: [RegExp, string][] = [
  [/^£|^GBP/i, "GBP"],
  [/^€|^EUR/i, "EUR"],
  [/^US\$|^USD|^\$/i, "USD"],
];

/**
 * easySim destination pages are server-rendered HTML (Alpine.js, no JSON feed). Every bundle is a card whose
 * `h3` reads "1<span>GB</span> - 7 <span>days</span>" (or "Unlimited - 7 days"), followed by the bundle's region/country
 * name, a button ("36 Countries" for multi-country bundles, "2 Networks" for single-country ones), the price
 * ("£3.49") and a `/checkout?bundle=<id>` Buy Now link. Country pages show a "Country" and a "Region" tab
 * (e.g. Thailand + Asia 13 countries): both are in the DOM and both are returned, the region ones with their coverage.
 * Prices use the currency chosen in the site's selector (GBP, EUR or USD; GBP when captured from CI/this sandbox).
 * A destination without a page renders a "Oops, the page you we're looking for doesn't exist" page: no cards, no plans.
 */
export const easysim: EsimParser = (page, destination) => {
  const $ = dom(page);
  const out: RawEsimPlan[] = [];
  const text = clean(page.text);
  const fair = text.match(/up to (\d+(?:\.\d+)?)\s?GB of high-speed data every 24 hours/i);
  const dailyNote = fair ? `${fair[1]}GB/day high speed, then reduced speed` : null;

  $('a[href*="/checkout?bundle="]').each((_, a) => {
    // The card: nearest ancestor holding exactly one Buy Now link and the h3.
    let card = $(a).parent();
    while (card.length && !(card.find("h3").length === 1 && card.find('a[href*="/checkout?bundle="]').length === 1)) card = card.parent();
    if (!card.length) return;
    const head = clean(card.find("h3").first().text()); // "1GB - 7 days"
    const m = head.match(/^(.+?)\s*-\s*(\d+)\s*days?$/i);
    if (!m) return;
    const days = Number(m[2]);
    const unlimited = /unlimited/i.test(m[1]);
    const data = unlimited ? -1 : dataGb(m[1].replace(/\s+/g, ""));
    if (data === null) return;
    const priceText = clean(card.find(".font-bold.text-xl").first().text() || card.text().match(/[£€$]\s?\d[\d.,]*/)?.[0] || "");
    const pm = priceText.match(/(\d[\d,]*(?:\.\d+)?)/);
    const currency = CURRENCIES.find(([re]) => re.test(priceText))?.[1];
    if (!pm || !currency) return;
    const area = clean(card.find("div.font-medium").first().text());
    const countries = clean(card.find("button").first().text()).match(/^(\d+)\s+countries$/i)?.[1];
    const coverage = countries ? (destination.type === "country" && area ? `${area}: ${countries} countries` : `${countries} countries`) : null;
    out.push(
      esimPlan({
        title: `${unlimited ? "Unlimited" : head.split(" - ")[0].replace(/\s+/g, "")} / ${days} days`,
        coverage,
        data_gb: data,
        data_note: unlimited ? dailyNote : null,
        validity_days: days,
        price: Number(pm[1].replace(/,/g, "")),
        currency,
      }),
    );
  });
  return out;
};
