import { clean, jsonLd, lines, walkJson } from "../../scrapers/parse-utils";
import type { EsimParser, RawEsimPlan } from "../types";

/**
 * Roamless: a Next.js page with two plan families.
 *  - Data plans: schema.org Product JSON-LD, one Offer per size ("5GB", price, priceCurrency); validity comes from the
 *    "Expiration / Data Plan / 30 days" comparison block of the page.
 *  - Unlimited plans: daily-price table in the text: "<N> days", "$x /day", "$total" (total = price charged).
 * Pay as You Go (credits) is not a plan with a fixed price/data, so it is skipped.
 * Country pages live at /esim/<country>-esim, regions at /esim-region/<region>-esim.
 */
const num = (s: string): number => parseFloat(s.replace(/[^\d.]/g, ""));
const CURRENCY_SYMBOL: Record<string, string> = { $: "USD", "€": "EUR", "£": "GBP" };

export const roamless: EsimParser = (page) => {
  const L = lines(page);
  const plans: RawEsimPlan[] = [];

  // Currency the page states ("All prices listed in USD").
  const stated = L.map((l) => /^All prices listed in ([A-Z]{3})$/i.exec(l)?.[1]).find(Boolean)?.toUpperCase();

  // Coverage of region pages: "See countries for Europe" followed by "(40)".
  let coverage: string | null = null;
  const ci = L.findIndex((l) => /^See countries for /i.test(l));
  if (ci >= 0) {
    const n = /^\((\d+)\)$/.exec(L[ci + 1] ?? "")?.[1];
    const region = L[ci].replace(/^See countries for /i, "");
    if (n) coverage = /^global$/i.test(region) ? `${n} countries worldwide` : `${n} countries in ${region}`;
  }

  // Perks from the "Technical details" block.
  const perks: string[] = [];
  const hi = L.findIndex((l) => /^Hotspot \/ tethering:?$/i.test(l));
  if (hi >= 0 && /^(unlimited|allowed|yes|included)$/i.test(L[hi + 1] ?? "")) perks.push("Hotspot allowed");
  if (L.some((l) => /(^|\/)5G$/.test(l))) perks.push("5G"); // network list: "3G/LTE/4G/5G" or "5G"
  if (L.some((l) => /^first 500 ?MB is on us$/i.test(l))) perks.push("Free 500 MB trial");
  const dataOnly = L.some((l) => /^Data only$/i.test(l));

  // Validity of the fixed Data Plan: "Expiration" block -> "Data Plan" -> "30 days".
  let dataValidity: number | null = null;
  const ei = L.findIndex((l) => /^Expiration$/i.test(l));
  if (ei >= 0) {
    for (let i = ei + 1; i < Math.min(L.length, ei + 12); i++) {
      if (/^Data Plan$/i.test(L[i])) {
        const m = /^(\d+)\s*days?$/i.exec(L[i + 1] ?? "");
        if (m) dataValidity = +m[1];
        break;
      }
    }
  }

  const common = {
    coverage,
    voice_included: dataOnly ? false : null,
    sms_included: dataOnly ? false : null,
    voice_sms_note: null,
    phone_number: dataOnly ? false : null,
  };

  // 1) Data plans from JSON-LD.
  for (const block of jsonLd(page)) {
    walkJson(block, (o) => {
      if (o["@type"] !== "Offer" || typeof o.name !== "string") return;
      const m = /^(\d+(?:\.\d+)?)\s*(GB|MB|TB)$/i.exec(o.name.trim());
      const p = typeof o.price === "number" ? o.price : num(String(o.price ?? ""));
      const cur = typeof o.priceCurrency === "string" ? o.priceCurrency : stated;
      if (!m || !(p > 0) || !cur || dataValidity === null) return;
      const unit = m[2].toUpperCase();
      const gb = +m[1] * (unit === "MB" ? 0.001 : unit === "TB" ? 1000 : 1);
      plans.push({
        title: `${m[1]}${unit} / ${dataValidity} days`,
        ...common,
        data_gb: gb,
        data_note: null,
        validity_days: dataValidity,
        price: p,
        currency: cur,
        perks,
      });
    });
  }

  // 2) Unlimited plans: "<N> day(s)", "$daily", "/day", "$total".
  const cap = L.map((l) => /^(\d+(?:\.\d+)?)\s?GB\/day at full speed$/i.exec(l)?.[0]).find(Boolean) ?? null;
  const seen = new Set<number>();
  for (let i = 0; i + 3 < L.length; i++) {
    const d = /^(\d+) days?$/i.exec(L[i]);
    if (!d || !/^[$€£]\s?[\d.]+$/.test(L[i + 1]) || L[i + 2] !== "/day" || !/^[$€£]\s?[\d.]+$/.test(L[i + 3])) continue;
    const days = +d[1];
    if (seen.has(days)) continue;
    seen.add(days);
    const cur = stated ?? CURRENCY_SYMBOL[L[i + 3][0]];
    if (!cur) continue;
    plans.push({
      title: `Unlimited / ${days} ${days === 1 ? "day" : "days"}`,
      ...common,
      data_gb: -1,
      data_note: cap ? clean(`${cap}, then 1 Mbps`) : null,
      validity_days: days,
      price: num(L[i + 3]),
      currency: cur,
      perks,
    });
  }
  return plans;
};
