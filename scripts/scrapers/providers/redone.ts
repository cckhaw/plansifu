import { clean, contractMonths, dataGb, dom, plan, price } from "../parse-utils";
import type { PageData, RawPlan } from "../types";
import { defineProvider, t } from "./define";

/**
 * Postpaid: the page is one Elementor carousel (a Swiper); every plan is a slide. Swiper clones slides for its loop
 * (class `swiper-slide-duplicate`, same `data-swiper-slide-index`), so only the originals are read. The page only
 * shows the "Hot Selling" filter; Supplementary lines live on a different page.
 */
function postpaid(page: PageData): RawPlan[] {
  const $ = dom(page);
  const out: RawPlan[] = [];
  const seen = new Set<string>();
  $(".swiper-slide").each((_, el) => {
    const slide = $(el);
    if (slide.hasClass("swiper-slide-duplicate")) return;
    const h = slide.find("h2").first();
    if (!h.length) return;
    // "redplanPLUS<span>38</span>" -> "redplanPLUS 38"
    const title = clean(h.contents().map((_, n) => $(n).text() + " ").get().join(""));
    const text = clean(slide.text());
    const m = text.match(/RM\s?(\d[\d,]*(?:\.\d+)?)\s*\/\s*mth/i);
    if (!title || !m) return;
    const key = `${title}|${m[1]}`;
    if (seen.has(key)) return;
    seen.add(key);
    const titles = slide.find(".elementor-image-box-title").map((_, e) => clean($(e).text())).get();
    const data = titles.find((s) => dataGb(s) !== null);
    const calls = titles.find((s) => /call/i.test(s));
    const lines = titles.find((s) => /up to \d+ lines/i.test(s));
    const features = [calls, lines].filter(Boolean) as string[];
    if (/fast-track to (?:a )?free 5g phone/i.test(text)) features.push("Fast-track to a free 5G phone");
    out.push(
      plan({
        title,
        monthly_price: Number(m[1].replace(/,/g, "")),
        data_gb: dataGb(data),
        contract_months: contractMonths(text.match(/\d+-month contract/i)?.[0]),
        talktime_mins: calls && /unlimited/i.test(calls) ? -1 : undefined,
        features,
      }),
    );
  });
  return out;
}

/**
 * Prepaid: the visible plan table is an image, but the Terms & Conditions accordion (always in the DOM) holds a
 * comparison table "Plan | Normal Number | MNP Port-In" with plan names across and Price / High Speed Data /
 * Validity rows. One-off ONEdaily / ONEweekly / ONEyearly passes are add-ons and are not in that table.
 */
function prepaid(page: PageData): RawPlan[] {
  const $ = dom(page);
  const out: RawPlan[] = [];
  $("table").each((_, tbl) => {
    const rows = $(tbl)
      .find("tr")
      .map((_, r) => [$(r).find("th,td").map((_, c) => clean($(c).text())).get()])
      .get() as string[][];
    if (!rows.some((r) => /normal number/i.test(r.join(" "))) || !rows.some((r) => /mnp|port-?in/i.test(r.join(" ")))) return;
    const names = rows.find((r) => r.filter((c) => /^ONE\d+$/i.test(c)).length >= 2)?.filter((c) => /^ONE\d+$/i.test(c));
    if (!names) return;
    const row = (label: RegExp) => rows.find((r) => label.test(r[0]))?.slice(1).filter(Boolean) ?? [];
    const prices = row(/^price/i);
    const datas = row(/high speed data/i);
    const validity = row(/^validity/i);
    const calls = row(/^calls/i);
    names.forEach((name, i) => {
      if (names.indexOf(name) !== i) return; // later duplicates are the port-in column
      const j = names.lastIndexOf(name);
      const p = price(prices[i]);
      if (p === null) return;
      const features: string[] = [];
      if (calls[0]) features.push(`${/^unlimited/i.test(calls[0]) ? "Unlimited calls to all networks" : calls[0]}`);
      if (j !== i && datas[j] && datas[j] !== datas[i]) features.push(`Port-in customers: ${datas[j].replace(/\s*5G\/4G/i, "")} data`);
      out.push(
        plan({
          title: name,
          monthly_price: p,
          data_gb: dataGb(datas[i]),
          talktime_mins: calls[0] && /^unlimited/i.test(calls[0]) ? -1 : undefined,
          contract_months: 0,
          features: [...(validity[0] ? [`${validity[0]} validity`] : []), ...features],
        }),
      );
    });
  });
  return out;
}

/** Broadband (5G home WiFi): the Terms table lists "Plan | <name>" then label/value rows (Monthly, High Speed Data, Contract). */
function broadband(page: PageData): RawPlan[] {
  const $ = dom(page);
  const out: RawPlan[] = [];
  const intro = price(clean(page.text).match(/RM\s?\d+\s+for (?:your|the) first (?:year|12 months)/i)?.[0]);
  $("table").each((_, tbl) => {
    const rows = $(tbl)
      .find("tr")
      .map((_, r) => [$(r).find("th,td").map((_, c) => clean($(c).text())).get()])
      .get() as string[][];
    const head = rows.find((r) => /^plan$/i.test(r[0]));
    if (!head) return;
    const val = (label: RegExp, col: number) => rows.find((r) => label.test(r[0]))?.[col];
    head.slice(1).forEach((name, k) => {
      const monthly = price(val(/^monthly/i, k + 1));
      if (!name || monthly === null) return;
      const rebate = val(/^rebate/i, k + 1);
      out.push(
        plan({
          title: name,
          monthly_price: monthly,
          data_gb: dataGb(val(/data/i, k + 1)),
          contract_months: contractMonths(val(/^contract/i, k + 1)),
          promotion_badge: intro !== null && intro !== monthly ? `RM${intro}/mth for the first 12 months` : undefined,
          features: [rebate ? `Rebate ${rebate}` : "", val(/^device/i, k + 1) ? `Device: ${val(/^device/i, k + 1)}` : "", "Data only (no calls/SMS)"].filter(Boolean),
        }),
      );
    });
  });
  return out;
}

export const redone = defineProvider("redONE", "MY", "https://www.redonemobile.com.my/en/", [
  t.post("https://www.redonemobile.com.my/en/hot-selling-postpaid-plans/", postpaid),
  t.pre("https://www.redonemobile.com.my/en/theoneprepaid/", prepaid),
  t.bb("https://www.redonemobile.com.my/en/redonehome", broadband),
]);
