import { dom, clean } from "../../scrapers/parse-utils";
import { esimPlan, type EsimParser, type RawEsimPlan } from "../types";

/**
 * gogoroaming.my category pages (WooCommerce + Elementor "eael" product grid): `li.product` cards with the product
 * title and a "From RM x" price (the cheapest variant). The listing does NOT show the variants (data / validity), so:
 *  - the plan reported is the cheapest option, with data read from the title ("3GB-50GB" -> 3GB, "5GB/day" -> 5GB per day,
 *    "(Daily) Unlimited" -> unlimited, per day) and flagged in `data_note` as a "from" price;
 *  - validity is never stated on the listing, so it stays null;
 *  - products whose title gives no data figure (or mixes a Daily and a Total range) are skipped, nothing is guessed.
 * A category page covers several countries, so products are filtered to the requested destination by title.
 */

const CURRENCY: Record<string, string> = { RM: "MYR", MYR: "MYR", S$: "SGD", SGD: "SGD", US$: "USD", $: "USD", USD: "USD" };

/** Words in a product title that name a destination (country aliases and region words). */
const COUNTRY: Record<string, RegExp> = {
  japan: /\bjapan\b/i,
  "south-korea": /\bkorea\b/i,
  thailand: /\bthailand\b/i,
  indonesia: /\b(indonesia|bali)\b/i,
  vietnam: /\bvietnam\b/i,
  china: /\bchina\b/i,
  taiwan: /\btaiwan\b/i,
  "hong-kong": /\bhong\s*kong\b/i,
  singapore: /\bsingapore\b/i,
  malaysia: /\bmalaysia\b/i,
  australia: /\baustralia\b/i,
  "united-states": /\b(usa|united states)\b|(?<!south )\bamerica\b/i,
  "united-kingdom": /\b(uk|united kingdom|britain)\b/i,
};
const REGION: Record<string, RegExp> = {
  europe: /\beurope\b|\beu\s?\d+\b/i,
  asia: /\basia\b|\bsea\s?\d+\b/i,
  global: /\bworldwide\b|\bglobal\b/i,
};
/** Any title that is clearly multi-country. */
const MULTI = /\b(europe|asia|worldwide|global|southeast|sea\s?\d+|eu\s?\d+|balkan|caucasus)\b|\b\d+\s+countries\b|\bmulti\b/i;

const num = (s: string) => Number(s.replace(/,/g, ""));
const unit = (n: number, u: string) => (/tb/i.test(u) ? n * 1000 : /mb/i.test(u) ? n / 1000 : n);
const gbText = (n: number) => `${Number.isInteger(n) ? n : +n.toFixed(2)}GB`;

function matchesDestination(name: string, key: string, type: string): boolean {
  const t = name.replace(/south america/gi, "");
  if (type === "country") {
    const re = COUNTRY[key];
    return !!re && re.test(t);
  }
  const re = REGION[key];
  return !!re && re.test(t);
}

/** "Asia 14 Countries (Multi Regions)" -> "Asia 14 Countries"; a "(A I B I C)" list is appended when the title has one. */
function coverageOf(name: string): string {
  const region = name.match(/\b(?:(?:central|balkan|southeast)\s+)?(?:europe|asia)(?:\s+\d+)?(?:\s+countries)?|\beu\s?\d+(?:\s+\w+)?|\bsea\s?\d+\b|\b(?:worldwide|global)\b[^()]*?\d+\s+countries(?:\s*&\s*regions)?/i);
  const list = name.match(/\(([^()]*\bI\b[^()]*)\)/);
  const countries = list && !/\b(daily|total)\b|GB/i.test(list[1]) ? list[1].split(/\s+I\s+/).map(clean).join(", ") : "";
  return clean([region?.[0], countries].filter(Boolean).join(": ")).slice(0, 80);
}

interface Data { gb: number; note: string; unlimited?: boolean }

