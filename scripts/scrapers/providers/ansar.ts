import { clean, dataGb, dom, plan, price, speedMbps } from "../parse-utils";
import type { PageData, RawPlan } from "../types";
import { defineProvider, t } from "./define";

/**
 * Each pack on the page is a small `<table id="starterpack">`: first cell = NAME + <hr> + <span>RMxx (speed)</span>,
 * the next cells = allowance lines separated by <br>. The same table markup also holds the starter pack and the
 * add-on data top-ups (no `<span>` price in the head cell / no "Dial *199*4*2|3" subscribe code), so only tables
 * whose subscribe line is a plan code (`*199*4*2*` yearly, `*199*4*3*` unlimited passes) are plans. The page
 * repeats sections in its markup, so identical packs are collapsed.
 */
function ourPlans(page: PageData): RawPlan[] {
  const $ = dom(page);
  const out: RawPlan[] = [];
  const seen = new Set<string>();
  $("table#starterpack").each((_, tbl) => {
    const table = $(tbl);
    const head = table.find("tr").first().find("td").first();
    const span = clean(head.find("span").first().text());
    const name = clean(head.clone().children().remove().end().text());
    const monthly = price(span);
    const body = table
      .find("tr")
      .slice(1)
      .map((_, r) => $(r).find("td").map((_, c) => $(c).html()!.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ")).get().join("\n"))
      .get()
      .join("\n")
      .split("\n")
      .map(clean)
      .filter(Boolean);
    if (!name || monthly === null || !body.some((l) => /\*199\*4\*[23]\*/.test(l))) return;

    const speed = speedMbps(span);
    const unlimited = body.some((l) => /unlimited data/i.test(l));
    const callsHotspot = body.some((l) => /unlimited? calls|unlimted calls/i.test(l));
    const validity = body.join(" ").match(/\((\d+\s*days?)\)/i)?.[1] ?? body.join(" ").match(/(\d+)\s*days line validity/i)?.[0];
    const titleCase = name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    const title = [titleCase, speed ? `${speed}Mbps` : "", callsHotspot ? "+ Calls & Hotspot" : ""].filter(Boolean).join(" ");
    const key = `${title}|${monthly}`;
    if (seen.has(key)) return;
    seen.add(key);

    const perMonth = body.find((l) => /GB\s*\/\s*month/i.test(l));
    out.push(
      plan({
        title,
        monthly_price: monthly,
        data_gb: unlimited ? -1 : dataGb(body.find((l) => /\d\s?GB/i.test(l))),
        speed_mbps: speed,
        talktime_mins: callsHotspot ? -1 : undefined,
        contract_months: 0,
        features: [validity ? `${/^\d+ days? line/i.test(validity) ? validity : `${validity} line validity`}` : "", perMonth ?? "", callsHotspot ? "Unlimited calls & hotspot" : ""].filter(Boolean),
      }),
    );
  });
  return out;
}

export const ansar = defineProvider("Ansar", "MY", "https://www.ansarmobile.com.my", [
  t.pre("https://www.ansarmobile.com.my/our-plans/", ourPlans),
]);
