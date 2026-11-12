import { clean, contractMonths, dataGb, dom, plan, price } from "../parse-utils";
import type { PageData, RawPlan } from "../types";
import { defineProvider, t } from "./define";

/** Postpaid page: plan cards (`.cmp-plan-card-with-promotions`); the phone cards on the page are a different component. */
function parsePostpaid(page: PageData): RawPlan[] {
  const $ = dom(page);
  const out: RawPlan[] = [];
  $(".cmp-plan-card-with-promotions").each((_, el) => {
    const card = $(el);
    if (card.closest(".slick-cloned").length) return; // carousel copies
    const title = clean(card.find(".title-small").first().text());
    const struck = price(card.find(".price .s, .price s, .price strike").first().text());
    const shown = price(`RM${clean(card.find(".price .value").first().text())}`);
    // The big number is the online-offer price; the small struck-through one is the regular monthly charge.
    const regular = struck ?? shown;
    const promo = struck !== null && shown !== null && shown !== struck ? shown : null;
    const sticker = clean(card.find(".sticker").first().text());
    const perks = card
      .find(".card-content li")
      .map((_, li) => clean($(li).text()))
      .get()
      .filter(Boolean);
    out.push(
      plan({
        title,
        monthly_price: regular,
        data_gb: dataGb(card.find(".title-big").first().text()),
        contract_months: contractMonths(card.find(".card-content").text()) ?? undefined,
        promotion_badge: [promo !== null ? `RM${promo}/mth online offer` : "", sticker].filter(Boolean).join(" - ") || undefined,
        features: perks,
        affiliate_url: card.find("a.btn-primary").first().attr("href"),
      }),
    );
  });
  return out;
}

/**
 * Prepaid page: the plan cards only carry a banner image (name and price are baked into it), so the page's own
 * "quick comparison" table (Prepaid Plan | Price | Validity | Internet Speed | Unlimited 5G | Fair Usage Policy | Call) is the source.
 */
function parsePrepaid(page: PageData): RawPlan[] {
  const $ = dom(page);
  const out: RawPlan[] = [];
  $("table").each((_, tbl) => {
    const rows = $(tbl).find("tr");
    const head = rows.first().find("th, td").map((_, c) => clean($(c).text()).toLowerCase()).get();
    const col = (re: RegExp) => head.findIndex((h) => re.test(h));
    const iName = col(/prepaid plan/), iPrice = col(/^price/), iValid = col(/validity/), iSpeed = col(/speed/), i5g = col(/5g/), iFup = col(/fair usage/), iCall = col(/call/);
    if (iName < 0 || iPrice < 0) return;
    rows.slice(1).each((_, tr) => {
      const cells = $(tr).find("td").map((_, c) => clean($(c).text())).get();
      const rawName = cells[iName] ?? "";
      const p = price(cells[iPrice]);
      if (!rawName || p === null) return;
      // "RM40 48Mbps Plan (Best Seller)" -> title "Hotlink Prepaid 48Mbps Plan", badge "Best Seller"
      const label = rawName.match(/\(([^)]*)\)\s*$/)?.[1];
      const isTag = label && /best|popular|recommend|value/i.test(label);
      const name = clean(rawName.replace(/^RM\s?\d[\d.,]*\s*/i, "").replace(isTag ? /\s*\([^)]*\)\s*$/ : /$^/, ""));
      const validity = contractMonths(cells[iValid]) === null ? cells[iValid] : undefined;
      out.push(
        plan({
          title: `Hotlink Prepaid ${name}`,
          monthly_price: p, // the pack price shown (30-day, weekly or daily pass)
          data_gb: /unlimited/i.test(cells[i5g] ?? "") ? -1 : dataGb(cells[iFup]),
          contract_months: 0,
          promotion_badge: isTag ? label : undefined,
          features: [
            cells[iPrice] ? `Price ${cells[iPrice]}` : "",
            iSpeed >= 0 && cells[iSpeed] ? `Speed: ${cells[iSpeed]}` : "",
            i5g >= 0 && cells[i5g] ? cells[i5g] : "",
            iFup >= 0 && cells[iFup] ? `${cells[iFup]} fair usage policy` : "",
            iCall >= 0 && cells[iCall] ? cells[iCall] : "",
            validity ? `Validity: ${validity}` : "",
          ].filter(Boolean),
        }),
      );
    });
  });
  return out;
}

export const hotlink = defineProvider("Hotlink", "MY", "https://www.hotlink.com.my/en/home/", [
  t.post("https://www.hotlink.com.my/en/products/postpaid/", parsePostpaid),
  t.pre("https://www.hotlink.com.my/en/products/prepaid/", parsePrepaid),
]);
