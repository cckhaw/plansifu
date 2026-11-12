import { clean, dataGb, dom, plan, price } from "../parse-utils";
import type { PageData, RawPlan } from "../types";
import { defineProvider, t } from "./define";

/**
 * The Epik+ page has two server-rendered blocks: plan cards (`article.epik-plans__card`: data amount and an
 * "as low as RM x/mth" price) and a comparison table whose column heads carry the plan name (logo alt) and the
 * regular monthly price (`.epik-compare__plan-price`). The regular price and name come from the comparison table, the
 * "as low as" price becomes the promotion badge. Read from the captured DOM because the price digits are separate
 * text nodes that `innerText` misses.
 */
function epik(page: PageData): RawPlan[] {
  const $ = dom(page);
  const out: RawPlan[] = [];

  const cards = $("article.epik-plans__card")
    .map((_, a) => {
      const card = $(a);
      const name = clean(card.find("img.epik-plans__logo").attr("alt")) || clean(card.attr("aria-label")).replace(/\s*plan.*$/i, "");
      return {
        name,
        data: clean(card.find(".epik-plans__data-amount").first().text()),
        low: clean(card.find(".epik-plans__price-amount").first().text()),
        badge: clean(card.find(".epik-plans__badge").first().text()),
        features: card
          .find(".epik-plans__feature-item")
          .map((_, li) => clean($(li).text()))
          .get()
          .filter(Boolean),
        yearly: clean(card.find(".epik-plans__yearly-value-text").first().text()),
      };
    })
    .get();

  const table = $("table.epik-compare__table").first();
  const heads = table.find("thead th.epik-compare__head");
  const dataRow = table.find("tbody tr").filter((_, r) => /5g|data/i.test(clean($(r).find("th").first().text()))).first();
  heads.each((i, th) => {
    const name = clean($(th).find("img").attr("alt"));
    const monthly = price($(th).find(".epik-compare__plan-price").text());
    if (!name || monthly === null) return;
    const card = cards.find((c) => c.name.toLowerCase() === name.toLowerCase());
    const dataText = clean(dataRow.find("td").eq(i).text()) || card?.data;
    const low = card?.low ? Number(card.low) : null;
    out.push(
      plan({
        title: name,
        monthly_price: monthly,
        data_gb: dataGb(dataText ?? card?.data),
        contract_months: 0,
        talktime_mins: card?.features.some((f) => /unlimited calls/i.test(f)) ? -1 : undefined,
        promotion_badge: [card?.badge, low !== null && low < monthly ? `As low as RM${low}/mth` : ""].filter(Boolean).join(" - ") || undefined,
        features: card?.features.slice(0, 6),
      }),
    );
  });
  return out;
}

export const tunetalk = defineProvider("TuneTalk", "MY", "https://www.tunetalk.com", [
  t.pre("https://www.tunetalk.com/prepaid/epik-plans/", epik),
]);
