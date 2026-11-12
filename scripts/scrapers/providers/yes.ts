import type { CheerioAPI } from "cheerio";
import { clean, dataGb, dom, plan, price } from "../parse-utils";
import type { PageData, RawPlan } from "../types";
import { defineProvider, t } from "./define";

type Sel = ReturnType<CheerioAPI>;
const text = (el: Sel) => clean(el.text());
const isUncapped = (s: string) => /uncapped\s+(?:5g|data)/i.test(s) || /^uncapped data$/i.test(s);

/** Data allowance from a card: the headline ("150GB" / "Uncapped Data") or the first feature that states it. */
function cardData(headline: string, features: string[]): number | null {
  const fromHeadline = dataGb(headline);
  if (fromHeadline !== null) return fromHeadline;
  const first = features.find((f) => /\bdata\b/i.test(f));
  if (!first) return null;
  if (isUncapped(headline) || isUncapped(first)) return -1;
  return dataGb(first);
}

const bullets = (card: Sel, $: CheerioAPI) =>
  card
    .find("li")
    .map((_, e) => text($(e)).replace(/NEW$/, "").trim())
    .get()
    .filter(Boolean);

/** Page-level extra-line price: "Infinite Supplementary Line  Only RM20 /mth". */
function supplementaryPrice(page: PageData): number | undefined {
  const m = page.text.replace(/\s+/g, " ").match(/Supplementary Line Only RM\s?(\d+(?:\.\d+)?)/i);
  return m ? Number(m[1]) : undefined;
}

/**
 * Postpaid: `.post-card`s, in two tab panes (No Contract / With Contract). A card with a "<n>-month contract"
 * bullet is the contract variant: named "<plan> (<n>-month contract)". Supplementary Line is not a `.post-card`.
 * The headline price may be a promo (e.g. RM20 for 6 months) with the regular price in `p.plan-ye-ai`.
 */
function parsePostpaid(page: PageData): RawPlan[] {
  const $ = dom(page);
  const extra = supplementaryPrice(page);
  const out: RawPlan[] = [];
  $(".post-card").each((_, el) => {
    const card = $(el);
    const name = text(card.find(".post-card-title").first());
    const h1 = card.find("h1").first();
    const regular = price(text(h1.find(".plan-ye-ai")));
    const shown = price(text(h1.clone().children("p").remove().end()));
    const monthly = regular ?? shown;
    if (!name || monthly === null) return;
    const features = bullets(card, $);
    const contract = features.map((f) => f.match(/(\d+)-month contract/i)).find(Boolean);
    const months = contract ? Number(contract[1]) : 0;
    const promo = regular !== null && shown !== null && shown !== regular ? features.find((f) => /^RM\d+.*first \d+ months/i.test(f)) : undefined;
    out.push(
      plan({
        title: months ? `${name} (${months}-month contract)` : name,
        monthly_price: monthly,
        data_gb: cardData(text(card.find("h6").first()), features),
        contract_months: months,
        talktime_mins: features.some((f) => /unlimited calls/i.test(f)) ? -1 : undefined,
        features: features.filter((f) => !/-month contract|^RM\d+.*first \d+ months/i.test(f)),
        promotion_badge: promo,
        supplementary_line_price: features.some((f) => /supplementary line available/i.test(f)) ? extra : undefined,
        affiliate_url: card.find("a.btn-buynow").attr("href"),
      }),
    );
  });
  return out;
}

/** Prepaid: `.prepaid-card`s: name = the small heading + the title ("5g advanced" + "prepaid 20"). */
function parsePrepaid(page: PageData): RawPlan[] {
  const $ = dom(page);
  const out: RawPlan[] = [];
  $(".prepaid-card").each((_, el) => {
    const card = $(el);
    const title = clean(`${text(card.find("h4").first())} ${text(card.find(".prepaid-card-title").first())}`);
    const monthly = price(text(card.find("h2").first()));
    if (!title || monthly === null) return;
    const features = bullets(card, $);
    const badge = text(card.find("h6").first()).replace(/ /g, "");
    out.push(
      plan({
        title,
        monthly_price: monthly,
        data_gb: cardData("", features),
        contract_months: 0,
        talktime_mins: features.some((f) => /unlimited calls/i.test(f)) ? -1 : undefined,
        features: features.filter((f) => !/unlimited calls/i.test(f)),
        promotion_badge: badge || undefined,
        affiliate_url: card.find("a.btn").attr("href"),
      }),
    );
  });
  return out;
}

/**
 * 5G broadband: each `.price-section` belongs to a card (h3 = Gateway / Flexi). Gateway has one tab pane per contract
 * length (the tab button names the length); a pane may show a "Normal Price" and a postpaid-user price - the
 * normal price is the plan price and the other goes into the promotion badge.
 */
function parseBroadband(page: PageData): RawPlan[] {
  const $ = dom(page);
  const out: RawPlan[] = [];
  $(".price-section").each((_, el) => {
    const section = $(el);
    const card = section.closest(".card");
    const name = text(card.find("h3").first());
    if (!name) return;
    const pane = section.closest(".tab-pane");
    let months: number | null = null;
    if (pane.length) {
      const tab = card.find(`[data-bs-target="#${pane.attr("id")}"]`).first();
      const m = text(tab).match(/(\d+)-month/i);
      months = m ? Number(m[1]) : null;
    } else if (/no contract/i.test(text(card))) months = 0;
    const prices = section
      .find(".price-left")
      .map((_, e) => ({ label: text($(e).find("p, label").first()), value: price(text($(e).find("h2").first())) }))
      .get()
      .filter((p) => p.value !== null);
    if (!prices.length) return;
    const main = prices.find((p) => /normal/i.test(p.label)) ?? prices[0];
    const others = prices.filter((p) => p !== main && p.label);
    const scope = pane.length ? pane : card;
    const features = bullets(scope, $);
    const offer = /limited time/i.test(main.label) ? "Limited time offer" : "";
    const badge = [offer, ...others.map((p) => `RM${p.value}/mth ${p.label.toLowerCase()}`)].filter(Boolean).join("; ");
    out.push(
      plan({
        title: months ? `${name} (${months}-month contract)` : name,
        monthly_price: main.value,
        data_gb: cardData("", features),
        contract_months: months ?? undefined,
        features,
        promotion_badge: badge || undefined,
        affiliate_url: section.find("a.btn-buynow").first().attr("href"),
      }),
    );
  });
  return out;
}

/** Yes Fibre is a register-your-interest page. Stay empty, but fail loudly if it ever starts showing prices. */
function parseFibre(page: PageData): RawPlan[] {
  if (/\bRM\s?\d/.test(page.text) && /\/mth|per month/i.test(page.text)) {
    throw new Error("Yes Fibre page now shows prices: write a parser for it");
  }
  return [];
}

export const yes = defineProvider("Yes", "MY", "https://www.yes.my", [
  t.post("https://www.yes.my/yes-postpaid-plans/", parsePostpaid),
  t.pre("https://www.yes.my/yes-prepaid-plans/", parsePrepaid),
  t.bb("https://www.yes.my/yes-5g-broadband/", parseBroadband),
  t.expectEmpty(t.bb("https://www.yes.my/yes-fibre/", parseFibre)),
]);
