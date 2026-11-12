import type { EsimDestination } from "../../src/lib/esim-destinations";
import type { EsimRow } from "./db";
import type { RawEsimPlan } from "./types";

/** Validate and normalise a parser's output for one destination page; returns the rows to store and what was dropped. */
export function clean(raw: RawEsimPlan[], d: EsimDestination, url: string): { rows: EsimRow[]; dropped: { title: string; reason: string }[] } {
  const rows: EsimRow[] = [];
  const dropped: { title: string; reason: string }[] = [];
  const seen = new Set<string>();
  const offers = new Set<string>();
  for (const p of raw) {
    const title = p.title.replace(/\s+/g, " ").trim().slice(0, 80);
    const currency = (p.currency || "").trim().toUpperCase();
    if (!title) dropped.push({ title: "(empty)", reason: "no title" });
    else if (!/^[A-Z]{3}$/.test(currency)) dropped.push({ title, reason: `bad currency "${p.currency}"` });
    else if (!(p.price > 0) || p.price > 2000) dropped.push({ title, reason: `price out of range (${p.price})` });
    else if (p.data_gb === null) dropped.push({ title, reason: "data amount not stated" });
    else if (p.data_gb !== null && p.data_gb !== -1 && (p.data_gb <= 0 || p.data_gb > 2000)) dropped.push({ title, reason: `data out of range (${p.data_gb})` });
    else {
      // 999GB-style figures mean "unlimited" on some sites.
      const data = p.data_gb !== null && p.data_gb >= 900 && p.data_gb <= 1000 ? -1 : p.data_gb;
      // The same offer listed twice (same data, validity, price and coverage) is one plan.
      const offer = [data, p.validity_days, p.price, currency, p.coverage ?? ""].join("|");
      if (offers.has(offer)) {
        dropped.push({ title, reason: "duplicate offer" });
        continue;
      }
      offers.add(offer);
      let t = title;
      if (seen.has(t.toLowerCase())) t = `${title} · ${p.coverage ?? `${currency} ${p.price}`}`.slice(0, 80);
      if (seen.has(t.toLowerCase())) t = `${title} · ${currency} ${p.price}`;
      if (seen.has(t.toLowerCase())) dropped.push({ title, reason: "duplicate" });
      else {
        seen.add(t.toLowerCase());
        rows.push({ ...p, data_gb: data, title: t, currency, destination_key: d.key, perks: p.perks.slice(0, 6), affiliate_url: url });
      }
    }
  }
  return { rows, dropped };
}
