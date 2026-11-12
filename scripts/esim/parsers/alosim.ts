import { esimPlan, type EsimParser, type RawEsimPlan } from "../types";
import { dom, clean, dataGb, lines } from "../../scrapers/parse-utils";

const SYMBOL_CURRENCY: Record<string, string> = { $: "USD", "€": "EUR", "£": "GBP", "A$": "AUD", "C$": "CAD", "S$": "SGD", RM: "MYR" };

/** aloSIM: every plan is a `.location-package-v3` (country pages) or `-v2` (region/global pages) card carrying data-package-* attributes (one tab panel per trip length). */
export const alosim: EsimParser = (page, destination) => {
  const $ = dom(page);
  const cards = $("[class*='location-package-v'][data-package-days-count]");
  if (!cards.length) return fromText(page, destination);

  // Currency: the header's active currency-switcher entry (the page's prices are shown in it).
  const currency =
    clean($(".currency-switcher__item.active").first().attr("data-currency-code")) ||
    clean($(".header__main-selectors .currency-code").first().text()) ||
    SYMBOL_CURRENCY[clean(cards.first().find(".als-price__symbol").first().text())] ||
    "";

  const pageText = clean($("body").text());
  const phone = /free (?:international )?phone number/i.test(pageText);

  const out: RawEsimPlan[] = [];
  cards.each((_, el) => {
    const c = $(el);
    const days = Number(c.attr("data-package-days-count"));
    const gbAttr = clean(c.attr("data-package-gb"));
    const unlimited = c.attr("data-package-type") === "unlimited" || /unlimited/i.test(gbAttr);
    const gb = unlimited ? -1 : dataGb(gbAttr);
    const price = Number(clean(c.find("[data-package-price-value]").first().text()).replace(/,/g, ""));
    if (!days || gb === null || !(price > 0)) return;
    const name = clean(c.find(".location-package-v3__title").first().text());
    const label = clean(c.find("[class$='__label']").first().text()).replace(/^[^\p{L}]+/u, "");
    const perks = ["Hotspot allowed"];
    if (phone) perks.push("Free phone number");
    if (label) perks.push(label);
    out.push(
      esimPlan({
        title: `${unlimited ? "Unlimited" : `${gb}GB`} / ${days} ${days === 1 ? "day" : "days"}`,
        coverage: destination.type === "country" ? null : destination.name,
        data_gb: gb,
        data_note: unlimited ? "Unlimited (fair-use limits apply)" : name ? `${name} plan` : null,
        validity_days: days,
        price,
        currency,
        voice_included: null,
        sms_included: null,
        phone_number: phone ? true : null,
        perks,
      }),
    );
  });
  return out;
};

/**
 * Fallback for when the rendered HTML is empty (it happens on some region/country pages) but the text survived.
 * Only the visible tab (prepaid) is in the text: "7 | days | 1 | GB | Maps... | $ | 3.50" per plan.
 */
function fromText(page: Parameters<EsimParser>[0], destination: Parameters<EsimParser>[1]): RawEsimPlan[] {
  const L = lines(page);
  const sym = { $: "USD", "€": "EUR", "£": "GBP" } as Record<string, string>;
  const cur = L.findIndex((l) => /^[A-Z]{3}$/.test(l) && L[L.indexOf(l) + 1] !== undefined && /^[$€£]$/.test(L[L.indexOf(l) + 1]));
  const currency = cur >= 0 ? L[cur] : "";
  const phone = L.some((l) => /free (?:international )?phone number/i.test(l));
  const out: RawEsimPlan[] = [];
  for (let i = 0; i + 6 < L.length; i++) {
    if (!/^\d+$/.test(L[i]) || !/^days?$/i.test(L[i + 1]) || !/^\d+(?:\.\d+)?$/.test(L[i + 2]) || !/^GB$/i.test(L[i + 3])) continue;
    const j = L.findIndex((l, k) => k > i + 3 && k <= i + 6 && /^[$€£]$/.test(l));
    if (j < 0) continue;
    const days = Number(L[i]);
    const gb = Number(L[i + 2]);
    const price = Number(L[j + 1].replace(/,/g, ""));
    const c = currency || sym[L[j]] || "";
    if (!(price > 0)) continue;
    const label = /most popular|best value/i.test(L[j + 2] ?? "") ? L[j + 2].replace(/^[^\p{L}]+/u, "") : null;
    out.push(
      esimPlan({
        title: `${gb}GB / ${days} ${days === 1 ? "day" : "days"}`,
        coverage: destination.type === "country" ? null : destination.name,
        data_gb: gb,
        validity_days: days,
        price,
        currency: c,
        phone_number: phone ? true : null,
        perks: ["Hotspot allowed", ...(phone ? ["Free phone number"] : []), ...(label ? [label] : [])],
      }),
    );
  }
  return out;
}
