import { clean, dom } from "../../scrapers/parse-utils";
import type { PageData } from "../../scrapers/types";
import type { EsimDestination } from "../../../src/lib/esim-destinations";
import { esimPlan, type EsimParser, type RawEsimPlan } from "../types";

/**
 * Maya sells one worldwide eSIM (165+ countries, same price in every country), so every country page lists the same
 * plans. The Angular page renders each plan as `.plan-card` with `.plan-card__name` ("14 Days Unlimited" or
 * "5GB 30 Days") and `.plan-card__price` ("USD 27.99"). The country is covered like any other, so coverage stays null
 * for country pages. Pages without cards (maya.net/esim/global is a checkout "Order Summary" for one preselected
 * plan) fall back to that summary: "Plan Unlimited / Duration 30 Days / Total USD 49.99".
 */
const num = (s: string) => Number(s.replace(/,/g, ""));

function planFrom(name: string, priceText: string, coverage: string | null, perks: string[], note: string | null): RawEsimPlan | null {
  const days = name.match(/(\d+)\s*Days?\b/i);
  const gb = name.match(/(\d[\d,.]*)\s*(GB|MB|TB)\b/i);
  const unlimited = /unlimited/i.test(name);
  const pm = priceText.match(/\b([A-Z]{3})\s*(\d[\d,]*(?:\.\d+)?)/);
  if (!days || !pm || (!unlimited && !gb)) return null;
  const d = unlimited ? -1 : num(gb![1]) * (/TB/i.test(gb![2]) ? 1000 : /MB/i.test(gb![2]) ? 0.001 : 1);
  return esimPlan({
    title: `${unlimited ? "Unlimited" : `${d}GB`} / ${Number(days[1])} days`,
    coverage,
    data_gb: d,
    data_note: note,
    validity_days: Number(days[1]),
    price: num(pm[2]),
    currency: pm[1],
    perks,
  });
}

export const maya: EsimParser = (page: PageData, destination: EsimDestination): RawEsimPlan[] => {
  const $ = dom(page);
  const text = clean(page.text.replace(/\n/g, " "));
  const world = text.match(/(\d+\+)\s+countries/i) ?? text.match(/(\d+)\s+countries/i);
  const coverage = destination.type === "country" ? null : world ? `${world[1]} countries` : null;
  const perks = [/Hotspot included/i.test(text) ? "Hotspot allowed" : "", /5G\/4G|5G/i.test(text) ? "5G" : "", /Auto[- ]?Top[- ]?Up|Auto-renews/i.test(text) ? "Auto top-up" : "", /24-7 Support|24\/7/i.test(text) ? "24/7 support" : "", world ? `Works in ${world[1]} countries` : ""].filter(Boolean);
  const out: RawEsimPlan[] = [];
  $(".plan-card").each((_, el) => {
    const c = $(el);
    const p = planFrom(clean(c.find(".plan-card__name").first().text()), clean(c.find(".plan-card__price").first().text()), coverage, perks, null);
    if (p) out.push(p);
  });
  if (out.length) return out;
  // Checkout summary fallback (single preselected plan).
  const lines = clean(page.text.replace(/\n/g, " | ")).split(" | ").map(clean);
  const at = (label: string) => {
    const i = lines.indexOf(label);
    return i >= 0 ? lines[i + 1] : "";
  };
  const total = lines[lines.indexOf("Total") + 1] ?? "";
  const p = planFrom(`${at("Plan")} ${at("Duration")}`, total, coverage, perks, null);
  return p ? [p] : [];
};
