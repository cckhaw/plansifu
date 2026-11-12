import { esimPlan, type EsimParser, type RawEsimPlan } from "../types";
import { dom, clean, dataGb } from "../../scrapers/parse-utils";

const SYMBOL_CURRENCY: Record<string, string> = { $: "USD", "€": "EUR", "£": "GBP", "A$": "AUD", "C$": "CAD", "S$": "SGD", RM: "MYR" };

/** aloSIM: every plan is a `.location-package-v3` (country pages) or `-v2` (region/global pages) card carrying data-package-* attributes (one tab panel per trip length). */
export const alosim: EsimParser = (page, destination) => {
  const $ = dom(page);
  const cards = $("[class*='location-package-v'][data-package-days-count]");
  if (!cards.length) return [];

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
