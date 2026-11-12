import { dom, clean, dataGb } from "../../scrapers/parse-utils";
import { esimPlan, type EsimParser, type RawEsimPlan } from "../types";

/** Currency symbol/prefix -> ISO code. The page shows "US$13.00" (currency selector in the header; geo-dependent). */
const CURRENCIES: [RegExp, string][] = [
  [/^US\$|^USD/i, "USD"],
  [/^A\$|^AU\$|^AUD/i, "AUD"],
  [/^S\$|^SGD/i, "SGD"],
  [/^C\$|^CA\$|^CAD/i, "CAD"],
  [/^NZ\$|^NZD/i, "NZD"],
  [/^HK\$|^HKD/i, "HKD"],
  [/^RM|^MYR/i, "MYR"],
  [/^€|^EUR/i, "EUR"],
  [/^£|^GBP/i, "GBP"],
];

function money(s: string): { price: number; currency: string } | null {
  const t = clean(s);
  const m = t.match(/(\d[\d,]*(?:\.\d+)?)/);
  if (!m) return null;
  const cur = CURRENCIES.find(([re]) => re.test(t))?.[1] ?? (/\$/.test(t) ? "USD" : null);
  if (!cur) return null;
  return { price: Number(m[1].replace(/,/g, "")), currency: cur };
}

/**
 * SimLocal's plan-selection page is a React page of `article[data-testid=plan-card]` cards (the site has no JSON feed).
 * Each card: `.c-PlanTitle__plan-name` ("20 GB eSIM" / "Unlimited eSIM"), `.c-PlanTitle__country-name` plus optional
 * extra badges ("36 countries", "10GB/day of high-speed data", "+Roaming"), and a "Duration / Plan / Speed / Price"
 * tile list (`.c-PlanBenefitTile`). Plan tile "Data" = data only, "Data/Calls/SMS" = voice and SMS included.
 */
export const simlocal: EsimParser = (page) => {
  const $ = dom(page);
  const out: RawEsimPlan[] = [];
  $('article[data-testid="plan-card"]').each((_, el) => {
    const card = $(el);
    const name = clean(card.find(".c-PlanTitle__plan-name").first().text());
    const tiles: Record<string, string> = {};
    card.find(".c-PlanBenefitTile").each((__, t) => {
      const label = clean($(t).find(".c-PlanBenefitTile__label").text());
      tiles[label.toLowerCase()] = clean($(t).find(".c-PlanBenefitTile__value").text());
    });
    const m = money(card.find('[data-testid="div-plan-price"]').first().text() || tiles["price"] || "");
    if (!name || !m) return;
    const days = Number((tiles["duration"] ?? "").match(/(\d+)\s*days?/i)?.[1]) || null;

    // Everything in the title block other than the plan name, country name and operator.
    const extras = card
      .find(".c-PlanTitle__title")
      .find("div,span,p")
      .toArray()
      .filter((n) => $(n).children().length === 0)
      .map((n) => clean($(n).text()))
      .filter(Boolean);
    const coverage = extras.find((x) => /^\d+\+?\s+countries$/i.test(x)) ?? null;
    const daily = extras.find((x) => /\d+\s?(?:GB|MB)\s*\/\s*day/i.test(x)) ?? null;
    const roaming = extras.some((x) => /^\+?\s*roaming$/i.test(x));
    const registration = extras.some((x) => /registration required/i.test(x));

    const unlimited = /unlimited/i.test(name) && !/^\d/.test(name);
    const dataText = name.replace(/\s*eSIM\s*$/i, "");
    const dailyGb = daily ? dataGb(daily.replace(/\s*\/\s*day.*/i, "")) : null;
    const data = unlimited ? -1 : dataGb(dataText);
    const dataLabel = unlimited ? "Unlimited" : dataText.replace(/\s+/g, "");
    const planType = (tiles["plan"] ?? "").replace(/[​\s]/g, "");
    const withVoice = /calls/i.test(planType);
    const speed = tiles["speed"] ?? "";

    out.push(
      esimPlan({
        title: `${dataLabel}${daily && dailyGb ? ` (${dailyGb}GB/day)` : ""} / ${days ?? "?"} days`,
        coverage,
        data_gb: data,
        data_note: daily ? `${daily.replace(/\s+/g, " ")}` : null,
        validity_days: days,
        price: m.price,
        currency: m.currency,
        voice_included: planType ? withVoice : null,
        sms_included: planType ? withVoice : null,
        voice_sms_note: withVoice ? "Calls and SMS included" : null,
        perks: [speed && speed.replace(/\s/g, "") !== "" ? speed : "", roaming ? "Roaming included" : "", registration ? "Registration required" : ""].filter(Boolean),
      }),
    );
  });
  return out;
};
