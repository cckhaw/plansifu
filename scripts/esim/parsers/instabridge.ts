import { dom, clean } from "../../scrapers/parse-utils";
import { esimPlan, type EsimParser, type RawEsimPlan } from "../types";

/**
 * store.instabridge.com/mobile-data/<ISO|region>[/10gb]: server-rendered `article.package-card` cards.
 * Each card has a hidden checkout form (Amount in bytes, DurationHours, BasePrice, Region) which is the
 * most reliable source; the visible "10 GB / 16 USD" and "Validity 30 days" texts are the fallback.
 * Currency is shown after the price ("16 USD").
 */
export const instabridge: EsimParser = (page, destination) => {
  const $ = dom(page);
  const out: RawEsimPlan[] = [];
  const coverageName = destination.type === "country" ? null : destination.name.replace(/\s*\(.*\)$/, "");

  $("article.package-card").each((_, el) => {
    const card = $(el);
    const input = (name: string) => card.find(`input[name="${name}"]`).attr("value");

    const priceText = clean(card.find(".package-price").text()); // "16 USD"
    const m = priceText.match(/([\d.,]+)\s*([A-Z]{3})/) ?? clean(card.attr("aria-label")).match(/for ([\d.,]+) ([A-Z]{3})/);
    if (!m) return;
    const amount = Number(input("BasePrice") ?? m[1].replace(/,/g, ""));
    const currency = m[2];

    const bytes = Number(input("Amount"));
    let gb = bytes > 0 ? bytes / 1e9 : null;
    if (gb === null) {
      const d = clean(card.find(".package-amount").text()).match(/([\d.]+)\s*(GB|MB|TB)/i);
      if (d) gb = Number(d[1]) * ({ mb: 0.001, gb: 1, tb: 1000 } as Record<string, number>)[d[2].toLowerCase()];
    }

    let days: number | null = null;
    const hours = Number(input("DurationHours"));
    if (hours > 0) days = Math.round(hours / 24);
    else {
      const v = card.find(".detail-row").filter((_, r) => /validity/i.test($(r).text())).find(".detail-value").text();
      const dm = clean(v).match(/(\d+)\s*day/i);
      if (dm) days = Number(dm[1]);
    }
    if (!(amount > 0) || gb === null) return;

    const size = Number.isInteger(gb) ? String(gb) : String(+gb.toFixed(2));
    const perks: string[] = [];
    if (/one\s*time/i.test(input("Type") ?? "")) perks.push("One-time purchase");
    if (card.find(".popular-badge").length) perks.push("Popular choice");

    out.push(
      esimPlan({
        title: days ? `${size}GB / ${days} days` : `${size}GB`,
        coverage: coverageName,
        data_gb: gb,
        validity_days: days,
        price: amount,
        currency,
        perks,
      }),
    );
  });
  return out;
};
