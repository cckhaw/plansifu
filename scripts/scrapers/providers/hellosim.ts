import { clean, dataGb, dom, plan, price } from "../parse-utils";
import type { PageData, RawPlan } from "../types";
import { defineProvider, t } from "./define";

/**
 * HelloSIM data page: Bootstrap cards `.package-card` (heading = `<p>BEST</p><h3>35</h3>`, bullet list in
 * `.package-card-features`, `.package-card-price` + `.package-card-duration`). The /sim-packs page has no such cards
 * (a RM0 starter SIM table), so the same parser returns nothing there.
 * data_gb is the first allowance in the bullets (the "Total Internet" line when the card has one).
 */
function parseHelloSim(page: PageData): RawPlan[] {
  const $ = dom(page);
  const out: RawPlan[] = [];
  $(".package-card").each((_, el) => {
    const card = $(el);
    const p = price(card.find(".package-card-price").first().text());
    const title = clean(card.find(".package-card-heading-text").first().text().replace(/\s+/g, ""));
    if (p === null || !title) return;
    const bullets = card
      .find(".package-card-features li")
      .map((__, li) => clean($(li).text()))
      .get()
      .filter(Boolean);
    const duration = clean(card.find(".package-card-duration").first().text());
    out.push(
      plan({
        title,
        monthly_price: p,
        data_gb: dataGb(bullets.find((b) => dataGb(b) !== null)),
        contract_months: 0,
        features: [...bullets, ...(duration ? [`Valid ${duration}`] : [])].slice(0, 8),
      }),
    );
  });
  return out;
}

export const hellosim = defineProvider("HelloSIM", "MY", "https://hellosim.com.my", [
  t.expectEmpty(t.pre("https://hellosim.com.my/sim-packs", parseHelloSim)),
  t.pre("https://hellosim.com.my/data", parseHelloSim),
]);
