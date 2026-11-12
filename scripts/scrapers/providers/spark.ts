import { clean, dataGb, dom, plan, price } from "../parse-utils";
import type { PageData, RawPlan } from "../types";
import { defineProvider, t } from "./define";

const text = (s: string) => clean(s.replace(/[​-‍﻿]/g, ""));

/** "Find your Spark" plan cards: a name header plus Monthly price / Internet / Hotspot / Voice label-value rows. */
function parseSpark(page: PageData): RawPlan[] {
  const $ = dom(page);
  const out: RawPlan[] = [];
  const seen = new Set<string>();
  $(".cd-spark-block.for-spark-plans").each((_, el) => {
    const card = $(el);
    const rows = new Map<string, string>();
    card.find(".flip-card-title > div").each((_, row) => {
      const cells = $(row).children("div");
      if (cells.length >= 2) rows.set(text(cells.eq(0).text()).toLowerCase(), text(cells.eq(1).text()));
    });
    const monthly = rows.get("monthly price");
    const title = text(card.find(".cd-cards-badge-txt-13").first().text());
    const p = price(monthly);
    if (!title || p === null) return; // not a plan card without a name and a monthly price
    // A name can appear twice with different specs: keep the first.
    if (seen.has(title.toLowerCase())) return;
    seen.add(title.toLowerCase());
    const voice = rows.get("voice") ?? "";
    const mins = voice.match(/(\d[\d,]*)\s*mins?/i);
    const tags = card
      .find(".cd-pill-category-text, .category-tag-pill")
      .map((_, e) => text($(e).text()))
      .get()
      .filter(Boolean);
    out.push(
      plan({
        title,
        monthly_price: p,
        data_gb: dataGb(rows.get("internet")),
        talktime_mins: mins ? Number(mins[1].replace(/,/g, "")) : undefined,
        contract_months: 0, // "Downgrade, upgrade or cancel anytime"; no contract
        promotion_badge: [...new Set(tags)][0],
        features: [
          text(card.find(".cd-paragraph-4").first().text()),
          /yes/i.test(rows.get("hotspot") ?? "") ? "Hotspot included" : "",
          /5G/i.test(rows.get("internet") ?? "") ? "5G/4G" : /4G/i.test(rows.get("internet") ?? "") ? "4G" : "",
        ].filter(Boolean),
      }),
    );
  });
  return out;
}

export const spark = defineProvider("Spark", "MY", "https://spark.celcomdigi.com", [t.pre("https://spark.celcomdigi.com", parseSpark)]);
