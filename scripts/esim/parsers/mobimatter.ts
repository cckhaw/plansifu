import { clean, dom, jsonLd, walkJson } from "../../scrapers/parse-utils";
import type { EsimDestination } from "../../../src/lib/esim-destinations";
import type { EsimParser, RawEsimPlan } from "../types";

/**
 * MobiMatter: a marketplace page. Every offer is a card `[data-offer-id]` (the page lists all of them once
 * "Show more" was opened) holding, in order: plan name, provider, optional "5G" badge, then a 3-cell grid
 * (validity, data, price) and a line with the countries covered ("🇯🇵 Japan" or "🇦🇹 🇧🇪 🇧🇬  & 31 other countries").
 * Plans of other providers that also work in the destination (regional/global) are listed on the page too, so
 * they are returned with `coverage` set. Currency: the selected currency of the page's currency menu.
 */
const FLAG = /[\u{1F1E6}-\u{1F1FF}]{2}/gu;

/** Distinguishing words of a plan name ("Premium", "Special"): the name without destination, data and validity. */
function variant(name: string, destination: EsimDestination): string {
  let rest = name;
  for (const w of [destination.name.replace(/\s*\(.*\)/, ""), ...destination.slugs.map((s) => s.replace(/-/g, " "))]) {
    rest = rest.replace(new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "ig"), " ");
  }
  rest = rest.replace(/\b\d+(?:\.\d+)?\s*(?:GB|MB|TB|days?)\b/gi, " ").replace(/\bunlimited(?!\s+calls)\b/gi, " ");
  const words = clean(rest).split(" ").filter(Boolean);
  return words.length === 1 && !/^(and|the|plus)$/i.test(words[0]) ? words[0] : ""; // longer leftovers are country names, not a plan tier
}

const parseAll: EsimParser = (page, destination) => {
  const $ = dom(page);

  // Currency: the menu button label ("USD"); the JSON-LD AggregateOffer states the same code.
  let currency: string | undefined;
  $(".ui-menu-button-label").each((_, el) => {
    const t = clean($(el).text());
    if (!currency && /^[A-Z]{3}$/.test(t)) currency = t;
  });
  if (!currency) {
    for (const block of jsonLd(page))
      walkJson(block, (o) => {
        if (!currency && typeof o.priceCurrency === "string") currency = o.priceCurrency;
      });
  }
  if (!currency) return [];
  const cur: string = currency;

  const plans: RawEsimPlan[] = [];
  $("[data-offer-id]").each((_, el) => {
    const card = $(el);
    const ps = card.find("p").map((_, p) => clean($(p).text())).get();
    const name = clean(card.find("a").first().text());
    const m = ps.findIndex((t) => /^\d+ days?$/i.test(t));
    if (!name || m < 0) return;
    const provider = ps[ps.indexOf(name) + 1] && ps.indexOf(name) >= 0 ? ps[ps.indexOf(name) + 1] : "";
    const validity = parseInt(ps[m], 10);
    const dataText = ps[m + 1] ?? "";
    const priceText = ps[m + 2] ?? "";
    const countries = ps[m + 3] ?? "";

    let gb: number | null = null;
    let dataLabel = dataText;
    if (/^unlimited$/i.test(dataText)) {
      gb = -1;
      dataLabel = "Unlimited";
    } else {
      const d = /^(\d+(?:\.\d+)?)\s*(GB|MB|TB)$/i.exec(dataText);
      if (d) {
        const unit = d[2].toUpperCase();
        gb = +d[1] * (unit === "MB" ? 0.001 : unit === "TB" ? 1000 : 1);
        dataLabel = `${d[1]}${unit}`;
        if (gb >= 900 && gb <= 1000) {
          gb = -1; // "999 GB" means unlimited
          dataLabel = "Unlimited";
        }
      }
    }
    const price = /^[^\d]*(\d[\d,]*(?:\.\d+)?)$/.exec(priceText);
    if (gb === null || !price) return;

    // Coverage: flags listed + "& N other countries"; a single "🇯🇵 Japan" is a single-country plan.
    let coverage: string | null = null;
    const flags = (countries.match(FLAG) ?? []).length;
    const other = /&\s*(\d+) other countr/i.exec(countries)?.[1];
    if (other) coverage = `${flags + +other} countries`;
    else if (flags > 1) coverage = `${flags} countries`;

    const perks: string[] = [];
    if (card.find('img[alt="5G"]').length) perks.push("5G");
    const calls = /\bcalls\b/i.test(name);

    plans.push({
      title: [provider, variant(name, destination), `${dataLabel} / ${validity} days`].filter(Boolean).join(" "),
      coverage,
      data_gb: gb,
      data_note: null,
      validity_days: validity,
      price: parseFloat(price[1].replace(/,/g, "")),
      currency: cur,
      voice_included: calls ? true : null,
      sms_included: null,
      voice_sms_note: /unlimited calls/i.test(name) ? "Unlimited calls" : null,
      phone_number: null,
      perks,
    });
  });
  return plans;
};

/**
 * A marketplace lists dozens of offers per destination (87 on Japan), many of them other brands' plans that differ only in
 * price. For a comparison one MobiMatter row per size is enough: the cheapest offer for each data amount, validity and
 * single-/multi-country combination, at most MAX_ROWS, smallest plans first.
 */
const MAX_ROWS = 16;
export const mobimatter: EsimParser = (page, destination) => {
  const cheapest = new Map<string, RawEsimPlan>();
  for (const p of parseAll(page, destination)) {
    const key = [p.data_gb, p.validity_days, p.coverage ? "multi" : "single", p.currency].join("|");
    const best = cheapest.get(key);
    if (!best || p.price < best.price) cheapest.set(key, p);
  }
  return [...cheapest.values()]
    .sort((a, b) => (a.data_gb === -1 ? 1e9 : (a.data_gb ?? 0)) - (b.data_gb === -1 ? 1e9 : (b.data_gb ?? 0)) || (a.validity_days ?? 0) - (b.validity_days ?? 0))
    .slice(0, MAX_ROWS);
};
