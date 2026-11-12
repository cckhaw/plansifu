import { clean, dom, lines } from "../../scrapers/parse-utils";
import type { EsimParser, RawEsimPlan } from "../types";

/**
 * Yesim (Next.js, CSS-module class names with a hashed suffix, so selectors match on the stable prefix).
 *  - Fixed plans: table rows `tr[id^="plan_item_"]`: "<N> GB|MB • <N> days", "$x / GB", then the price charged
 *    (`PlanPlate_priceWithSymbols`); a struck-through list price (`...TitlePriceTheoretical`) and a discount badge may follow.
 *  - Unlimited plans: only the selected option of the "Number of days" dropdown is in the page ("30 days" + price);
 *    it is read as one "Unlimited" plan when the "Unlimited plans" tab is the pressed one.
 *  - Currency: the currency switcher button ("$, USD"). Coverage/hotspot/top-up: "Plan details" label/value lines.
 */
const CUR_BY_SYMBOL: Record<string, string> = { $: "USD", "€": "EUR", "£": "GBP" };
const amount = (s: string): number | null => {
  const m = /(\d[\d,]*(?:\.\d+)?)/.exec(s);
  return m ? parseFloat(m[1].replace(/,/g, "")) : null;
};

export const yesim: EsimParser = (page) => {
  const $ = dom(page);
  const L = lines(page);

  const cur = clean($('[aria-label="Currency switcher"], [class*="CurrencyButton_button"]').first().text());
  const currency = /\b([A-Z]{3})\b/.exec(cur)?.[1] ?? CUR_BY_SYMBOL[cur[0]];
  if (!currency) return [];

  const valueAfter = (label: string): string | undefined => {
    const i = L.findIndex((l) => l.toLowerCase() === label.toLowerCase());
    return i >= 0 ? L[i + 1] : undefined;
  };
  const cov = valueAfter("Coverage");
  const n = /^(\d+) countr/i.exec(cov ?? "");
  const coverage = n && +n[1] > 1 ? `${n[1]} countries` : null;
  const planType = valueAfter("Plan type");
  const dataOnly = /^data only$/i.test(planType ?? "");
  const perks: string[] = [];
  if (L.slice(0, 120).includes("5G")) perks.push("5G"); // header badge of the destination
  if (/^available$/i.test(valueAfter("Hotspot") ?? "")) perks.push("Hotspot allowed");
  if (/^available$/i.test(valueAfter("Balance top-up") ?? "")) perks.push("Top-up anytime");
  if (/^not required$/i.test(valueAfter("ID verification:") ?? "")) perks.push("No KYC");
  perks.push("24/7 support");

  const base = {
    coverage,
    data_note: null,
    voice_included: dataOnly ? false : null,
    sms_included: dataOnly ? false : null,
    voice_sms_note: null,
    phone_number: dataOnly ? false : null,
  };
  const plans: RawEsimPlan[] = [];

  $('tr[id^="plan_item_"]').each((_, tr) => {
    const row = $(tr);
    const title = clean(row.find('[class*="PlanPlate_startTitle"]').first().text());
    const m = /^(\d+(?:\.\d+)?)\s*(GB|MB|TB)\s*[•·-]\s*(\d+)\s*days?$/i.exec(title);
    const price = amount(row.find('[class*="PlanPlate_priceWithSymbols"]').first().text());
    if (!m || price === null) return;
    const unit = m[2].toUpperCase();
    const gb = +m[1] * (unit === "MB" ? 0.001 : unit === "TB" ? 1000 : 1);
    const days = +m[3];
    const rowPerks = [...perks];
    if (/first-time/i.test(row.text())) rowPerks.unshift("First-time deal");
    plans.push({
      ...base,
      title: `${m[1]}${unit} / ${days} ${days === 1 ? "day" : "days"}`,
      data_gb: gb,
      validity_days: days,
      price,
      currency,
      perks: rowPerks.slice(0, 6),
    });
  });

  // Unlimited plan = the selected "Number of days" option, when the Unlimited tab is the pressed one.
  const unlimitedOn = $('[class*="SegmentedControl_option"][aria-pressed="true"]').toArray().some((el) => /^unlimited/i.test(clean($(el).text())));
  const sel = $('[class*="PlansBlock_dropdownItem"]').first();
  if (unlimitedOn && sel.length) {
    const days = /^(\d+)\s*days?/i.exec(clean(sel.contents().first().text()));
    const price = amount(sel.find("p").first().text());
    if (days && price !== null) {
      const d = +days[1];
      plans.push({ ...base, title: `Unlimited / ${d} ${d === 1 ? "day" : "days"}`, data_gb: -1, validity_days: d, price, currency, perks: perks.slice(0, 6) });
    }
  }
  return plans;
};
