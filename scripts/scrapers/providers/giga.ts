import type { AnyNode } from "domhandler";
import { clean, dom, plan, price } from "../parse-utils";
import type { PageData, RawPlan } from "../types";
import { defineProvider, t } from "./define";

const num = (s: string) => Number(s.replace(/,/g, ""));

/**
 * giga is one OutSystems page. Each plan is a `PlanDashboardWrapper*` card (the class carries a campaign suffix
 * such as `_april`, so the selector matches the stable prefix): tag line, "800GB FOR $19.90 MONTHLY", then bullets.
 * Plans have no names on the page, so the title is built from the headline allowance ("giga 400GB"), plus the
 * tag ("Ages 15 to 29") or "6-month billing" when that is what tells two cards apart.
 * Monthly cards: the first $ amount (an intro price like "$0.90 FOR THE FIRST MONTH" is the badge).
 * "BILLED EVERY 6 MONTHS" cards: the "~$x per month" figure the card itself prints.
 */
function parseGiga(page: PageData): RawPlan[] {
  const $ = dom(page);
  const out: RawPlan[] = [];
  $('[class*="PlanDashboardWrapper"]').each((_, el) => {
    const texts: string[] = [];
    const walk = (nodes: AnyNode[]) => {
      for (const n of nodes) {
        if (n.type === "text") {
          const s = clean((n as unknown as { data: string }).data);
          if (s) texts.push(s);
        } else if ("children" in n) walk(n.children as AnyNode[]);
      }
    };
    walk($(el).toArray());
    const bullet = texts.indexOf("•");
    const head = bullet >= 0 ? texts.slice(0, bullet) : texts;
    const body = bullet >= 0 ? texts.slice(bullet) : [];
    const data = head.find((l) => /^\d[\d,.]*\s?(?:GB|TB)$/i.test(l));
    if (!data) return;
    const sixMonth = texts.some((l) => /BILLED EVERY 6 MONTHS/i.test(l));
    const perMonth = texts.map((l) => l.match(/^~\$(\d[\d,]*(?:\.\d+)?)\s*(?:per month|\/mth)$/i)).find(Boolean);
    const first = head.map((l) => price(l)).find((p) => p !== null) ?? null;
    const monthly = sixMonth ? (perMonth ? num(perMonth[1]) : null) : first;
    const tag = head.find((l) => /^Ages\s/i.test(l));
    const m = data.match(/(\d[\d,.]*)\s?(GB|TB)/i)!;
    const mins = body.join(" ").match(/(\d[\d,]*)\s*SMS\s*,\s*(\d[\d,]*)\s*mins/i);
    const joined = body.join(" ");
    const intro = body.find((l) => /for the first month/i.test(l));
    out.push(
      plan({
        title: `giga ${data.replace(/\s/g, "")}${tag ? ` (${tag})` : ""}${sixMonth ? " (6-month billing)" : ""}`,
        category: "mobile_postpaid",
        monthly_price: monthly,
        data_gb: num(m[1]) * (/TB/i.test(m[2]) ? 1000 : 1),
        sms_count: mins ? num(mins[1]) : undefined,
        talktime_mins: mins ? num(mins[2]) : undefined,
        contract_months: 0,
        promotion_badge: intro ?? (sixMonth ? `Billed ${first !== null ? "$" + first : ""} every 6 months`.replace("  ", " ") : undefined),
        features: [
          /5G Speeds/i.test(joined) ? "5G" : /4G Speeds/i.test(joined) ? "4G" : "",
          ...body.filter((l) => /Roaming|Rollover/i.test(l)),
        ].filter(Boolean),
      }),
    );
  });
  return out;
}

export const giga = defineProvider("Giga", "SG", "https://www.giga.com.sg", [t.mixed("https://www.giga.com.sg/", parseGiga)]);
