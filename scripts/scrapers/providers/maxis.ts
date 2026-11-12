import { clean, contractMonths, dataGb, dom, plan, price, speedMbps } from "../parse-utils";
import type { PageData, RawPlan } from "../types";
import { defineProvider, t } from "./define";

/** Plan cards (`.cmp-plan-card`) of a Maxis page, skipping the carousel's cloned slides. */
function cards(page: PageData, keep: (card: ReturnType<ReturnType<typeof dom>>) => boolean) {
  const $ = dom(page);
  const out: ReturnType<typeof $>[] = [];
  $(".cmp-plan-card").each((_, el) => {
    const card = $(el);
    if (card.closest(".slick-cloned").length) return;
    if (keep(card)) out.push(card);
  });
  return out;
}

/** Regular (struck-through) price of a card and the discounted price shown next to it, if any. */
function prices(card: ReturnType<ReturnType<typeof dom>>): { regular: number | null; promo: number | null } {
  const struck = price(card.find(".prices s, .prices strike, .prices del").first().text());
  const shown = price(card.find(".price").first().text());
  if (struck !== null && shown !== null && shown !== struck) return { regular: struck, promo: shown };
  return { regular: shown ?? struck, promo: null };
}

/** Postpaid page: the principal-line carousel only (the supplementary-line carousel holds the "Member" plans). */
function parsePostpaid(page: PageData): RawPlan[] {
  return cards(page, (card) => {
    // The carousels sit in containers whose id says which line view they belong to.
    const view = card.parents().map((_, p) => (p as { attribs?: Record<string, string> }).attribs?.id ?? "").get().join(" ");
    return !/supplementary-line/.test(view);
  }).map((card) => {
    const { regular, promo } = prices(card);
    const benefitItems = card.find(".benefit-item").map((_, el) => clean(card.find(el).text())).get();
    const supp = benefitItems.find((b) => /supplementary line/i.test(b));
    const sticker = clean(card.find(".sticker").first().text());
    return plan({
      title: clean(card.find(".title-small").first().text()),
      monthly_price: regular,
      data_gb: dataGb(card.find(".plan-card-icon-comp").text()) ?? (/unlimited/i.test(card.find(".plan-card-icon-comp").text()) ? -1 : null),
      supplementary_line_price: supp ? (price(supp.replace(/^.*?(?=\bFrom\b)/i, "")) ?? undefined) : undefined,
      promotion_badge: promo !== null ? `RM${promo}/mth promo${sticker ? ` - ${sticker}` : ""}` : sticker || undefined,
      affiliate_url: card.find("a.btn-primary").first().attr("href"),
    });
  });
}

/** Home Fibre page: one card per speed. */
function parseBroadband(page: PageData): RawPlan[] {
  return cards(page, () => true).map((card) => {
    const { regular, promo } = prices(card);
    const speedText = clean(card.find(".title-big").first().text().replace(/\s+/g, ""));
    const name = clean(card.find(".title-small").first().text());
    const promoText = clean(card.find(".prices").first().parent().text());
    const months = promo !== null ? contractMonths(promoText.match(/first\s+\d+\s*months?/i)?.[0].replace(/first\s+/i, "")) : null;
    const sticker = clean(card.find(".sticker").first().text());
    return plan({
      title: [name, speedText].filter(Boolean).join(" "),
      monthly_price: regular,
      speed_mbps: speedMbps(speedText),
      data_gb: -1,
      promotion_badge:
        promo !== null ? `RM${promo}/mth${months ? ` for the first ${months} months` : ""}${sticker ? ` - ${sticker}` : ""}` : sticker || undefined,
      affiliate_url: card.find("a.btn-primary, a.btn").filter((_, a) => /get this/i.test(clean(card.find(a).text()))).first().attr("href"),
    });
  });
}

export const maxis = defineProvider("Maxis", "MY", "https://www.maxis.com.my", [
  t.post("https://www.maxis.com.my/en/mobile-plans/", parsePostpaid),
  t.bb("https://www.maxis.com.my/en/broadband/", parseBroadband),
]);
