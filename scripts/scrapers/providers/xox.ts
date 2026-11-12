import { clean, dataGb, feedJson, plan, walkJson } from "../parse-utils";
import type { PageData, RawPlan } from "../types";
import { defineProvider, t } from "./define";

type Info = { infoData?: string; infoText?: string; infoGradient?: string };
type Perk = { description?: string };

/** The store page renders from the JSON the page itself loads (`getDetailsByCategory`): `result.planList[]`. */
function postpaid5g(page: PageData): RawPlan[] {
  const out: RawPlan[] = [];
  const seen = new Set<string>();
  for (const { json } of feedJson(page)) {
    walkJson(json, (obj) => {
      if (!Array.isArray(obj.planList)) return;
      for (const p of obj.planList as Record<string, unknown>[]) {
        const title = clean((p.dataName as string) ?? "");
        const monthly = typeof p.planPrice === "number" ? p.planPrice : Number(p.planPrice);
        if (!title || !Number.isFinite(monthly) || monthly <= 0 || seen.has(title)) continue;
        seen.add(title);
        const info = (Array.isArray(p.infoList) ? p.infoList : []) as Info[];
        const find = (label: RegExp) => info.find((i) => label.test(i.infoText ?? ""));
        const internet = find(/internet/i);
        const calls = find(/^calls?$/i);
        const sms = find(/^sms$/i);
        const smsCount = sms && /^\d+$/.test(clean(sms.infoData)) ? Number(clean(sms.infoData)) : undefined;
        const extras = info.filter((i) => !i.infoText && (i.infoData || i.infoGradient)).map((i) => clean(`${i.infoGradient ?? ""} ${i.infoData ?? ""}`));
        const perks = ((Array.isArray(p.perks) ? p.perks : []) as Perk[]).map((k) => clean(k.description)).filter(Boolean);
        const roaming = info.find((i) => /roaming/i.test(`${i.infoData} ${i.infoText}`));
        out.push(
          plan({
            title,
            monthly_price: monthly,
            data_gb: dataGb(internet?.infoData),
            talktime_mins: calls && /unlimited/i.test(calls.infoData ?? "") ? -1 : undefined,
            sms_count: smsCount,
            features: [...new Set([
              clean(`${sms?.infoData ?? ""} SMS`) && sms ? `SMS: ${clean(sms.infoData)}` : "",
              find(/^enabled$/i) ? "Hotspot enabled" : "",
              ...extras,
              roaming ? clean(`${roaming.infoData} ${roaming.infoText ?? ""}`) : "",
              ...perks,
            ].filter(Boolean))],
          }),
        );
      }
    });
  }
  return out;
}

/** The store home page is only a menu (categories and a banner); plans live on the category pages. */
function storeHome(page: PageData): RawPlan[] {
  if (/\bRM\s*\d/.test(page.text)) throw new Error("XOX store home now shows prices; write a parser for it");
  return [];
}

export const xox = defineProvider("XOX", "MY", "https://xox.com.my", [
  t.post("https://onlinestore.xox.com.my/postpaid/postpaid5g", postpaid5g),
  t.expectEmpty(t.mixed("https://onlinestore.xox.com.my/", storeHome)),
]);
