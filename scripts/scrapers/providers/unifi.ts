import type { CheerioAPI } from "cheerio";
import { clean, dataGb, dom, plan, price, speedMbps } from "../parse-utils";
import type { PageData, RawPlan } from "../types";
import { defineProvider, t } from "./define";

type Sel = ReturnType<CheerioAPI>;
const text = (el: Sel) => clean(el.text());

/**
 * Broadband: each `.package-item[data-package]` card (the carousel also holds hidden template items without
 * `data-package`). The card shows the broadband-only price in `.latest-price.<id>-bbonly` and, next to it, the
 * price with the optional Netflix/Max bundle (not used here).
 */
function parseBroadband(page: PageData): RawPlan[] {
  const $ = dom(page);
  const out: RawPlan[] = [];
  $(".package-item[data-package]").each((_, el) => {
    const card = $(el);
    if (card.hasClass("slick-cloned")) return;
    const id = card.attr("data-package")!;
    const speed = speedMbps(text(card.find(".card-speed").first()));
    const priceEl = card.find(`.latest-price.${id.replace("package", "")}-bbonly`).first();
    const monthly = price(`RM${text(priceEl)}`);
    if (speed === null || monthly === null) return;
    const rrp = text(card.find(".price-slashed").first());
    const offer = text(card.find(".limited-time-offer, .free-forever").first());
    const label = text(card.find(".card-label").first());
    const included = card
      .find(".card-included .included-item")
      .map((_, e) => text($(e)))
      .get()
      .filter((s) => s && s !== " ");
    const contract = text(card.find(".contract").first());
    const months = contract.match(/(\d+)\s*months/i);
    out.push(
      plan({
        title: `${label || "Unifi Home"} ${text(card.find(".card-speed").first())}`,
        monthly_price: monthly,
        speed_mbps: speed,
        contract_months: months ? Number(months[1]) : 24,
        features: included,
        promotion_badge: [offer, rrp && `${rrp.replace(/\/mth$/, "")} regular`].filter(Boolean).join(" · ") || undefined,
      }),
    );
  });
  return out;
}

/**
 * Postpaid: `.package-item` cards that contain `.package-pricing`. Each card has a default variant
 * (`data-option-toggle="default"`, or no toggle at all) and an optional "Netflix" bundle variant; only the default is a plan.
 */
function parsePostpaid(page: PageData): RawPlan[] {
  const $ = dom(page);
  const out: RawPlan[] = [];
  $(".package-item").each((_, el) => {
    const card = $(el);
    if (!card.find(".package-pricing").length) return;
    const isDefault = (_: number, e: any) => {
      const v = $(e).attr("data-option-toggle");
      return v === undefined || v === "default";
    };
    const title = text(card.find(".package-header-text .speed").filter(isDefault).first());
    const monthly = price(`RM${text(card.find(".latest-price").filter(isDefault).first())}`);
    const dataText = text(card.find(".air-bandwidth").filter(isDefault).first());
    if (!title || monthly === null) return;
    const promoData = text(card.find(".air-bandwidth-promo").filter(isDefault).first());
    const features = card
      .find(".included .seg-one .list-item")
      .filter(isDefault)
      .map((_, e) => text($(e)))
      .get();
    const noContract = features.some((f) => /no contract/i.test(f));
    const offer = text(card.find(".limited-time-offer, .offer-title, .promo-title").first());
    out.push(
      plan({
        title,
        monthly_price: monthly,
        data_gb: dataGb(dataText) ?? (/unlimited/i.test(dataText) ? -1 : null),
        contract_months: noContract ? 0 : undefined,
        talktime_mins: features.some((f) => /unlimited calls/i.test(f)) ? -1 : undefined,
        features: features.filter((f) => !/no contract|unlimited calls/i.test(f)),
        promotion_badge: promoData ? promoData.replace(/\s+/g, " ") : offer || undefined,
      }),
    );
  });
  return out;
}

/** Prepaid: the long-term and short-term passes are `.item-card`s (name, data, price, "what's included" list). */
function parsePrepaid(page: PageData): RawPlan[] {
  const $ = dom(page);
  const out: RawPlan[] = [];
  $(".item-card").each((_, el) => {
    const card = $(el);
    if (card.hasClass("slick-cloned")) return;
    const title = text(card.find(".product-name").first());
    const monthly = price(text(card.find(".product-pricing").first()));
    if (!title || monthly === null) return;
    const items = card
      .find(".segment-one .included-item p")
      .map((_, e) => text($(e)))
      .get();
    const offer = card
      .find(".segment-two .included-item p")
      .map((_, e) => text($(e)))
      .get()
      .join("; ");
    out.push(
      plan({
        title,
        monthly_price: monthly,
        data_gb: dataGb(text(card.find(".product-bandwidth").first())),
        contract_months: 0,
        talktime_mins: items.some((f) => /unlimited calls/i.test(f)) ? -1 : undefined,
        features: items.filter((f) => !/unlimited calls/i.test(f)),
        promotion_badge: offer || undefined,
      }),
    );
  });
  return out;
}

export const unifi = defineProvider("Unifi", "MY", "https://unifi.com.my", [
  t.bb("https://unifi.com.my/fibre-broadband", parseBroadband),
  t.post("https://unifi.com.my/mobile/postpaid", parsePostpaid),
  t.pre("https://unifi.com.my/mobile/prepaid", parsePrepaid),
]);
