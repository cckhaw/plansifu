import type { AnyNode } from "domhandler";
import type { CheerioAPI } from "cheerio";
import { clean, contractMonths, dataGb, dom, plan, price } from "../parse-utils";
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
 * SIM Only page: one card per plan (`[data-card-anchor-index]`) with the plan name in an <h3>, the contract line,
 * the promo price followed by the regular ("U.P.") price, a "Comes with" list and a "Promotions" list.
 * The regular price is the plan price; the port-in promo goes in `promotion_badge`.
 */
const parseSimOnly: PageParser = (page: PageData): RawPlan[] => {
  const $: CheerioAPI = dom(page);
  const out: RawPlan[] = [];
  $("[data-card-anchor-index]").each((_, el) => {
    const title = clean($(el).find("h3").first().text());
    const ls = textLines(el);
    const prices = ls.filter((l) => /^\$\s?\d[\d.,]*\s?\/\s?mth$/i.test(l)).map((l) => price(l)!);
    if (!title || !prices.length) return;
    const regular = prices.length > 1 ? Math.max(...prices) : prices[0];
    const promo = prices.length > 1 ? Math.min(...prices) : null;
    const contractLine = ls.find((l) => /contract/i.test(l));
    const dataLine = ls.find((l) => /local data/i.test(l));
    const callsLine = ls.find((l) => /talktime|calls/i.test(l) && /SMS/i.test(l));
    const mins = callsLine?.match(/(\d[\d,]*)\s*mins/i);
    const sms = callsLine?.match(/(\d[\d,]*)\s*SMS/i);
    const iPromo = ls.indexOf("Promotions");
    const iBenefits = ls.indexOf("Benefits");
    const promoLines = iPromo >= 0 ? ls.slice(iPromo + 1, iBenefits > iPromo ? iBenefits : undefined) : [];
    const iComes = ls.indexOf("Comes with");
    const comes = iComes >= 0 ? ls.slice(iComes + 1, iPromo > iComes ? iPromo : undefined) : [];
    const features: string[] = [];
    // The list splits "13GB" / "Asia Roaming" over two text nodes: re-join them.
    for (let i = 0; i < comes.length; i++) {
      const l = comes[i];
      if (l === dataLine || l === callsLine) continue;
      if (/^\d+\s?GB$/i.test(l) && comes[i + 1] && /roaming/i.test(comes[i + 1])) features.push(`${l} ${comes[++i]}`);
      else if (/roaming|caller id/i.test(l)) features.push(l);
    }
    if (callsLine && !mins) features.push(callsLine);
    const badge = promo !== null && promo < regular ? promoLines.find((l) => /\$/.test(l)) ?? `$${promo}/mth when you port-in` : promoLines[0];
    out.push(
      plan({
        title,
        monthly_price: regular,
        data_gb: dataLine ? (/unlimited/i.test(dataLine) ? -1 : dataGb(dataLine)) : undefined,
        talktime_mins: mins ? Number(mins[1].replace(/,/g, "")) : undefined,
        sms_count: sms ? Number(sms[1].replace(/,/g, "")) : undefined,
        contract_months: contractLine ? contractMonths(contractLine) : undefined,
        features,
        promotion_badge: badge,
      }),
    );
  });
  return out;
};

/** Pages that list no plan prices (404 page; broadband prices sit behind a configurator and are not in the HTML). */
const noPlans: PageParser = () => [];

export const singtel = defineProvider("Singtel", "SG", "https://www.singtel.com", [
  // The old mobile-plans URL now returns a 404 page; /personal/mobile/plans/postpaid is the current postpaid page
  // (not crawled here: it would need its own parser, see the report).
  t.expectEmpty(t.post("https://www.singtel.com/personal/products-services/mobile/mobile-plans", noPlans)),
  t.post("https://www.singtel.com/personal/mobile/plans/sim-only", parseSimOnly),
  t.expectEmpty(t.bb("https://www.singtel.com/personal/products-services/broadband", noPlans)),
]);
