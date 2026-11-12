import { clean, contractMonths, dom, jsonLd, plan, price, speedMbps, walkJson } from "../parse-utils";
import type { PageData, RawPlan } from "../types";
import { defineProvider, t } from "./define";

const PRICE_P = /^(?:U\.P\.\s*)?\$\d[\d,]*(?:\.\d+)?\s*\/\s*mth(?:\s+thereafter)?$/i;
const UNLIMITED = /^Unlimited\*?/i;

/**
 * Mobile plans page: every plan is a card carrying `data-card-anchor-index` with an <h3> price (the price you pay
 * now, often an intro price), then a "$x/mth thereafter" or "U.P. $x/mth" paragraph (the regular price), then the
 * plan name and its allowance lines. The page also holds two broadband cards (no <h3>), which are skipped here.
 */
function parseGomoMobile(page: PageData): RawPlan[] {
  const $ = dom(page);
  const out: RawPlan[] = [];
  $("[data-card-anchor-index]").each((_, el) => {
    const card = $(el);
    const now = price(card.find("h3").first().text());
    if (now === null) return; // broadband cards
    const ps = card.find("p").map((_, p) => clean($(p).text())).get().filter(Boolean);
    const stop = ps.findIndex((p) => /^(Limited time offers|Get)$/i.test(p));
    const body = stop >= 0 ? ps.slice(0, stop) : ps;
    const later = body.find((p) => PRICE_P.test(p));
    const rest = body.filter((p) => !PRICE_P.test(p));
    const name = rest[0];
    if (!name) return;
    const info = rest.slice(1);
    const regular = later ? price(later) : now;
    const dataLine = info.find((l) => /\d\s?(?:GB|TB)|^Unlimited\*?\s*SG/i.test(l));
    const callLine = info.find((l) => /\bmins?\b/i.test(l)) ?? "";
    const mins = callLine.match(/(\d[\d,]*|Unlimited\*?)\s*(?:local\s+)?mins?\b/i);
    const sms = callLine.match(/(\d[\d,]*)\s*SMS/i);
    const unlimitedBoth = /Unlimited\*?\s*local mins\s*\+\s*SMS/i.test(callLine);
    let data: number | undefined;
    if (dataLine) {
      if (UNLIMITED.test(dataLine)) data = -1;
      else {
        const m = dataLine.match(/(\d[\d,.]*)\s?(GB|TB)/i);
        if (m) data = Number(m[1].replace(/,/g, "")) * (/TB/i.test(m[2]) ? 1000 : 1);
      }
    }
    const dealText = clean(card.find("span").first().text());
    const deal = /\$/.test(dealText) ? "" : dealText;
    out.push(
      plan({
        title: `GOMO ${name}`,
        category: "mobile_postpaid",
        monthly_price: regular,
        data_gb: data,
        talktime_mins: mins ? (UNLIMITED.test(mins[1]) ? -1 : Number(mins[1].replace(/,/g, ""))) : undefined,
        sms_count: unlimitedBoth ? -1 : sms ? Number(sms[1].replace(/,/g, "")) : undefined,
        contract_months: 0,
        promotion_badge: later && regular !== now ? `${deal ? deal + ": " : ""}$${now}/mth intro price` : undefined,
        features: info.filter((l) => l !== dataLine && l !== callLine),
      }),
    );
  });
  return out;
}

/**
 * Broadband page: the plans are the schema.org Offers in the page's JSON-LD (name, price, "24-month" in the
 * description); the visible cards ("2-year contract" / "1-year contract") add the freebies and the member price.
 */
function parseGomoBroadband(page: PageData): RawPlan[] {
  const offers: { name: string; description: string; price: number }[] = [];
  for (const block of jsonLd(page))
    walkJson(block, (o) => {
      if (o["@type"] === "Offer" && typeof o.name === "string" && o.price !== undefined)
        offers.push({ name: o.name, description: String(o.description ?? ""), price: Number(o.price) });
    });
  const $ = dom(page);
  const cards = $("[data-card-anchor-index]")
    .map((_, el) => {
      const text = $(el).find("p, span, h3").map((_, n) => clean($(n).text())).get().filter(Boolean);
      return { months: contractMonths(text.find((l) => /contract/i.test(l))), text };
    })
    .get();
  return offers.map((o) => {
    const months = contractMonths(o.description);
    const card = cards.find((c) => c.months === months);
    const member = card?.text.find((l) => /for GOMO Mobile Customers/i.test(l));
    return plan({
      title: o.name,
      category: "broadband",
      monthly_price: o.price,
      speed_mbps: speedMbps(o.name) ?? speedMbps(o.description),
      contract_months: months ?? undefined,
      promotion_badge: member ? member.replace(/\.$/, "") : undefined,
      features: [...new Set(card?.text.filter((l) => /^FREE /i.test(l)))],
    });
  });
}

export const gomo = defineProvider("Gomo", "SG", "https://www.gomo.sg", [
  t.post("https://www.gomo.sg/personal/mobile/plans", parseGomoMobile),
  t.bb("https://www.gomo.sg/personal/broadband", parseGomoBroadband),
]);
