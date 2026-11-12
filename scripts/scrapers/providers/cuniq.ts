import { clean, dataGb, dom, plan } from "../parse-utils";
import type { PageData, RawPlan } from "../types";
import { defineProvider, t } from "./define";

const BASE = "https://www.cuniq.sg";

/**
 * The listing is a Vue page: one `.pricing-card` per plan with the data allowance, network type (4G/5G), price and a
 * feature list. Cards carry no plan name, so the title is built from the page's own plan-family label
 * ("ONE Asia^ Shared Data Plan" in `.goods-dec`), the network type and the data allowance.
 */
export function parseCuniq(page: PageData): RawPlan[] {
  const $ = dom(page);
  const family = clean($(".goods-dec").first().text()).split(":")[0].replace(/\^/g, "").trim();
  const noContract = /no contract/i.test($(".goods-dec").text());
  const out: RawPlan[] = [];
  $(".pricing-card").each((_, el) => {
    const c = $(el);
    const amount = Number(clean(c.find(".price .amount").first().text()).replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) return;
    const net = clean(c.find(".type-logo").first().text());
    const allowance = clean(c.find(".data-allowance").first().text());
    const lis = c
      .find("ul.features li")
      .map((_, li) => clean($(li).text()))
      .get()
      .filter(Boolean);
    const mins = lis.map((l) => l.match(/^([\d,]+)\s*minutes?\s+Local Call/i)).find(Boolean);
    const sms = lis.map((l) => l.match(/^([\d,]+)\s*Local SMS/i)).find(Boolean);
    const href = c.find("a[href*='order']").first().attr("href");
    const badge = [clean(c.find(".popular-tag").first().text()), clean(c.find(".save-title").first().text())].filter(Boolean).join(" | ");
    out.push(
      plan({
        title: [family, net, allowance.replace(/\s+/g, "")].filter(Boolean).join(" "),
        monthly_price: amount,
        data_gb: dataGb(allowance),
        talktime_mins: mins ? Number(mins[1].replace(/,/g, "")) : undefined,
        sms_count: sms ? Number(sms[1].replace(/,/g, "")) : undefined,
        contract_months: noContract ? 0 : undefined,
        category: "mobile_postpaid",
        features: lis.filter((l) => /roaming|IDD/i.test(l)).slice(0, 5),
        promotion_badge: badge || undefined,
        affiliate_url: href ? new URL(href, BASE).toString() : undefined,
      }),
    );
  });
  return out;
}

export const cuniq = defineProvider("Cuniq", "SG", BASE, [t.mixed("https://www.cuniq.sg/en/plans/listing", parseCuniq)]);
