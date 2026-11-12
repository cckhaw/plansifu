import { clean, dataGb, dom, plan, price } from "../parse-utils";
import type { PageData, RawPlan } from "../types";
import { defineProvider, t } from "./define";

/**
 * CMLink Malaysia plans page: one `a.package_data_list` card per plan (Vue-rendered, tabs Monthly / Multi-Month / Travel).
 * Card: `.package_title .size` = data, `.package_money_size` + `.unit` ("/ mth", "/ 3mths", "/ 7Days") = price and period,
 * `.month_fee` = struck-through regular price (when present the big price is a discount), `.preferential_list` = bullets.
 * Only per-month plans and fixed-day packs are returned: a multi-month bundle ("RM60 / 3mths") has no per-month price
 * on the page, so it is skipped rather than divided.
 */
function parseCmlinkMy(page: PageData): RawPlan[] {
  const $ = dom(page);
  const out: RawPlan[] = [];
  $(".package_data_list").each((_, el) => {
    const card = $(el);
    const sizeText = clean(card.find(".package_title .size").first().text());
    const data = /unlimited/i.test(sizeText) ? -1 : dataGb(sizeText);
    const shown = Number(clean(card.find(".package_money_size").first().text()));
    const unit = clean(card.find(".package_money .unit").first().text()).replace(/^\//, "").trim();
    if (!Number.isFinite(shown) || shown <= 0 || data === null) return;
    const bullets = card
      .find(".preferential_list")
      .map((__, li) => clean($(li).text()))
      .get()
      .filter(Boolean);
    const regular = price(card.find(".month_fee").first().text());
    const days = unit.match(/^(\d+)\s*days?$/i);
    const monthly = /^(mth|month)s?$/i.test(unit);
    if (!monthly && !days) return; // "/ 3mths" etc.: not a per-month price
    const sms = bullets.map((b) => b.match(/(\d+)\s*(?:pcs\s*)?[A-Za-z ]*SMS/i)).find(Boolean);
    const size = data === -1 ? "Unlimited" : `${data}GB`;
    const discounted = regular !== null && regular > shown;
    out.push(
      plan({
        title: monthly ? `${size} Monthly Plan` : `${size} ${days![1]}-Day Plan`,
        monthly_price: discounted ? regular : shown,
        data_gb: data,
        sms_count: sms ? Number(sms[1]) : undefined,
        contract_months: 0,
        promotion_badge: discounted ? `Now RM${shown}/${monthly ? "mth" : unit}` : undefined,
        features: [...bullets, ...(days ? [`Valid ${days[1]} days`] : [])].slice(0, 8),
      }),
    );
  });
  return out;
}

export const cmlinkMy = defineProvider("CMLink", "MY", "https://my.cmlink.com/en/", [
  t.pre("https://my.cmlink.com/en/plans/", parseCmlinkMy),
]);
