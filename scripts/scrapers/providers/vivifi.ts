import { clean, contractMonths, dataGb, dom, plan, price } from "../parse-utils";
import type { PageData, RawPlan } from "../types";
import { defineProvider, t } from "./define";

/**
 * The home page is an ARPrice pricing table (WordPress plugin): one `.arpricemaincolumn` per plan inside tabs
 * (Hot Deals duplicates plans of the Mobile 4G / 5G tabs; duplicates are dropped by title). The header's first
 * `<b>` is the plan name, the next div "$NN / mth"; `.arp_price_wrapper` has the local data allowance; the body
 * rows are the minutes / SMS lines. "Add a line $X / mth" is the extra-line price of the shared plans.
 */
export function parseVivifi(page: PageData): RawPlan[] {
  const $ = dom(page);
  const seen = new Set<string>();
  const out: RawPlan[] = [];
  $(".ArpPricingTableColumnWrapper.arpricemaincolumn").each((_, el) => {
    const c = $(el);
    const head = c.find(".arppricetablecolumntitle .bestPlanTitle").first();
    const name = clean(head.find("b").first().text()).replace(/(\S)\(/, "$1 (");
    const headText = clean(head.text());
    const monthly = price(clean(head.children("div").eq(1).text()) || headText);
    if (!name || !monthly || seen.has(name.toLowerCase())) return;
    seen.add(name.toLowerCase());
    const box = clean(c.find(".arp_price_wrapper").first().text());
    const rows = c
      .find("ul.arppricingtablebodyoptions li")
      .map((_, li) => clean($(li).text()))
      .get()
      .filter(Boolean);
    const mins = rows.map((r) => r.match(/^([\d,]+)\s*mins?$/i)).find(Boolean);
    const sms = rows.map((r) => r.match(/^([\d,]+)\s*SMS$/i)).find(Boolean);
    const addLine = headText.match(/Add a line\s*\$\s?(\d+(?:\.\d+)?)/i);
    const free = headText.match(/FREE \d+ MONTHS/i);
    const onclick = c.find("button[onclick*='arp_redirect']").first().attr("onclick") ?? "";
    const href = onclick.match(/https?:\/\/[^"&\s]+/)?.[0];
    out.push(
      plan({
        title: name,
        monthly_price: monthly,
        data_gb: /unlimited local data/i.test(headText) ? -1 : dataGb(box),
        talktime_mins: mins ? Number(mins[1].replace(/,/g, "")) : undefined,
        sms_count: sms ? Number(sms[1].replace(/,/g, "")) : undefined,
        contract_months: contractMonths(box) ?? contractMonths(headText) ?? undefined,
        category: "mobile_postpaid",
        features: rows.filter((r) => /roaming|IDD/i.test(r)).map((r) => r.slice(0, 90)).slice(0, 4),
        promotion_badge: free ? `${free[0]} (new number / selected port-ins)` : undefined,
        supplementary_line_price: addLine ? Number(addLine[1]) : undefined,
        affiliate_url: href,
      }),
    );
  });
  return out;
}

export const vivifi = defineProvider("Vivifi", "SG", "https://www.vivifi.me", [t.mixed("https://www.vivifi.me/", parseVivifi)]);
