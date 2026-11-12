import { dom, lines, price } from "../../scrapers/parse-utils";
import { esimPlan, type EsimParser, type RawEsimPlan } from "../types";

/**
 * Airalo store pages (Nuxt). Every fixed-data package is a button whose aria-label reads
 *   "Select 5 GB - 50 SMS - 50 Mins - 30 days for $19.00 USD."
 * The unlimited packages are only rendered after the "Unlimited" tab is opened, so they come from the page text:
 *   "3 days" / "Unlimited" / "GB" / "$11.50" / "USD".
 * The country list/other pages (e.g. /global-esim, a category listing) have no package buttons and give no plans.
 */
export const airalo: EsimParser = (page) => {
  const $ = dom(page);
  const out: RawEsimPlan[] = [];

  const n = /(\d+)\s+Countries and Networks/i.exec(page.text);
  const coverage = n ? `${n[1]} countries` : null;

  const base = (days: number, data: number, label: string, p: number, currency: string, extra: Partial<RawEsimPlan> = {}) =>
    esimPlan({
      title: `${label} / ${days} days`,
      coverage,
      data_gb: data,
      validity_days: days,
      price: p,
      currency,
      ...extra,
    });

  $('[data-testid="package-grouped-packages_package-button"]').each((_, el) => {
    const label = ($(el).attr("aria-label") ?? "").trim();
    const m = /^Select\s+([\d.,]+)\s*(GB|MB|TB)(?:\s*-\s*(\d+)\s*SMS)?(?:\s*-\s*(\d+)\s*Mins?)?\s*-\s*(\d+)\s*days?\s+for\s+(.+?)\s+([A-Z]{3})\.?$/i.exec(label);
    if (!m) return;
    const amount = parseFloat(m[1].replace(/,/g, ""));
    const unit = m[2].toUpperCase();
    const gb = unit === "MB" ? amount / 1000 : unit === "TB" ? amount * 1000 : amount;
    const p = price(m[6]);
    if (p === null) return;
    const sms = m[3] ? Number(m[3]) : null;
    const mins = m[4] ? Number(m[4]) : null;
    const withVoice = sms !== null || mins !== null;
    out.push(
      base(Number(m[5]), gb, `${m[1]}${unit}`, p, m[7].toUpperCase(), {
        voice_included: withVoice ? mins !== null : false,
        sms_included: withVoice ? sms !== null : false,
        voice_sms_note: withVoice ? [sms !== null ? `${sms} SMS` : "", mins !== null ? `${mins} minutes` : ""].filter(Boolean).join(" + ") : null,
        phone_number: withVoice ? true : null,
      }),
    );
  });

  // Unlimited packages: "<N> days", "Unlimited", "GB", price, currency code.
  const L = lines(page);
  for (let i = 0; i + 4 < L.length; i++) {
    const d = /^(\d+)\s+days?$/i.exec(L[i]);
    if (!d || !/^unlimited$/i.test(L[i + 1])) continue;
    const j = /^(?:GB)?$/i.test(L[i + 2]) ? i + 3 : i + 2;
    const p = price(L[j]);
    const cur = /^[A-Z]{3}$/.test(L[j + 1] ?? "") ? L[j + 1] : null;
    if (p === null || !cur) continue;
    out.push(base(Number(d[1]), -1, "Unlimited", p, cur, { voice_included: false, sms_included: false }));
  }
  return out;
};
