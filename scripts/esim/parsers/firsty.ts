import { clean, feedJson } from "../../scrapers/parse-utils";
import { esimPlan, type EsimParser, type RawEsimPlan } from "../types";

/** Day-pass lengths worth listing (the catalogue prices every day from 1 to 60; one plan per day count would flood the table). */
const DAY_PASSES = [1, 3, 7, 14, 30];

/** Firsty's one-price-everywhere catalogue: GB bundle sizes from a `data_global_<n>(gb|mb)` plan id. */
function bundleGb(planId: string): number | null {
  const m = planId.match(/_(\d+(?:\.\d+)?)(gb|mb)$/i);
  if (!m) return null;
  return /mb/i.test(m[2]) ? Number(m[1]) / 1000 : Number(m[1]);
}

/**
 * Firsty's destination pages are marketing pages; the prices come from the catalogue the page loads
 * (`backoffice.firsty.app/api/web/catalogue/v1`, JSON with `currency` and prices in minor units, i.e. cents).
 * `dataBundlePlans.travel` holds prepaid GB bundles (`fixed`, GBs never expire) and one `per_day` Unlimited day pass
 * (`days: [{numberOfDays, price}]`). The catalogue is the same for every destination ("same price in 176 countries").
 * `subscriptionPlans` are Belgium-only local subscriptions and are ignored. A page without the feed (no plan page) returns [].
 */
export const firsty: EsimParser = (page, destination) => {
  const out: RawEsimPlan[] = [];
  const coverage = destination.type === "country" ? null : "176 countries";
  const text = clean(page.text);
  const neverExpires = /never expire/i.test(text);
  const pause = /pause/i.test(text);
  // "5 GB at high speed, then 512 Kbps": the fair-use rule of the Unlimited day pass, when the page states it.
  const fair = text.match(/(\d+(?:\.\d+)?)\s?GB at high speed, then (\d+\s?(?:Kbps|Mbps))/i);
  const dailyNote = fair ? `${fair[1]}GB/day high speed, then ${fair[2].replace(/\s/g, "")}` : null;

  for (const { json } of feedJson(page)) {
    if (!json || typeof json !== "object" || !("dataBundlePlans" in json)) continue;
    const currency = String((json as { currency?: string }).currency ?? "");
    const travel = (json as { dataBundlePlans?: { travel?: unknown } }).dataBundlePlans?.travel;
    if (!Array.isArray(travel) || !currency) continue;
    for (const p of travel as Record<string, unknown>[]) {
      const planId = String(p.planId ?? "");
      if (p.pricing === "fixed" && typeof p.price === "number") {
        const gb = bundleGb(planId);
        if (gb === null) continue;
        out.push(
          esimPlan({
            title: `${gb}GB / no expiry`,
            coverage,
            data_gb: gb,
            validity_days: null,
            price: p.price / 100,
            currency,
            perks: neverExpires ? ["Data never expires", "Top-up anytime"] : [],
          }),
        );
      } else if (p.pricing === "per_day" && Array.isArray(p.days)) {
        for (const d of p.days as { numberOfDays: number; price: number }[]) {
          if (!DAY_PASSES.includes(d.numberOfDays)) continue;
          out.push(
            esimPlan({
              title: `Unlimited / ${d.numberOfDays} ${d.numberOfDays === 1 ? "day" : "days"}`,
              coverage,
              data_gb: -1,
              data_note: dailyNote,
              validity_days: d.numberOfDays,
              price: d.price / 100,
              currency,
              perks: pause ? ["Pause anytime"] : [],
            }),
          );
        }
      }
    }
  }
  return out;
};
