import { clean, dataGb, dom, plan, price, speedMbps } from "../parse-utils";
import type { PageData, RawPlan } from "../types";
import { defineProvider, t } from "./define";

/** Postpaid page (Webflow sliders). Principal-line cards and supplementary-line cards share a layout; only the latter carry `.supplementary`. */
function parsePostpaid(page: PageData): RawPlan[] {
  const $ = dom(page);
  const principal: { el: ReturnType<typeof $>; name: string }[] = [];
  const suppPrice = new Map<string, number>();
  $(".cd-price-slider-fao").each((_, el) => {
    const card = $(el);
    const name = clean(card.find(".plan-label").first().text());
    if (!name) return;
    if (card.find(".cd-fibre-price-ctn-2.supplementary").length) {
      // "From RM50/month" (discounted supplementary price) next to the struck-through regular price.
      const from = price(card.find(".cd-txt-big").first().text());
      if (from !== null && !suppPrice.has(name.toLowerCase())) suppPrice.set(name.toLowerCase(), from);
    } else principal.push({ el: card, name });
  });
  return principal.map(({ el: card, name }) => {
    const shown = price(card.find(".cd-txt-big").first().text());
    const struck = price(card.find(".strikethrough, .cd-text-strike, s, strike").first().text());
    // A struck-through price means the big price is a limited-time offer: the regular price is the struck one.
    const regular = struck !== null && shown !== null && struck > shown ? struck : shown;
    const promo = regular !== shown ? shown : null;
    const dataText = clean(card.find(".plan-label").first().parent().text().replace(name, ""));
    const offer = clean(card.find(".cd-cards-badge-txt-16, .cd-txt-label-s-3").first().text());
    const badges = [promo !== null ? `RM${promo}/mth limited-time offer` : "", offer && !/^limited/i.test(offer) ? offer : ""].filter(Boolean);
    const rebate = clean(card.find(".cd-pc-grid-lines-6").filter((_, l) => /port-in rebate/i.test($(l).text())).first().text());
    const suppLine = clean(card.find(".cd-pc-grid-lines-6").filter((_, l) => /supplementary/i.test($(l).text())).first().text());
    return plan({
      title: name,
      monthly_price: regular,
      data_gb: dataGb(dataText) ?? (/unlimited/i.test(dataText) ? -1 : null),
      supplementary_line_price: suppPrice.get(name.toLowerCase()),
      promotion_badge: badges.join(" - ") || undefined,
      features: [rebate, suppLine, "Unlimited calls"].filter((f) => f && (f !== "Unlimited calls" || /unlimited\s*calls/i.test(card.text()))),
      affiliate_url: card.find("a.w-button").first().attr("href"),
    });
  });
}

/** Home Fibre page: one card per speed, repeated for "existing postpaid customer" and "new customer" tabs. */
function parseFibre(page: PageData): RawPlan[] {
  const $ = dom(page);
  const out: RawPlan[] = [];
  $(".cd-card-outline-4").each((_, el) => {
    const card = $(el);
    const speedText = clean(card.find(".cd-home-fibre-card-txt-26").first().text());
    const speed = speedMbps(speedText);
    const struck = price(card.find(".cd-home-fibre-stroke-price").first().text());
    const shown = price(card.find(".home-fibre-plan-price").first().text());
    const regular = struck ?? shown;
    if (speed === null || regular === null) return;
    // The page repeats the cards for existing and new customers: keep the first of each speed.
    if (out.some((p) => p.speed_mbps === speed)) return;
    out.push(
      plan({
        title: `CelcomDigi Home Fibre ${speedText.replace(/\s+/g, "")}`,
        monthly_price: regular,
        speed_mbps: speed,
        data_gb: -1,
        promotion_badge: clean(card.find("[class*=label-best-seller] div, [class*=txt-label-s]").first().text()) || undefined,
        features: card
          .find(".cd-pc-grid-btm-ctn-10.white-bg .cd-pc-grid-lines-6")
          .map((_, l) => clean($(l).text()))
          .get()
          .filter((f) => f && !/rebate/i.test(f)),
        affiliate_url: undefined,
      }),
    );
  });
  return out;
}

/** 5G Home WiFi page: regular price struck through, offer price next to it. */
function parseHomeWifi(page: PageData): RawPlan[] {
  const $ = dom(page);
  const out: RawPlan[] = [];
  $(".cd-card-outline-2").filter((_, e) => $(e).find(".home-wifi-plan-price").length > 0).each((_, el) => {
    const card = $(el);
    const title = clean(card.find(".cd-home-fibre-card-txt-26-2").first().text());
    const struck = price(card.find(".cd-home-wifi-stroke-price").first().text());
    const shown = price(card.find(".home-wifi-plan-price").first().text());
    const regular = struck ?? shown;
    const promo = struck !== null && shown !== null && shown !== struck ? shown : null;
    // "5G speeds up to <old speed> <new speed>": the current speed is the highest one listed.
    const speeds = [...card.text().matchAll(/(\d[\d,.]*\s?(?:Gbps|Mbps))/gi)].map((m) => speedMbps(m[1])).filter((n): n is number => n !== null);
    const speed = /speeds? up to/i.test(card.text()) && speeds.length ? Math.max(...speeds) : null;
    const tag = clean(card.parent().find(".cd-cards-badge-txt-16").first().text());
    out.push(
      plan({
        title,
        monthly_price: regular,
        speed_mbps: speed,
        data_gb: /unlimited/i.test(card.text()) ? -1 : dataGb(card.text()),
        promotion_badge: promo !== null ? `RM${promo}/mth${tag ? ` - ${tag}` : ""}` : tag || undefined,
        features: card
          .find(".cd-pc-grid-lines-6, .cd-pc-viu-crossell h5")
          .map((_, l) => clean($(l).text()))
          .get()
          .filter((f) => f && !/^5G speeds up to/i.test(f)),
        affiliate_url: card.find("a.w-button").first().attr("href"),
      }),
    );
  });
  return out;
}

export const celcomdigi = defineProvider("CelcomDigi", "MY", "https://www.celcomdigi.com", [
  t.relay(t.post("https://www.celcomdigi.com/postpaid", parsePostpaid)),
  t.relay(t.bb("https://www.celcomdigi.com/fibre/home-fibre", parseFibre)),
  t.relay(t.bb("https://www.celcomdigi.com/fibre/home-wifi", parseHomeWifi)),
]);
