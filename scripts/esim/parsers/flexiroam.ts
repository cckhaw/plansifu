import { clean, dom } from "../../scrapers/parse-utils";
import type { PageData } from "../../scrapers/types";
import type { EsimDestination } from "../../../src/lib/esim-destinations";
import { esimPlan, type EsimParser, type RawEsimPlan } from "../types";

/**
 * Flexiroam's shop page (Next.js, server-rendered) lists each plan as a `div[role=radio]` card:
 * a promo ribbon (`<p>📣 30% OFF</p>`), `<h3>` "10GB 7 Days", a per-GB/per-day line, then the price block:
 * `<del>USD 19.43</del>` (list price, only when discounted) and `<span class="text-sm font-bold">USD 13.6</span>`
 * (the price charged). Cards without a discount only have the span.
 * The "Unlimited Data Plans" toggle is a client-side switch; its cards are not in the rendered page, so only the
 * fixed-data plans are returned. Coverage for region/global pages comes from the intro sentence ("39 countries").
 */
const num = (s: string) => Number(s.replace(/,/g, ""));

export const flexiroam: EsimParser = (page: PageData, destination: EsimDestination): RawEsimPlan[] => {
  const $ = dom(page);
  const text = clean(page.text.replace(/\n/g, " "));
  const cov = text.match(/(?:across|covers?)\s+(over\s+)?(\d+)\s+countries(?:\s+in\s+([A-Z][a-z]+))?/i);
  const coverage = destination.type === "country" ? null : cov ? `${cov[2]}${cov[1] ? "+" : ""} countries${cov[3] ? ` in ${cov[3]}` : ""}` : null;
  const perks = ["Free eSIM included", "Flexible start date", "No hidden roaming charges"].filter((p) =>
    p === "Free eSIM included" ? /Complimentary eSIM/i.test(text) : p === "Flexible start date" ? /Flexible start date/i.test(text) : /no hidden charges/i.test(text),
  );
  const out: RawEsimPlan[] = [];
  $('div[role="radio"]').each((_, el) => {
    const card = $(el);
    const name = clean(card.find("h3").first().text());
    const m = name.match(/^(\d[\d,.]*)\s*(GB|MB|TB)\s+(\d+)\s*Days?\b(.*)$/i) ?? name.match(/^(Unlimited)()\s+(\d+)\s*Days?\b(.*)$/i);
    if (!m) return;
    const unlimited = /^unlimited$/i.test(m[1]);
    const unit = m[2].toUpperCase();
    const data = unlimited ? -1 : (num(m[1]) * (unit === "TB" ? 1000 : unit === "MB" ? 0.001 : 1));
    const days = Number(m[3]);
    const paid = clean(card.find("span.font-bold").last().text());
    const pm = paid.match(/^([A-Z]{3})\s*(\d[\d,]*(?:\.\d+)?)$/);
    if (!pm) return;
    const ribbon = clean(card.find("p.font-black").first().text());
    const bonus = m[4].trim() || (ribbon.match(/FREE\s+\d+\s*GB/i)?.[0] ?? "");
    out.push(
      esimPlan({
        title: `${unlimited ? "Unlimited" : `${data}GB`} / ${days} days`,
        coverage,
        data_gb: data,
        data_note: bonus ? `plus ${bonus.toLowerCase().replace(/^free/, "free")}` : null,
        validity_days: days,
        price: num(pm[2]),
        currency: pm[1],
        perks: [...perks, ...(bonus ? [`Bonus: ${bonus}`] : [])],
      }),
    );
  });
  return out;
};
