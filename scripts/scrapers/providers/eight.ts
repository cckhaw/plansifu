import { clean, contractMonths, dataGb, dom, plan, price } from "../parse-utils";
import type { PageData, RawPlan } from "../types";
import { defineProvider, t } from "./define";

/**
 * Both pages are script-free server-rendered HTML with one `article.card-plan` per plan
 * (`.card-plan__price-text` + `/mth`, `.card-plan__price-before` = crossed-out regular price).
 * The mobile page also has a "1 Year plans" tab priced per year (`/yr`): those cards are skipped, a plan's
 * monthly price is what is shown with `/mth`.
 */
function cards(page: PageData) {
  const $ = dom(page);
  return $("article.card-plan")
    .map((_, el) => {
      const c = $(el);
      const g = (sel: string) => clean(c.find(sel).first().text());
      const lis = c
        .find(".card-plan__detail")
        .map((_, li) => clean($(li).text()))
        .get()
        .filter(Boolean);
      return {
        network: g(".card-plan__network"),
        quota: g(".card-plan__quota"),
        name: g(".card-plan__name"),
        shown: price(g(".card-plan__price-text")),
        before: price(g(".card-plan__price-before")),
        monthly: /mth|month/i.test(g(".card-plan__price-duration")),
        badge: g(".promo-badge__text"),
        lis,
        href: c.find(".card-plan__details-buy-now a").first().attr("href"),
      };
    })
    .get();
}

type Card = ReturnType<typeof cards>[number];

/** When a regular price is crossed out, that is the plan's price and the shown one is a promotion. */
const regular = (c: Card) => (c.before && c.shown && c.before > c.shown ? c.before : c.shown);
const promo = (c: Card, extra: string[]) =>
  [...extra, c.before && c.shown && c.before > c.shown ? `$${c.shown}/mth` : ""].map(clean).filter(Boolean).join(" | ") || undefined;

export function parseEightMobile(page: PageData): RawPlan[] {
  return cards(page)
    .filter((c) => c.monthly && c.shown)
    .map((c) => {
      const sms = c.lis.map((l) => l.match(/^([\d,]+)\s+Local SMS/i)).find(Boolean);
      return plan({
        title: c.name,
        monthly_price: regular(c),
        data_gb: dataGb(c.quota) ?? dataGb(c.lis[0]),
        talktime_mins: c.lis.some((l) => /unlimited\*?\s+local talktime/i.test(l)) ? -1 : undefined,
        sms_count: sms ? Number(sms[1].replace(/,/g, "")) : undefined,
        contract_months: 0,
        features: c.lis.filter((l) => !/^(physical sim|see more)/i.test(l)).slice(0, 8),
        promotion_badge: promo(c, [c.badge]),
        affiliate_url: c.href,
      });
    });
}

/** Broadband cards: `.card-plan__quota` holds the plan name, `.card-plan__name` the term ("24-Month Mesh Plan"). */
export function parseEightBroadband(page: PageData): RawPlan[] {
  return cards(page)
    .filter((c) => c.monthly && c.shown)
    .map((c) =>
      plan({
        title: c.quota,
        monthly_price: regular(c),
        contract_months: contractMonths(c.name),
        features: [c.name, ...c.lis].slice(0, 8),
        promotion_badge: promo(c, [c.network, c.badge]),
        affiliate_url: c.href,
      }),
    );
}

export const eight = defineProvider("Eight", "SG", "https://www.eight.com.sg", [
  t.relay(t.post("https://www.eight.com.sg/mobile/", parseEightMobile)),
  t.relay(t.bb("https://www.eight.com.sg/broadband/", parseEightBroadband)),
]);