function dataFromTitle(name: string): Data | null {
  const daily = /\(\s*daily\s*\)|\bdaily\b/i.test(name);
  const total = /\btotal\b/i.test(name);
  if (daily && total) return null; // Daily and Total options mixed: the "from" price could be either
  // Daily 1GB - 3GB / 5GB/day
  const perDay = name.match(/(\d+(?:\.\d+)?)\s*(GB|MB)\s*(?:\/\s*day|per day)/i);
  if (perDay) return { gb: unit(num(perDay[1]), perDay[2]), note: `${perDay[1]}${perDay[2].toUpperCase()} per day (price is per day, "from")` };
  if (daily) {
    const r = name.match(/daily\s*(\d+(?:\.\d+)?)\s*(GB|MB)\s*[-–]\s*(\d+(?:\.\d+)?)\s*(GB|MB)/i);
    if (r) return { gb: unit(num(r[1]), r[2]), note: `${r[1]}${r[2].toUpperCase()} per day (price is per day, "from"; daily options up to ${r[3]}${r[4].toUpperCase()})` };
    if (/unlimited/i.test(name)) return { gb: -1, unlimited: true, note: "Unlimited data per day (price is per day, \"from\")" };
    return null;
  }
  // 3GB-50GB, 3GB - 30GB, 15GB/50GB: several options, the "from" price is for the smallest
  const range = name.match(/(\d+(?:\.\d+)?)\s*(GB|MB)?\s*[-–\/]\s*(\d+(?:\.\d+)?)\s*(GB|MB)/i);
  if (range) {
    const u1 = range[2] ?? range[4];
    return { gb: unit(num(range[1]), u1), note: `"From" price: smallest of the ${range[1]}-${range[3]}${range[4].toUpperCase()} options` };
  }
  const single = name.match(/(\d+(?:\.\d+)?)\s*(GB|TB)\b/i);
  if (single) return { gb: unit(num(single[1]), single[2]), note: null as unknown as string };
  return null;
}

export const gogoroaming: EsimParser = (page, destination) => {
  const $ = dom(page);
  const out: RawEsimPlan[] = [];

  $("li.product").each((_, el) => {
    const card = $(el);
    const name = clean(card.find(".eael-product-title h2, .eael-product-title, h2.woocommerce-loop-product__title").first().text()).replace(/[【】]/g, " ");
    if (!name) return;
    const cleanName = clean(name.replace(/\b(esim)\b\s*/i, ""));

    if (!matchesDestination(cleanName, destination.key, destination.type)) return;

    // Price actually charged: the sale price (<ins>) when the list price is struck through, else the single price.
    const priceBox = card.find(".eael-product-price, .price").first();
    const amount = priceBox.find("ins .amount").first().length ? priceBox.find("ins .amount").first() : priceBox.find(".amount").first();
    const sym = clean(amount.find(".woocommerce-Price-currencySymbol").text());
    const value = num(clean(amount.text()).replace(sym, "").replace(/[^\d.,]/g, ""));
    const currency = CURRENCY[sym.toUpperCase()];
    if (!(value > 0) || !currency) return;

    const d = dataFromTitle(cleanName);
    if (!d) return;

    const multi = MULTI.test(cleanName) || (destination.type === "country" && Object.entries(COUNTRY).filter(([, re]) => re.test(cleanName)).length > 1);
    const perks: string[] = [];
    if (/\b5G\b/.test(cleanName)) perks.push("5G");

    const title = d.unlimited ? "Unlimited / per day" : /per day/.test(d.note ?? "") ? `${gbText(d.gb)} / per day` : `${gbText(d.gb)} (from price)`;
    out.push(
      esimPlan({
        title,
        coverage: multi ? coverageOf(cleanName) || null : null,
        data_gb: d.gb,
        data_note: d.note || null,
        validity_days: null,
        price: value,
        currency,
        perks,
      }),
    );
  });
  return out;
};
