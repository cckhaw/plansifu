import type { AnyNode } from "domhandler";
import { clean, dom, plan, price } from "../parse-utils";
import type { PageData, RawPlan } from "../types";
import { defineProvider, t } from "./define";

const num = (s: string) => Number(s.replace(/,/g, ""));

/**
 * Each /plans/zero1-* page is a Vue page with one `.card.is-custom` per plan (a page holds one to three of them,
 * not exactly one). Card header: plan name + "$ 12.00 /month" + optional promo badge; body: labelled rows
 * ("Data" / "600 GB", "Talktime (Local Outgoing)" / "300 MINUTES", "SMS (Local Outgoing)" / "100 FREE").
 * The site states "ZERO contract" on every page.
 */
function parseZero1(page: PageData): RawPlan[] {
  const $ = dom(page);
  const noContract = /ZERO contract|no contract/i.test(page.text);
  const out: RawPlan[] = [];
  $(".card.is-custom").each((_, el) => {
    const card = $(el);
    const name = clean(card.find(".card-header-title > div").first().text());
    const monthly = price(card.find(".card-header-title .has-text-primary").first().text());
    if (!name || monthly === null) return;

    const texts: string[] = [];
    const walk = (nodes: AnyNode[]) => {
      for (const n of nodes) {
        if (n.type === "text") {
          const s = clean((n as unknown as { data: string }).data);
          if (s) texts.push(s);
        } else if ("children" in n) walk(n.children as AnyNode[]);
      }
    };
    walk(card.toArray());
    const after = (label: RegExp) => {
      const i = texts.findIndex((l) => label.test(l));
      return i >= 0 ? texts.slice(i + 1).find((l) => !/^Unlimited (?:Local )?Incoming/i.test(l)) : undefined;
    };
    const dataLine = after(/^Data$/i);
    const dm = dataLine?.match(/^(\d[\d,.]*)\s?(GB|TB)/i);
    const talk = after(/^Talktime/i)?.match(/^(\d[\d,]*)\s*MINUTES/i);
    const sms = after(/^SMS/i)?.match(/^(\d[\d,]*)\s*FREE/i);
    const badge = card.find(".promo-tag-badge .has-text-weight-bold").first().text();
    const promoDetail = card.find(".promo-tag-badge .streamo-text").first().text();
    const rollover = texts.some((l) => /^Rollover included/i.test(l));
    out.push(
      plan({
        title: name,
        category: "mobile_postpaid",
        monthly_price: monthly,
        data_gb: dm ? num(dm[1]) * (/TB/i.test(dm[2]) ? 1000 : 1) : undefined,
        talktime_mins: talk ? num(talk[1]) : undefined,
        sms_count: sms ? num(sms[1]) : undefined,
        contract_months: noContract ? 0 : undefined,
        promotion_badge: clean([badge, promoDetail].filter(Boolean).join(" - ")),
        features: [
          ...texts.filter((l) => /^(Roam World|RoamAP|Roam Malaysia|IDD v019)\b/i.test(l)),
          texts.some((l) => /5G\+ ENABLED|5G\+ Trial/i.test(l)) ? "5G+" : "",
          rollover ? "Rollover included" : "",
        ].filter(Boolean),
      }),
    );
  });
  return out;
}

export const zero1 = defineProvider("Zero1", "SG", "https://zero1.sg", [
  t.post("https://zero1.sg/plans/zero1-basic", parseZero1),
  t.post("https://zero1.sg/plans/zero1-standard", parseZero1),
  t.post("https://zero1.sg/plans/zero1-jumbo", parseZero1),
]);
