import { clean, dom } from "../../scrapers/parse-utils";
import type { PageData } from "../../scrapers/types";
import type { EsimDestination } from "../../../src/lib/esim-destinations";
import { esimPlan, type EsimParser, type RawEsimPlan } from "../types";

/**
 * BNESIM (Angular/Tailwind) renders each plan as a `button[aria-label="choose plan"]` row of three cells:
 * size ("5 GB" or "Unlimited GB"), duration ("30 days") and price ("4.49 EUR"), each with a grey caption
 * (Size / Duration / Price). The page loads on the "Expiring" tab; the "Non-expiring" list is a separate tab that is
 * not in the rendered HTML, so only the visible list is returned. Region pages (/plans/asia/, /plans/global/) use the
 * same rows; their coverage is not stated in the cards, so coverage is only set when the page names a country count.
 */
const num = (s: string) => Number(s.replace(/,/g, ""));

export const bnesim: EsimParser = (page: PageData, destination: EsimDestination): RawEsimPlan[] => {
  const $ = dom(page);
  const text = clean(page.text.replace(/\n/g, " "));
  const cov = text.match(/(\d+\+?)\s+countries/i);
  const coverage = destination.type === "country" ? null : cov ? `${cov[1]} countries` : null;
  const out: RawEsimPlan[] = [];
  $('button[aria-label="choose plan"]').each((_, el) => {
    const cells = $(el)
      .children("div.grid")
      .map((__, c) => {
        const cell = $(c).clone();
        cell.find("span.text-gray-500").remove();
        return clean(cell.text());
      })
      .get();
    if (cells.length < 3) return;
    const [size, dur, pr] = cells.slice(-3);
    const days = dur.match(/^(\d+)\s*days?$/i);
    const pm = pr.match(/^(\d[\d,]*(?:\.\d+)?)\s*([A-Z]{3})$/);
    const unlimited = /^unlimited/i.test(size);
    const gb = size.match(/^(\d[\d,.]*)\s*(GB|MB|TB)$/i);
    if (!days || !pm || (!unlimited && !gb)) return;
    const data = unlimited ? -1 : num(gb![1]) * (/TB/i.test(gb![2]) ? 1000 : /MB/i.test(gb![2]) ? 0.001 : 1);
    out.push(
      esimPlan({
        title: `${unlimited ? "Unlimited" : `${data}GB`} / ${Number(days[1])} days`,
        coverage,
        data_gb: data,
        validity_days: Number(days[1]),
        price: num(pm[1]),
        currency: pm[2],
      }),
    );
  });
  return out;
};
