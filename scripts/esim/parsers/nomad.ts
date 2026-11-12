import { dataGb, lines } from "../../scrapers/parse-utils";
import { esimPlan, type EsimParser, type RawEsimPlan } from "../types";

/**
 * Nomad (nomadesim.com). The rendered page lists "Unlimited Data Plans" and "Fixed Data Plans" as rows
 * of: data line ("5 GB" / "Unlimited"), validity line ("For 30 DAYS" / "30 Days"), price ("USD" + "10", or "USD 10").
 * A sale shows list price then sale price (any order of the currency token), so the LAST amount is the one charged.
 * The two page templates (country pages vs. region pages) differ in order, but both read the same from the text lines;
 * the captured HTML of region pages is empty, so this parser uses text lines only.
 */
const DATA_RE = /^(unlimited|\d[\d,.]*\s?(?:GB|MB|TB))$/i;
const VALID_RE = /^(?:for\s+)?(\d+)\s*days?$/i;
const PRICE_TOKEN_RE = /^(?:([A-Z]{3})\s*)?(\d[\d,]*(?:\.\d+)?)$|^([A-Z]{3})$/;
const VOICE_RE = /^\d+\s*min\s*\+\s*\d+\s*SMS$/i;
const SKIP_RE = /^(plan details|on sale)$/i;

export const nomad: EsimParser = (page, destination) => {
  const ls = lines(page);
  // currency selector in the header: "en | USD"
  const headerCur = ls.map((l) => l.match(/^[a-z]{2}\s*\|\s*([A-Z]{3})$/)?.[1]).find(Boolean) ?? null;

  // Coverage countries: lines between "Coverage" and "Network list"
  let countries = 0;
  const cov = ls.indexOf("Coverage");
  if (cov >= 0) {
    const end = ls.findIndex((l, i) => i > cov && /^network list$/i.test(l));
    if (end > cov) countries = end - cov - 1;
  }
  const coverage = destination.type === "country" ? null : countries > 0 ? `${countries} countries` : null;

  const out: RawEsimPlan[] = [];
  for (let i = 0; i < ls.length - 2; i++) {
    if (!DATA_RE.test(ls[i])) continue;
    // optional "100 min + 100 SMS" line between data and validity ("Data + Calls + SMS" plans)
    const vs = VOICE_RE.test(ls[i + 1]) ? 1 : 0;
    const vm = ls[i + 1 + vs]?.match(VALID_RE);
    if (!vm) continue;
    let cur: string | null = null;
    let amount: number | null = null;
    for (let j = i + 2 + vs; j < ls.length && j < i + 8 + vs; j++) {
      const l = ls[j];
      if (SKIP_RE.test(l)) continue;
      const m = l.match(PRICE_TOKEN_RE);
      if (!m) {
        // anything else ends the card, unless it is the next plan's data line (handled by the outer loop)
        break;
      }
      if (m[3]) cur = m[3];
      else {
        if (m[1]) cur = m[1];
        amount = Number(m[2].replace(/,/g, ""));
      }
      if (DATA_RE.test(l)) break;
    }
    const currency = cur ?? headerCur;
    if (amount === null || !currency) continue;
    const days = Number(vm[1]);
    const data = /unlimited/i.test(ls[i]) ? -1 : dataGb(ls[i].replace(/\s+/g, " "));
    const dataLabel = data === -1 ? "Unlimited" : ls[i].replace(/\s+/g, "").toUpperCase();
    out.push(
      esimPlan({
        title: `${dataLabel} / ${days} days${vs ? " + calls & SMS" : ""}`,
        coverage,
        data_gb: data,
        validity_days: days,
        price: amount,
        currency,
        ...(vs ? { voice_included: true, sms_included: true, voice_sms_note: ls[i + 1].replace(/\s+/g, " ") } : {}),
      }),
    );
  }
  return out;
};
