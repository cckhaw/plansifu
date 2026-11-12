import { dom } from "../../scrapers/parse-utils";
import { esimPlan, type EsimParser, type RawEsimPlan } from "../types";

/**
 * Holafly (Astro). All plans are unlimited data, priced per number of days. The page is built from "islands"
 * (<astro-island props="..." opts="...">) whose props are serialised as [type, value] pairs (0 = scalar/object, 1 = array).
 * The island named PriceTableBody holds the displayed price table: rows of { days: "3 days", prices: [{currency, amount}, ...] }
 * with the price in every selectable currency. The currency the page currently shows is in `.product-content__currency`.
 * (The ProductPricing island lists every day count 1..90; the table is the curated set the page shows, so that is what we return.)
 */
function decode(v: unknown): unknown {
  if (Array.isArray(v) && v.length === 2 && typeof v[0] === "number") {
    const [t, x] = v as [number, unknown];
    if (t === 1 && Array.isArray(x)) return x.map(decode);
    if (x && typeof x === "object" && !Array.isArray(x)) return decode(x);
    return x;
  }
  if (v && typeof v === "object" && !Array.isArray(v)) return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, decode(x)]));
  return v;
}

export const holafly: EsimParser = (page) => {
  const $ = dom(page);
  const currency = $(".product-content__currency").first().text().trim().toUpperCase() || "USD";
  let rows: { days?: string; prices?: { currency?: string; amount?: string | number }[] }[] = [];
  $("astro-island").each((_, el) => {
    if (rows.length) return;
    let opts: { name?: string } = {};
    try {
      opts = JSON.parse($(el).attr("opts") ?? "{}") as { name?: string };
    } catch {
      return;
    }
    if (opts.name !== "PriceTableBody") return;
    try {
      const props = decode(JSON.parse($(el).attr("props") ?? "{}")) as { rows?: typeof rows };
      rows = props.rows ?? [];
    } catch {
      /* ignore */
    }
  });

  const text = page.text;
  const countries = /(\d+)\s+destinations included/i.exec(text);
  const coverage = countries ? `${countries[1]} destinations` : null;
  const perks: string[] = [];
  if (/5G networks where available/i.test(text)) perks.push("5G where available");
  if (/Wi-?Fi hotspot/i.test(text)) perks.push("Hotspot allowed");
  if (/Always On/i.test(text)) perks.push("Always On included");
  const dataOnly = /only comes with cellular data|does not include a local phone number/i.test(text);

  const out: RawEsimPlan[] = [];
  for (const r of rows) {
    const days = /(\d+)/.exec(r.days ?? "");
    const p = (r.prices ?? []).find((x) => (x.currency ?? "").toUpperCase() === currency);
    const amount = p ? Number(p.amount) : NaN;
    if (!days || !(amount > 0)) continue;
    out.push(
      esimPlan({
        title: `Unlimited / ${days[1]} days`,
        coverage,
        data_gb: -1,
        validity_days: Number(days[1]),
        price: amount,
        currency,
        voice_included: dataOnly ? false : null,
        sms_included: dataOnly ? false : null,
        phone_number: dataOnly ? false : null,
        perks,
      }),
    );
  }
  return out;
};
