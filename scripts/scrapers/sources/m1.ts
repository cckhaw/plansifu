import { clean, contractMonths, dataGb, dom, plan, price, speedMbps, todo } from "../parse-utils";
import type { PageData, RawPlan, ScrapeTarget } from "../types";

/**
 * M1's pages. m1.com.sg shows a CAPTCHA bot wall to GitHub's and Vercel's networks, so the nightly crawler cannot read
 * them: they are imported from a real browser with the bookmarklet (see /import). The parsers below are written
 * against pages saved that way (fixtures/sg-m1/).
 */

/**
 * SIM-only page: every plan is a `div.shadow-card` with a "Get this plan" button. Cards carry no plan name, so the title
 * is built from the plan family and its data. A second row of cards sits under the "exclusive silver benefits" heading
 * (senior plans with a deeper intro discount).
 *
 * Price rule: "U.P." is the usual price; the bigger number is an intro discount ("$3 off first 3 months"), so the usual
 * price is the plan price and the intro price goes in the promotion badge.
 */
export function parseM1SimOnly(page: PageData): RawPlan[] {
  const $ = dom(page);
  const all = $("*").toArray();
  const silverHeading = $("*")
    .filter((_, el) => $(el).children().length === 0 && /exclusive silver benefits/i.test($(el).text()))
    .first()
    .get(0);
  const silverIdx = silverHeading ? all.indexOf(silverHeading) : -1;

  const out: RawPlan[] = [];
  const seen = new Set<string>();
  $("div.shadow-card").each((_, el) => {
    const card = $(el);
    if (!card.find("button").filter((_, b) => /get this plan/i.test($(b).text())).length) return;

    const top = clean(card.find(".top").text());
    const bottom = card.find(".bottom");
    const data = dataGb(clean(card.find(".top span").first().text()));
    const usual = price(bottom.find("span").filter((_, s) => /U\.?P\./i.test($(s).text())).first().text());
    const shown = price(bottom.find("span").filter((_, s) => /^\$\s?\d/.test(clean($(s).text()))).first().text());
    const monthly = usual ?? shown;
    if (data === null || monthly === null) return;

    const lis = card.find("li").map((_, li) => clean($(li).text())).get().filter(Boolean);
    const intro = lis.find((l) => /\boff\b.*(first|months)|first \d+ months/i.test(l));
    const mins = top.match(/([\d,]+)\s*Mins/i)?.[1];
    const sms = top.match(/([\d,]+)\s*SMS/i)?.[1];
    const roaming = top.match(/(\d+)\s*GB Worldwide Roaming/i);
    const usualData = top.match(/\(Usual\s*([^)]+)\)/i)?.[1];
    const tag = clean(card.find(".top span.uppercase").first().text());
    const silver = silverIdx >= 0 && all.indexOf(el) > silverIdx;

    const family = silver ? "M1 Silver SIM-only" : "M1 Bespoke SIM-only";
    const label = clean(card.find(".top span").first().text());
    const title = `${family} ${label}${roaming ? ` + ${roaming[1]}GB Worldwide Roaming` : ""}`;
    if (seen.has(title.toLowerCase())) return;
    seen.add(title.toLowerCase());

    out.push(
      plan({
        title,
        monthly_price: monthly,
        data_gb: data,
        talktime_mins: mins ? Number(mins.replace(/,/g, "")) : undefined,
        sms_count: sms ? Number(sms.replace(/,/g, "")) : undefined,
        contract_months: contractMonths(lis.join(" ")) ?? 0,
        features: [
          ...(usualData ? [`Usual data ${clean(usualData)}`] : []),
          ...(roaming ? [`${roaming[1]}GB Worldwide Roaming`] : []),
          ...lis.filter((l) => l !== intro && !/forever$/i.test(l) && !/^no contract$/i.test(l)),
        ].slice(0, 6),
        promotion_badge: [tag, shown !== null && usual !== null && shown !== usual ? `$${shown}/mth${intro ? `: ${intro}` : ""}` : ""].filter(Boolean).join(" | ") || undefined,
      }),
    );
  });
  return out;
}

/**
 * Home broadband page: each plan is a `.plan-device-card` (the page can hold several; the capture of the live page had
 * one, the 10Gbps HomePac with ONT). Broadband is sold on a 24-month term: the big price is what the customer pays for
 * the term and "U.P." the price without the offer, so the term price is the plan price and U.P. goes in the badge.
 */
export function parseM1Broadband(page: PageData): RawPlan[] {
  const $ = dom(page);
  const out: RawPlan[] = [];
  const seen = new Set<string>();
  $(".plan-device-card").each((_, el) => {
    const card = $(el);
    const name = clean(card.find(".top .text-28").first().text()) || clean(card.find(".top span").eq(1).text());
    const variant = clean(card.find(".top span.text-primary-orange").first().text());
    const bottom = card.find(".bottom");
    const monthly = price(bottom.find(".text-38").first().text());
    if (!name || monthly === null) return;
    const up = price(bottom.find("span").filter((_, s) => /U\.?P\./i.test($(s).text())).first().text());
    const term = contractMonths(bottom.text());
    const tags = card.find(".tags .tag").map((_, t) => clean($(t).text())).get();
    const title = `M1 ${name}${variant ? ` (${variant})` : ""}`;
    if (seen.has(title.toLowerCase())) return;
    seen.add(title.toLowerCase());
    out.push(
      plan({
        title,
        monthly_price: monthly,
        speed_mbps: speedMbps(name) ?? undefined,
        contract_months: term ?? 0,
        features: card.find(".top li").map((_, li) => clean($(li).text())).get().filter(Boolean).slice(0, 6),
        promotion_badge: [...tags.filter((t) => /best/i.test(t)), up !== null ? `U.P. $${up}/mth` : ""].filter(Boolean).join(" | ") || undefined,
      }),
    );
  });
  return out;
}

export const M1_TARGETS: ScrapeTarget[] = [
  { url: "https://www.m1.com.sg/personal/sim-plan", category: "mobile_postpaid", parse: parseM1SimOnly },
  // Prepaid page: no real capture yet (send it with the bookmarklet and the parser can be written).
  { url: "https://www.m1.com.sg/mobile/prepaid-plans", category: "mobile_prepaid", parse: todo("M1 prepaid") },
  { url: "https://www.m1.com.sg/home-broadband", category: "broadband", parse: parseM1Broadband },
];
