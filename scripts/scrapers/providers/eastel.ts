import { clean, dataGb, dom, plan, price } from "../parse-utils";
import type { PageData, RawPlan } from "../types";
import { defineProvider, t } from "./define";

/**
 * Eastel mobile-plan page: Elementor HTML blocks with one `.plan-card` per plan (monthly plans and one-time packs).
 * Each card: image alt = plan code ("EZ35 Plan"), `.plan-features li .text` lines, `.price-btn` = price.
 * Boosters (`.booster*` / "Only for ..." add-ons) are a separate section and are not read. Cards without a price
 * ("Coming Soon") are skipped.
 */
function parseEastel(page: PageData): RawPlan[] {
  const $ = dom(page);
  const out: RawPlan[] = [];
  $(".plan-card").each((_, el) => {
    const card = $(el);
    const p = price(card.find(".price-btn").first().text());
    if (p === null) return;
    const feats = card
      .find(".plan-features li")
      .map((__, li) => clean($(li).find(".text").text() || $(li).text()))
      .get()
      .filter(Boolean);
    const validity = clean(card.find(".plan-features li.validity .text").text()) || feats.find((f) => /^\d+\s*days?$/i.test(f)) || "";
    const internet = feats.find((f) => /internet/i.test(f) && /\d\s?(GB|MB|TB)/i.test(f));
    const data = dataGb(internet);
    const alt = clean(card.find(".plan-image img").first().attr("alt")).replace(/\s*plan$/i, "");
    const title = alt || (data && data > 0 ? `Eastel ${data}GB ${validity}` : "");
    if (!title) return;
    const sms = feats.find((f) => /\bSMS\b/i.test(f))?.match(/(\d+)\s*SMS/i);
    const calls = feats.find((f) => /minutes?\s+call/i.test(f))?.match(/(\d+)\s*minutes?/i);
    const footer = clean(card.find(".plan-footer").text());
    out.push(
      plan({
        title,
        monthly_price: p,
        data_gb: data,
        talktime_mins: calls ? Number(calls[1]) : undefined,
        sms_count: sms ? Number(sms[1]) : undefined,
        contract_months: 0,
        features: [
          ...feats.filter((f) => f !== internet && !/^\d+\s*SMS$/i.test(f)),
          ...(footer.match(/High Speed Internet can be carried forward/i) ? ["Data can be carried forward"] : []),
        ].slice(0, 8),
      }),
    );
  });
  return out;
}

export const eastel = defineProvider("Eastel", "MY", "https://eastel.com.my", [
  t.pre("https://eastel.com.my/mobile-plan/", parseEastel),
]);
