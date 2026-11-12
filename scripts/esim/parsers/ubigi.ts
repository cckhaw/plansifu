import { esimPlan, type EsimParser, type RawEsimPlan } from "../types";
import { dom, clean } from "../../scrapers/parse-utils";

/**
 * Ubigi: the store page renders every plan as `<div class="plan row" data-type data-allowance data-validity data-price
 * data-label data-countrylist>` (filled by the page's own script; no JSON feed is loaded). The page lists plans for
 * the chosen country or region, plus sibling regions (Isle of Man, Scandinavia...) which we skip.
 * Only one-off plans are kept: the "monthly" and "annual" ones are renewing subscriptions (no fixed validity).
 */
export const ubigi: EsimParser = (page, destination) => {
  const $ = dom(page);
  const out: RawEsimPlan[] = [];
  const wanted = new Set([destination.name, ...destination.slugs].map((s) => s.toUpperCase().replace(/[-_]+/g, " ")));

  $(".plan.row[data-type='one-off']").each((_, el) => {
    const c = $(el);
    const label = clean(c.attr("data-label")).toUpperCase();
    const countries = clean(c.attr("data-countrylist")).split(",").filter(Boolean);
    if (destination.type === "country") {
      if (destination.iso3 && !countries.includes(destination.iso3.toUpperCase())) return;
    } else if (![...wanted].some((w) => label === w || label.startsWith(`${w} `))) return;

    const allowance = Number(c.attr("data-allowance"));
    const days = Number(c.attr("data-validity"));
    const price = Number(c.attr("data-price"));
    if (!Number.isFinite(allowance) || !(days > 0) || !(price > 0)) return;
    const unlimited = allowance >= 1000;
    const href = c.find("a").first().attr("href") ?? "";
    const currency = (href.match(/wmc-currency=([A-Z]{3})/) ?? [])[1] ?? clean($(".currency-code, [class*='currency'] .active").first().text());

    const perks = ["Top-up anytime"];
    if (c.attr("data-bestseller") === "1") perks.push("Best seller");

    const sizeText = unlimited ? "Unlimited" : `${allowance}GB`;
    const title = `${sizeText} / ${days} ${days === 1 ? "day" : "days"}`;
    let coverage: string | null = null;
    if (destination.type !== "country") {
      const name = label.charAt(0) + label.slice(1).toLowerCase();
      coverage = `${name} (${countries.length} countries)`;
    }

    out.push(
      esimPlan({
        title,
        coverage,
        data_gb: unlimited ? -1 : allowance,
        validity_days: days,
        price,
        currency,
        perks,
      }),
    );
  });
  return out;
};
