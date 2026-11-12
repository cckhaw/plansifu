import { contractMonths, dataGb, lines, plan, price, speedMbps } from "../parse-utils";
import type { PageData, RawPlan } from "../types";
import { defineProvider, t } from "./define";

const num = (s: string) => Number(s.replace(/,/g, ""));

/**
 * The home page shows mobile cards (tab "Mobile", each card ends with a "Buy" button) and broadband cards
 * (tab "Broadband", price followed by "with GST"). Cards carry no plan name, so the title is built from the
 * card's own data allowance and talktime ("SIMBA 600GB + 700 mins"), plus its label ("Seniors Plan") if it has one.
 * Only the 30-day price is a monthly price: the "/90 days" variants of the same card are skipped (never divided).
 */
function parseSimba(page: PageData): RawPlan[] {
  const all = lines(page);
  const out: RawPlan[] = [];

  // Mobile: split into cards at each "Buy" button.
  let card: string[] = [];
  for (const line of all) {
    if (/^Buy$/i.test(line)) {
      const mobile = mobileCard(card);
      if (mobile) out.push(mobile);
      card = [];
    } else if (/^SIMBA Broadband Plans$/i.test(line)) {
      card = [];
      break;
    } else card.push(line);
  }

  // Broadband: a card runs up to its "$xx.xx" / "with GST" price.
  const start = all.findIndex((l) => /^SIMBA Broadband Plans$/i.test(l));
  if (start >= 0) {
    let bb: string[] = [];
    for (let i = start + 1; i < all.length; i++) {
      const m = all[i].match(/^\$(\d[\d,]*(?:\.\d+)?)$/);
      if (m && /^with GST$/i.test(all[i + 1] ?? "")) {
        const title = bb.find((l) => speedMbps(l) !== null && /broadband/i.test(l));
        const contract = bb.map((l) => contractMonths(l)).find((c) => c !== null);
        if (title)
          out.push(
            plan({
              title: `SIMBA ${title.replace(/^SIMBA\s+/i, "")}`,
              monthly_price: num(m[1]),
              speed_mbps: speedMbps(title),
              contract_months: contract ?? undefined,
              category: "broadband",
              promotion_badge: bb.find((l) => /^(launch deal)$/i.test(l)),
              features: bb.filter((l) => /^FREE /i.test(l)).slice(0, 5),
            }),
          );
        bb = [];
        i++; // skip "with GST"
      } else if (/^(Looking for a mobile plan|You can now port)/i.test(all[i])) break;
      else bb.push(all[i]);
    }
  }
  return out;
}

function mobileCard(card: string[]): RawPlan | null {
  const pi = card.findIndex((l, i) => /^\$\d[\d,]*(?:\.\d+)?$/.test(l) && /^\/\s*\d+\s*days?$/i.test(card[i + 1] ?? ""));
  if (pi < 0) return null;
  const period = Number(card[pi + 1].match(/\d+/)![0]);
  if (period !== 30) return null; // multi-cycle variant of a 30-day plan
  const data = card.find((l) => /^\d[\d,.]*\s?(?:GB|TB)$/i.test(l));
  if (!data) return null;
  const mins = card.map((l) => l.match(/^(\d[\d,]*)\s?SG\s?\+\s?IDD Mins$/i)).find(Boolean);
  const label = card.find((l) => /^(Seniors? Plan|Most Popular|Best Value)$/i.test(l));
  const sizeLabel = /^Seniors?/i.test(label ?? "") ? "Seniors Plan" : "";
  const title = ["SIMBA", data.replace(/\s/g, ""), mins ? `+ ${mins[1]} mins` : "", sizeLabel].filter(Boolean).join(" ");
  const sms = card.some((l) => /^Unlimited Local SMS$/i.test(l));
  return plan({
    title,
    category: "mobile_prepaid",
    monthly_price: price(card[pi]),
    data_gb: dataGb(data),
    talktime_mins: mins ? num(mins[1]) : undefined,
    sms_count: sms ? -1 : undefined,
    contract_months: 0,
    promotion_badge: label && !sizeLabel ? label : undefined,
    features: card.filter((l) => !/^SIMBA/i.test(l) && /roaming|Rollover|Unlimited Calls/i.test(l)).slice(0, 6),
  });
}

export const simba = defineProvider("SIMBA", "SG", "https://simba.sg", [t.mixed("https://simba.sg/", parseSimba, "mobile_prepaid")]);
