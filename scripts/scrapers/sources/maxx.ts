import { clean, dataGb, dom, plan, price } from "../parse-utils";
import type { PageData, RawPlan, ScrapeTarget } from "../types";

/**
 * Maxx's home page (same situation as M1: a bot wall in CI, so it is imported from a real browser).
 * Each plan is a `.plans-container .box`: a heading ("TRUE 5G"), the data headline, roaming allowances, a price and an
 * expandable "Also comes with" list. Plans have no name, so the title is built from the data. Maxx SIM-only plans
 * renew every 30 days with no contract.
 */
export function parseMaxx(page: PageData): RawPlan[] {
  const $ = dom(page);
  const out: RawPlan[] = [];
  const seen = new Set<string>();
  $(".plans-container .box").each((_, el) => {
    const box = $(el);
    const dataText = clean(box.find(".plan-data").first().text());
    const data = dataGb(dataText);
    const monthly = price(box.find(".bottom-wrap .price").first().text());
    if (data === null || monthly === null) return;

    const roaming = box
      .find(".plan-features .promo p")
      .map((_, p) => clean($(p).text()))
      .get()
      .filter(Boolean);
    const extras = box
      .find(".expanded-features li")
      .map((_, li) => clean($(li).text()))
      .get()
      .filter(Boolean);
    const out30 = extras.find((x) => /local outgoing calls/i.test(x));
    const sms = extras.find((x) => /local sms/i.test(x));
    const title = `Maxx ${dataText}`;
    if (seen.has(title.toLowerCase())) return;
    seen.add(title.toLowerCase());

    // Ribbon over the card ("BEST SELLER!", "NEW! PHONE DEALS") and promo lines such as "6 Months Free with Phone".
    const ribbon = clean(box.children("div[style*='absolute']").first().text());
    const promo = box
      .find(".bottom-wrap")
      .children("p, div")
      .map((_, n) => clean($(n).text()))
      .get()
      .find((t) => /free|off|rebate/i.test(t) && t.length < 60);

    out.push(
      plan({
        title,
        monthly_price: monthly,
        data_gb: data,
        talktime_mins: Number(out30?.match(/([\d,]+)\s*mins/i)?.[1]?.replace(/,/g, "")) || undefined,
        sms_count: Number(sms?.match(/(\d[\d,]*)\s*Local SMS/i)?.[1]?.replace(/,/g, "")) || undefined,
        contract_months: 0,
        features: [clean(box.find(".plan-name").first().text()), ...roaming, ...extras.filter((x) => /IDD|incoming|auto-renews/i.test(x))].filter(Boolean).slice(0, 6),
        promotion_badge: [ribbon, promo].filter(Boolean).join(" | ") || undefined,
      }),
    );
  });
  return out;
}

export const MAXX_TARGETS: ScrapeTarget[] = [{ url: "https://maxxonline.sg/", category: "mobile_postpaid", parse: parseMaxx }];
