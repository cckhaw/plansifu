import type { CheerioAPI } from "cheerio";
import { clean, dataGb, dom, plan, price } from "../parse-utils";
import type { PageData, RawPlan } from "../types";
import { defineProvider, t } from "./define";

type Sel = ReturnType<CheerioAPI>;
const text = (el: Sel) => clean(el.text());

/**
 * The page is built with Elementor: no semantic class names, but every plan card is one `.e-con` container that holds
 * an `h2` with the plan name followed by an `h2` with the price ("RM17" / "RM 3"). Other `h2`s (section titles, the
 * "Starter Pack for RM5" SIM kit, "Pay Per Use") are not followed by a price-only heading, so they are skipped.
 * Inside a card: label/value rows (two `span.elementor-heading-title` in a child container, e.g. "Total Data" / "20GB",
 * where a bumped value is `<strike>old</strike> <strong>new</strong>`) and icon-list bullets ("3GB Data").
 */
function parsePrepaid(page: PageData): RawPlan[] {
  const $ = dom(page);
  const out: RawPlan[] = [];
  $("h2.elementor-heading-title").each((_, el) => {
    const priceH2 = $(el);
    const monthly = /^RM\s?\d+(?:\.\d+)?$/i.test(text(priceH2)) ? price(text(priceH2)) : null;
    if (monthly === null) return;
    const card = priceH2.closest(".e-con");
    const nameH2 = card.find("h2.elementor-heading-title").filter((_, h) => !/^RM\s?\d/i.test(text($(h)))).first();
    const name = text(nameH2);
    if (!name) return;

    const rows: { label: string; value: string; was?: string }[] = [];
    const rowSpans = new Set<unknown>();
    card.find(".e-con").each((_, c) => {
      const spans = $(c).children(".elementor-widget-heading").find("span.elementor-heading-title");
      if (spans.length !== 2) return;
      const valueEl = spans.eq(1);
      const strike = clean(valueEl.find("strike, s, del").text());
      const value = strike ? clean(valueEl.find("strong, b").text()) || text(valueEl).replace(strike, "").trim() : text(valueEl);
      rows.push({ label: text(spans.eq(0)), value, was: strike || undefined });
      spans.each((_, s) => {
        rowSpans.add(s);
      });
    });
    const bullets = card
      .find(".elementor-icon-list-text")
      .map((_, e) => text($(e)))
      .get()
      .filter(Boolean);
    const notes = card
      .find("span.elementor-heading-title")
      .filter((_, s) => !rowSpans.has(s))
      .map((_, s) => text($(s)))
      .get()
      .filter((s) => s && !/^(daily|weekly|monthly|yearly)$/i.test(s));

    const totalRow = rows.find((r) => /total data/i.test(r.label));
    const dataBullet = bullets.find((b) => dataGb(b) !== null);
    const callsText = [...rows.filter((r) => /calls?/i.test(r.label)).map((r) => r.value), ...bullets.filter((b) => /call|min/i.test(b))].join(" ");
    const features = [
      ...rows.filter((r) => r !== totalRow).map((r) => `${r.label}: ${r.value}`),
      ...bullets.filter((b) => b !== dataBullet),
      ...notes,
    ];
    out.push(
      plan({
        title: name,
        monthly_price: monthly,
        data_gb: dataGb(totalRow?.value ?? dataBullet),
        contract_months: 0,
        talktime_mins: /unlimited/i.test(callsText) ? -1 : (callsText.match(/(\d+)\s*min/i)?.[1] ?? undefined),
        features,
        promotion_badge: totalRow?.was ? `${totalRow.value} total data (was ${totalRow.was})` : undefined,
      }),
    );
  });
  return out;
}

export const vibe = defineProvider("Vibe", "MY", "https://www.vibemobile.com.my", [
  t.pre("https://www.vibemobile.com.my/prepaid/prepaid-plans/", parsePrepaid),
]);
