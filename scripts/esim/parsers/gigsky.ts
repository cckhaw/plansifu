import { esimPlan, type EsimParser, type RawEsimPlan } from "../types";
import { feedJson, lines, walkJson } from "../../scrapers/parse-utils";

/** Unlimited day-lengths we keep (the site sells any 1-30 days; listing them all would flood the destination). */
const UNLIMITED_DAYS = [1, 3, 7, 15, 30];

interface Bundle {
  dataKb: number;
  days: number;
  price: number;
  currency: string;
  unlimited: boolean;
  free: boolean;
}

/** GigSky: plans come from services.gigsky.com/cams/api/v4/planBundles/<id> (loaded by the page); the unlimited
 *  plan is priced per day there, and the page's price table gives the (discounted) price per number of days. */
export const gigsky: EsimParser = (page, destination) => {
  const bundles: Bundle[] = [];
  for (const { url, json } of feedJson(page)) {
    if (!/planBundles/.test(url)) continue;
    walkJson(json, (o) => {
      if (o.type !== "Plan" || typeof o.price !== "number" || typeof o.validityPeriodInDays !== "number") return;
      bundles.push({
        dataKb: Number(o.dataLimitInKB ?? 0),
        days: o.validityPeriodInDays,
        price: o.price,
        currency: String(o.currency ?? "USD"),
        unlimited: o.chargingType === "UNLIMITED" || o.category === "UNLIMITED",
        free: o.freePlan === true || o.price === 0,
      });
    });
  }

  const out: RawEsimPlan[] = [];
  const seen = new Set<string>();
  const perks = ["Hotspot allowed", "Free trial plan (100MB)", "24/7 support"];

  for (const b of bundles) {
    if (b.free || b.unlimited) continue;
    const gb = Math.round((b.dataKb / 1048576) * 1000) / 1000; // GigSky's "GB" are 1024-based KB counts: 1048576KB = 1GB
    const key = `${gb}|${b.days}|${b.price}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(
      esimPlan({
        title: `${gb}GB / ${b.days} days`,
        data_gb: gb,
        validity_days: b.days,
        price: b.price,
        currency: b.currency,
        coverage: destination.type === "country" ? null : destination.name,
        voice_included: false,
        sms_included: false,
        perks,
      }),
    );
  }

  const unl = bundles.find((b) => b.unlimited && !b.free);
  if (unl) {
    // Table rows on the page: "Unlimited | 7 Days | $23.27 | $24.49 | $3.32/day | Save 5%" (charged price first, list price second).
    const L = lines(page);
    const table = new Map<number, number>();
    for (let i = 0; i + 3 < L.length; i++) {
      const d = L[i].match(/^(\d+) Days?$/i);
      if (!d || !/^unlimited$/i.test(L[i - 1] ?? "")) continue;
      const p = L[i + 1].match(/^[^\d]*(\d[\d,]*(?:\.\d+)?)$/);
      if (p) table.set(Number(d[1]), Number(p[1].replace(/,/g, "")));
    }
    for (const days of UNLIMITED_DAYS) {
      const p = table.get(days) ?? (table.size ? undefined : Math.round(unl.price * days * 100) / 100);
      if (p === undefined) continue;
      out.push(
        esimPlan({
          title: `Unlimited / ${days} ${days === 1 ? "day" : "days"}`,
          data_gb: -1,
          validity_days: days,
          price: p,
          currency: unl.currency,
          coverage: destination.type === "country" ? null : destination.name,
          voice_included: false,
          sms_included: false,
          perks,
        }),
      );
    }
  }
  return out;
};
