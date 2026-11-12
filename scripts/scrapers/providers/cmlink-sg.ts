import { clean, contractMonths, dataGb, dom, feedJson, plan, price } from "../parse-utils";
import type { PageData, RawPlan } from "../types";
import { defineProvider, t } from "./define";

const num = (s: string | undefined | null) => (s ? Number(s.replace(/,/g, "")) : undefined);

function minsAndSms(bullets: string[]) {
  const mins = bullets.map((b) => b.match(/^(\d[\d,]*)\s*(?:local\s+)?mins?\b(?!\s+from)/i)).find(Boolean);
  const sms = bullets.map((b) => b.match(/^(\d[\d,]*)\s*local\s*SMS/i)).find(Boolean);
  return { talktime_mins: num(mins?.[1]), sms_count: num(sms?.[1]) };
}

/** Rendered cards: `.package_data_list` (tag "5G | New", `.package_title` data, `.package_money strong` price, bullets). */
function fromDom(page: PageData): RawPlan[] {
  const $ = dom(page);
  const out: RawPlan[] = [];
  const seenTitles = new Map<string, number>();
  $(".package_data_list").each((_, el) => {
    const card = $(el);
    const p = price(`$${clean(card.find(".package_money strong").first().text()).replace(/^\$/, "")}`);
    const sizeText = clean(card.find(".package_title").first().text());
    const data = /unlimited/i.test(sizeText) ? -1 : dataGb(sizeText);
    if (p === null || data === null) return;
    const tag = clean(card.find(".package_tag").first().text());
    const [tech, ...labels] = tag.split("|").map(clean).filter(Boolean);
    const bullets = card
      .find(".preferential_list")
      .map((__, li) => clean($(li).text()))
      .get()
      .filter(Boolean);
    const tips = clean(card.find(".preferential_tips").first().text());
    // Contract cards carry a "12 months" label element; SIM-only cards have none.
    const months = card
      .find("*")
      .map((__, e) => clean($(e).children().length ? "" : $(e).text()))
      .get()
      .map((s) => (/^\d+\s*months?$/i.test(s) ? contractMonths(s) : null))
      .find((m) => m !== null);
    const size = data === -1 ? "Unlimited" : `${data}GB`;
    let title = [tech, size, months ? `${months}-month contract` : "SIM-only", ...labels].filter(Boolean).join(" ");
    const n = (seenTitles.get(title) ?? 0) + 1;
    seenTitles.set(title, n);
    if (n > 1) title += /1-Card-Multi-Number/i.test(card.text()) ? " 1CMN" : ` ${n}`;
    const promo = clean(card.find(".activity_tag").first().text()) || tips;
    out.push(
      plan({
        title,
        monthly_price: p,
        data_gb: data,
        ...minsAndSms(bullets),
        contract_months: months ?? 0,
        category: "mobile_postpaid",
        promotion_badge: promo || undefined,
        features: bullets.filter((b) => !/^\d+\s*(?:local\s+)?(?:mins|SMS)/i.test(b)).slice(0, 8),
      }),
    );
  });
  return out;
}

/**
 * Contract plans come from the page's own `getAcceptContract` JSON (the "Contract Plans" tab is not in the DOM until clicked):
 * `contractList[0]` has `contractOtherName` ("5G $15.00 Contract Plan"), `dataLimitEn`, `contractPeriod` (months).
 * The price is read from the name (the numeric fields are in cents).
 */
function fromContractFeed(page: PageData): RawPlan[] {
  const out: RawPlan[] = [];
  for (const { url, json } of feedJson(page)) {
    if (!/getAcceptContract/i.test(url)) continue;
    const data = (json as { data?: { canAcceptContractList?: { contractList?: Record<string, unknown>[]; operProductInfo?: Record<string, unknown> }[] } }).data;
    for (const group of data?.canAcceptContractList ?? []) {
      const c = group.contractList?.[0];
      if (!c) continue;
      const p = price(String(c.contractOtherName ?? c.productNameEn ?? ""));
      const months = Number(c.contractPeriod);
      const limit = String(c.dataLimitEn ?? group.operProductInfo?.dataLimit ?? "");
      const gb = /unlimited/i.test(limit) ? -1 : dataGb(limit);
      if (p === null || !Number.isFinite(months) || months <= 0 || gb === null) continue;
      const tech = clean(String(c.contractOtherName ?? "").match(/^\s*(\d?G\+?)/i)?.[1] ?? "");
      let bullets: string[] = [];
      try {
        const arr = JSON.parse(String(c.productRemarkOther ?? "[]"));
        if (Array.isArray(arr)) bullets = arr.map((s) => clean(String(s)));
      } catch {
        /* free-text bullets are optional */
      }
      const desc = String(c.contractDiscriptionOther ?? "");
      const mins = desc.match(/includes\s+(\d[\d,]*)\s+minutes?\s+(?:of\s+)?local\s+call/i);
      const sms = desc.match(/includes\s+(\d[\d,]*)\s+local\s+SMS/i);
      const label = clean(String(group.operProductInfo?.enMarketingLabel ?? ""));
      out.push(
        plan({
          title: [tech, gb === -1 ? "Unlimited" : `${gb}GB`, `${months}-month contract`].filter(Boolean).join(" "),
          monthly_price: p,
          data_gb: gb,
          talktime_mins: num(mins?.[1]),
          sms_count: num(sms?.[1]),
          contract_months: months,
          category: "mobile_postpaid",
          promotion_badge: label || undefined,
          features: bullets.slice(0, 8),
        }),
      );
    }
  }
  return out;
}

/**
 * CMLink Singapore plans page. Everything on it is monthly-billed postpaid (SIM-only no-contract plans and 12-month
 * contract plans); no tourist/prepaid packs are listed. SIM-only cards are read from the rendered DOM, contract plans
 * from the page's own contract JSON feed (also from the DOM if the contract tab happens to be rendered; duplicates are dropped).
 */
function parseCmlinkSg(page: PageData): RawPlan[] {
  const seen = new Set<string>();
  return [...fromDom(page), ...fromContractFeed(page)].filter((p) => {
    const key = `${p.monthly_price}|${p.data_gb}|${p.contract_months}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const cmlinkSg = defineProvider("CMLink", "SG", "https://www.cmlink.com/sg/en/", [
  t.mixed("https://www.cmlink.com/sg/en/plans/", parseCmlinkSg),
]);
