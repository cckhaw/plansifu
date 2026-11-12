import { dom, jsonLd, price, walkJson } from "../../scrapers/parse-utils";
import { esimPlan, type EsimParser, type RawEsimPlan } from "../types";

/**
 * Saily destination pages. Plan cards are `li[data-testid^="destination-hero-plan-card-"]` (the number is the GB, 999 = the
 * Unlimited card). A fixed card reads "<N> GB" / "<D> days" / "US$x"; the Unlimited card has a duration stepper
 * (input value) or <select> (selected option) and shows the price for that duration only, so one Unlimited plan is
 * returned (for the duration the page has selected). Currency comes from the page's Product JSON-LD (priceCurrency).
 */
const SYMBOLS: Record<string, string> = { "US$": "USD", "S$": "SGD", "A$": "AUD", "C$": "CAD", "NZ$": "NZD", "HK$": "HKD", "RM": "MYR", "€": "EUR", "£": "GBP", "$": "USD" };

function currencyOf(priceText: string, ld: string | null): string | null {
  if (ld) return ld;
  const m = /^\s*([^\d\s.,-]+)/.exec(priceText);
  return m ? SYMBOLS[m[1]] ?? null : null;
}

export const saily: EsimParser = (page) => {
  const $ = dom(page);

  let ldCurrency: string | null = null;
  for (const block of jsonLd(page)) {
    walkJson(block, (o) => {
      if (!ldCurrency && typeof o.priceCurrency === "string" && /^[A-Z]{3}$/.test(o.priceCurrency)) ldCurrency = o.priceCurrency;
    });
  }

  const n = /View country list\s*\((\d+)\)/i.exec(page.text);
  const coverage = n ? `${n[1]} countries` : null;
  const perks: string[] = [];
  if (/hotspot/i.test(page.text)) perks.push("Hotspot allowed");
  if (/\b5G\b/.test(page.text)) perks.push("5G");
  if (/top[- ]?ups?\b/i.test(page.text)) perks.push("Top-up anytime");
  if (/24\/7/.test(page.text)) perks.push("24/7 support");
  if (/\d+%\s+in Saily credits/i.test(page.text)) perks.push("Saily credits back");
  const perkList = perks.slice(0, 6);

  const out: RawEsimPlan[] = [];
  $('li[data-testid^="destination-hero-plan-card-"]').each((_, el) => {
    const card = $(el);
    const priceText = card.find('[data-testid="pricing-card-original-price"]').first().text().trim();
    const p = price(priceText);
    if (p === null) return;
    const currency = currencyOf(priceText, ldCurrency);
    if (!currency) return;
    const text = card.text().replace(/\s+/g, " ");

    if (/Unlimited/i.test(text)) {
      const sel = card.find("select option[selected]").first().text();
      const days = Number(/(\d+)/.exec(sel)?.[1] ?? card.find('[data-testid="unlimited-plan-duration-stepper-input"]').attr("value"));
      if (!(days > 0)) return;
      const daily = /(\d+)\s*GB\s*\/\s*Day/i.exec(page.text);
      out.push(
        esimPlan({
          title: `Unlimited / ${days} days`,
          coverage,
          data_gb: -1,
          data_note: daily ? `${daily[1]}GB per day at full speed, then 1 Mbps` : null,
          validity_days: days,
          price: p,
          currency,
          perks: perkList,
        }),
      );
      return;
    }
    const m = /([\d.]+)\s*(GB|MB)\s*(\d+)\s*days?/i.exec(text);
    if (!m) return;
    const gb = m[2].toUpperCase() === "MB" ? Number(m[1]) / 1000 : Number(m[1]);
    out.push(esimPlan({ title: `${m[1]}${m[2].toUpperCase()} / ${m[3]} days`, coverage, data_gb: gb, validity_days: Number(m[3]), price: p, currency, perks: perkList }));
  });
  return out;
};
