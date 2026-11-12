import type { AnyNode } from "domhandler";
import { clean, dataGb, dom, plan } from "../parse-utils";
import type { PageData, PageParser, RawPlan } from "../types";
import { defineProvider, t } from "./define";

/** Text nodes of an element, one per line (blank ones dropped). */
function textLines(root: AnyNode): string[] {
  const out: string[] = [];
  const walk = (n: AnyNode) => {
    if (n.type === "text") {
      const s = clean((n as unknown as { data: string }).data);
      if (s) out.push(s);
    } else if ("children" in n) (n.children as AnyNode[]).forEach(walk);
  };
  walk(root);
  return out;
}

/**
 * hi! prepaid packs: the page has 30-day, 90-day and 1-year tabs, all in the DOM, one card per pack
 * (`[data-card-anchor-index]`). The card's <h3> is the pack price ("$15/30 days"); the cards carry no plan name,
 * so the title is built from what the card says (local data, validity, "Senior" when the card is the senior pack).
 * Price = the pack price shown.
 */
const parseHi: PageParser = (page: PageData): RawPlan[] => {
  const $ = dom(page);
  const out: RawPlan[] = [];
  $("[data-card-anchor-index]").each((_, el) => {
    const head = clean($(el).find("h3").first().text());
    const m = head.match(/^\$\s?(\d[\d,]*(?:\.\d+)?)\s*\/\s*(\d+)?\s*(day|days|year|month|months)\b/i);
    if (!m) return;
    const ls = textLines(el);
    const i = ls.indexOf("Local and roaming data");
    const dataLine = i >= 0 ? ls[i + 1] : undefined;
    const gb = dataLine ? (/unlimited/i.test(dataLine) ? -1 : dataGb(dataLine)) : null;
    if (gb === null) return;
    const unit = m[3].toLowerCase();
    const validity = unit.startsWith("year") ? `${m[2] ?? 1} year` : `${m[2]} ${unit.startsWith("month") ? "months" : "days"}`;
    const senior = ls.some((l) => /senior/i.test(l));
    const iComes = ls.indexOf("Comes with");
    const iPromo = ls.indexOf("Promotions");
    const perks = iComes >= 0 ? ls.slice(iComes + 1, iPromo > iComes ? iPromo : undefined) : [];
    const regions = dataLine ? ls[i + 2] : undefined;
    const features = [
      regions && !/GB|roaming/i.test(regions) ? `Local and roaming data in ${regions}` : undefined,
      ...ls.filter((l) => /\d\s?GB (?:APAC|Asia|Worldwide) roaming/i.test(l)),
      ...perks.filter((l) => /IDD mins|Myanmar mins|Unlimited local calls|roll over|validity|auto renewal/i.test(l)),
    ]
      .filter(Boolean)
      .map((f) => (f as string).replace(/\s*\($/, "")) as string[];
    const promo = iPromo >= 0 ? ls[iPromo + 1] : undefined;
    out.push(
      plan({
        title: `hi! ${senior ? "Senior " : ""}${gb === -1 ? "Unlimited" : `${gb}GB`} ${validity}`,
        monthly_price: Number(m[1].replace(/,/g, "")),
        data_gb: gb,
        contract_months: 0,
        features: features.slice(0, 8),
        promotion_badge: promo,
      }),
    );
  });
  return out;
};

export const singtelHi = defineProvider("Singtel hi!", "SG", "https://www.singtel.com/personal/products-services/mobile/hi", [
  t.pre("https://www.singtel.com/personal/products-services/mobile/hi", parseHi),
]);
