import type { CheerioAPI } from "cheerio";
import { clean, dataGb, dom, plan, price, speedMbps } from "../parse-utils";
import type { PageData, RawPlan } from "../types";
import { defineProvider, t } from "./define";

type Sel = ReturnType<CheerioAPI>;
const text = (el: Sel) => clean(el.text());

/**
 * Postpaid (individual tab, `#postpaid_plans_container`): one `.plan_cards_postpaid` per plan.
 * The page does NOT show the monthly price as text (it is baked into a promo video). The number at the end of the
 * plan name is the regular monthly price in RM ("ULTRA Postpaid 68" = RM68): checked against the video frames, which
 * show "RM68" struck out with the port-in price (RM58 = RM10 off) below it. The port-in offer goes in the badge.
 * The Family plan is a separate tab/card without its own price on this page, so it is not read.
 */
function parsePostpaid(page: PageData): RawPlan[] {
  const $ = dom(page);
  const out: RawPlan[] = [];
  $("#postpaid_plans_container .plan_cards_postpaid").each((_, el) => {
    const card = $(el);
    const header = card.children("div").not(".absolute").first();
    const name = text(header.children("p").first());
    const m = name.match(/\b(\d{2,3})$/);
    if (!name || !m) return;
    const features = card
      .find("p.min-w-0, li")
      .map((_, e) => text($(e)))
      .get()
      .filter(Boolean);
    const subline = text(card.find(".subline").first());
    out.push(
      plan({
        title: name,
        monthly_price: Number(m[1]),
        data_gb: dataGb(text(header.children("h2").first())),
        talktime_mins: features.some((f) => /unlimited local calls/i.test(f)) ? -1 : undefined,
        features: features.filter((f) => !/^unlimited local calls$/i.test(f)),
        promotion_badge: subline || undefined,
        affiliate_url: card.find("a").filter((_, a) => /^buy now$/i.test(text($(a)))).first().attr("href"),
      }),
    );
  });
  return out;
}

/** Prepaid data plans: `#plan-data .plan_cards`; header = name, data, speed, "RMxx/30 Days". */
function parsePrepaid(page: PageData): RawPlan[] {
  const $ = dom(page);
  const out: RawPlan[] = [];
  $("#plan-data .plan_cards").each((_, el) => {
    const card = $(el);
    const header = card.children("div").not(".absolute").first();
    const baseName = text(header.children("p").first());
    const dataText = text(header.children("h1").first());
    // Some lines share one name across data sizes ("ULTRA Weekly" 10GB / 20GB): add the size so the plans stay distinct.
    const name = baseName && !/\d/.test(baseName) && dataText ? `${baseName} ${dataText}` : baseName;
    const priceText = text(header.children("p").last());
    const monthly = price(priceText);
    if (!name || monthly === null) return;
    const features = card
      .children("div")
      .not(header)
      .find("span")
      .map((_, e) => clean($(e).contents().map((_, n) => $(n).text()).get().join(" ")))
      .get()
      .filter(Boolean);
    const validity = priceText.match(/\/\s*(\d+\s*Days?)/i);
    out.push(
      plan({
        title: name,
        monthly_price: monthly,
        data_gb: dataGb(dataText),
        contract_months: 0,
        talktime_mins: features.some((f) => /unlimited calls/i.test(f)) ? -1 : undefined,
        features: [
          ...(validity ? [`${validity[1]} validity`] : []),
          text(header.children("div").first()),
          ...features.filter((f) => !/^unlimited calls$/i.test(f)),
        ].filter(Boolean),
        affiliate_url: card.find("a").filter((_, a) => /^buy now$/i.test(text($(a)))).first().attr("href"),
      }),
    );
  });
  return out;
}

const strip = (html: unknown) => clean(String(html ?? "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/[​ ]/g, " "));

/**
 * Broadband pages (fibre and wireless): each card carries its own JSON in `data-plan-detail`
 * (name, current price, struck-out price, key features). The struck-out price is the regular price; the current
 * price goes in the badge. Bundles with a streaming subscription ("... x sooka Premium") strike out the sum of the
 * parts, which is not a regular price for the plan, so their current price is used.
 */
function parseBroadband(page: PageData): RawPlan[] {
  const $ = dom(page);
  const out: RawPlan[] = [];
  $(".card-detail-plan[data-plan-detail]").each((_, el) => {
    let d: any;
    try {
      d = JSON.parse($(el).attr("data-plan-detail")!);
    } catch {
      return;
    }
    const name = clean(d.planShortName);
    const current = price(`RM${d.currentPrice}`);
    const slashed = price(strip(d.slashedPrice));
    if (!name || current === null) return;
    const bundle = / x /i.test(name);
    const monthly = slashed !== null && !bundle ? slashed : current;
    const features: string[] = [
      ...(d.planValueTab ?? []).map((v: any) => strip(v?.leftColText)),
      ...(d.keyFeatures ?? []).map((k: any) => strip(k?.keyFeatureDesc)),
    ].filter(Boolean);
    const speed = speedMbps(name) ?? speedMbps(String(d.planID ?? ""));
    const unlimited = features.some((f) => /unlimited/i.test(f));
    out.push(
      plan({
        title: name,
        monthly_price: monthly,
        speed_mbps: speed ?? undefined,
        data_gb: unlimited ? -1 : undefined,
        features,
        promotion_badge:
          monthly !== current
            ? `RM${current}/mth promo price`
            : bundle && slashed !== null
              ? `Bundle value ${strip(d.slashedPrice)}/mth, now RM${current}/mth`
              : undefined,
        affiliate_url: typeof d.rightCtaPath === "string" && /^https?:/.test(d.rightCtaPath) ? d.rightCtaPath : undefined,
      }),
    );
  });
  return out;
}

export const umobile = defineProvider("U Mobile", "MY", "https://www.u.com.my", [
  t.post("https://www.u.com.my/en/personal/mobile-plans/postpaid/postpaid-plans#postpaid-plans", parsePostpaid),
  t.pre("https://www.u.com.my/en/personal/mobile-plans/prepaid/data-plans", parsePrepaid),
  // The /broadband hub only has promo banners; the plan cards live on these two pages.
  t.bb("https://www.u.com.my/en/personal/broadband/fibre", parseBroadband),
  t.bb("https://www.u.com.my/en/personal/broadband/wireless", parseBroadband),
]);
