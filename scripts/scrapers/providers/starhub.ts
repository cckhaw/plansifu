import { renderPageText } from "../browser";
import { scrapeTargets } from "../extract";
import type { CrawlPageReport, ScrapedPlan } from "../../../src/types/database";
import type { PageData, ProviderScraper, RawPlan, ScrapeResult, ScrapeTarget } from "../types";
import { clean, contractMonths, dataGb, dom, plan, price, speedMbps } from "../parse-utils";
import { t } from "./define";

const POSTPAID_URL = "https://consumer.starhub.com/personal/store/mobile-plans";

/**
 * The store page is an OutSystems app that generic text extraction can't reliably read, and its text has a
 * regular layout: `<name>`, `$NN.00`, `/mth`, ..., `Select plan`. Parse that directly.
 */
export function parseStarhubPostpaid(text: string): ScrapedPlan[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const plans: ScrapedPlan[] = [];
  for (let i = 0; i < lines.length - 1; i++) {
    const price = lines[i].match(/^\$(\d+(?:\.\d{1,2})?)$/);
    if (!price || lines[i + 1] !== "/mth") continue;

    let j = i - 1;
    while (j >= 0 && /^(limited time|new|best seller)/i.test(lines[j])) j--;
    const name = lines[j];
    if (!name || name.length > 40) continue;

    // Details (roaming, SG allowance) follow "Select plan", up to the next plan's price.
    let end = i + 2;
    while (end < lines.length && !(/^\$\d+(?:\.\d{1,2})?$/.test(lines[end]) && lines[end + 1] === "/mth")) end++;
    const block = lines.slice(i + 2, end).join("\n");
    const sg = (block.split("When in Singapore")[1] ?? "").split(/\nSecurity\b/)[0];
    const promo = block.match(/(\$\d+(?:\.\d+)?)\/mth with code (\w+)/);

    const unlimitedData = /unlimited data/i.test(sg);
    const dataGb = unlimitedData ? -1 : Number(sg.match(/(\d+)\s?GB data/i)?.[1] ?? NaN);
    const mins = Number(sg.match(/([\d,]+)\s?mins/i)?.[1]?.replace(/,/g, "") ?? NaN);
    const sms = Number(sg.match(/([\d,]+)\s?SMS/i)?.[1]?.replace(/,/g, "") ?? NaN);
    const unlimitedCalls = /unlimited (?:data, )?calls/i.test(sg);

    plans.push({
      title: name === "Lite" ? "Unlimited+ Lite" : name,
      category: "mobile_postpaid",
      monthly_price: Number(price[1]),
      currency: "SGD",
      data_gb: Number.isFinite(dataGb) ? dataGb : null,
      speed_mbps: null,
      talktime_mins: unlimitedCalls ? -1 : Number.isFinite(mins) ? mins : null,
      sms_count: unlimitedCalls ? -1 : Number.isFinite(sms) ? sms : null,
      contract_months: 0,
      features: [...block.matchAll(/^(\d+GB (?:global|SEA|APAC) data)$/gim)].map((m) => `${m[1]} roaming`).slice(0, 4),
      affiliate_url: POSTPAID_URL,
      promotion_badge: promo ? `${promo[1]}/mth with code ${promo[2]}` : null,
    });
  }
  return plans;
}

/**
 * Prepaid page: one `.plan-card` per plan; the plan name is the div right before the one holding `.price`,
 * the "Local" section lists the data / calls allowance, `.plan-tag` carries badges ("Best value", promos).
 */
export function parseStarhubPrepaid(page: PageData): RawPlan[] {
  const $ = dom(page);
  const out: RawPlan[] = [];
  $(".plan-card").each((_, el) => {
    const c = $(el);
    const priceEl = c.find(".front-content .price").first();
    const amount = price(priceEl.text());
    const name = clean(priceEl.parent().prev().text());
    if (!name || !amount) return;
    const sections = c
      .find(".plan-details .section")
      .map((_, s) => ({
        title: clean($(s).find(".section-title").first().text()),
        items: $(s)
          .find(".item")
          .map((_, i) => clean($(i).text()))
          .get()
          .filter(Boolean),
      }))
      .get();
    const local = sections.find((s) => /^local/i.test(s.title))?.items ?? [];
    const dataItem = local.find((i) => /\bdata\b/i.test(i));
    const unlimitedCalls = local.some((i) => /unlimited calls/i.test(i));
    const roaming = sections.filter((s) => /roaming/i.test(s.title)).flatMap((s) => s.items);
    const badge = clean(c.find(".plan-tag").first().text());
    out.push(
      plan({
        title: name,
        monthly_price: amount,
        data_gb: dataItem ? (dataGb(dataItem) ?? (/unlimited/i.test(dataItem) ? -1 : null)) : null,
        talktime_mins: unlimitedCalls ? -1 : undefined,
        sms_count: local.some((i) => /unlimited calls\s*&\s*sms/i.test(i)) ? -1 : undefined,
        contract_months: contractMonths(c.find(".no-contract").text()) ?? undefined,
        features: roaming.filter((i) => /data|IDD/i.test(i)).slice(0, 5),
        promotion_badge: badge || undefined,
      }),
    );
  });
  return out;
}

/**
 * Broadband page: `.plan-card-tile` cards (rendered twice, desktop grid + mobile carousel; duplicates are dropped
 * by title). `.data-plan-gigs` is the plan name ("UltraSpeed 10Gbps"), `.data-plan-name` the contract term, `h5` the
 * monthly price for that term and "(U.P. $X)" the usual price.
 */
export function parseStarhubBroadband(page: PageData): RawPlan[] {
  const $ = dom(page);
  const seen = new Set<string>();
  const out: RawPlan[] = [];
  $(".plan-card-tile").each((_, el) => {
    const c = $(el);
    const name = clean(c.find(".data-plan-gigs").first().text());
    const amount = price(c.find(".data-plan-cost h5").first().text());
    if (!name || !amount || seen.has(name.toLowerCase())) return;
    seen.add(name.toLowerCase());
    const terms = c
      .find(".data-plan-name")
      .map((_, n) => clean($(n).text()))
      .get()
      .filter(Boolean);
    const up = clean(c.find(".data-plan-cost").first().text()).match(/U\.P\.\s*(\$[\d,.]+)/i);
    const tag = clean(c.find(".recommended-plan").first().text());
    const href = c.find(".sel-plan a").first().attr("href");
    out.push(
      plan({
        title: name,
        monthly_price: amount,
        speed_mbps: speedMbps(name),
        contract_months: contractMonths(terms.join(" ")) ?? undefined,
        features: c
          .find(".data-plan-details li")
          .map((_, li) => clean($(li).text()))
          .get()
          .slice(0, 4),
        promotion_badge: [terms.find((x) => /sign-ups/i.test(x)), tag, up ? `U.P. ${up[1]}/mth` : ""].filter(Boolean).join(" | ") || undefined,
        affiliate_url: href,
      }),
    );
  });
  return out;
}

/** The two ordinary pages (declared as targets so capture.ts / try.ts can reach them). */
const restTargets: ScrapeTarget[] = [
  t.pre("https://www.starhub.com/personal/mobile/starhub-prepaid.html", parseStarhubPrepaid),
  t.bb("https://www.starhub.com/personal/broadband.html", parseStarhubBroadband),
];

export const starhub: ProviderScraper = {
  name: "StarHub",
  country: "SG",
  website: "https://www.starhub.com",
  targets: restTargets,
  async scrape(): Promise<ScrapeResult> {
    const started = Date.now();
    const pages: CrawlPageReport[] = [];
    let postpaid: ScrapedPlan[] = [];
    const postpaidPage: CrawlPageReport = { url: POSTPAID_URL, engine: "custom parser", raw_count: 0, kept_count: 0, dropped: [] };
    try {
      postpaid = parseStarhubPostpaid(await renderPageText(POSTPAID_URL, 800, "inner"));
      postpaidPage.raw_count = postpaidPage.kept_count = postpaid.length;
      if (postpaid.length === 0) console.warn("[starhub] postpaid page parsed 0 plans");
    } catch (err) {
      postpaidPage.error = (err as Error).message;
      console.warn(`[starhub] postpaid page failed: ${postpaidPage.error}`);
    }
    postpaidPage.ms = Date.now() - started;
    pages.push(postpaidPage);

    const rest = await scrapeTargets(restTargets, "SG", "StarHub");
    pages.push(...rest.pages);
    return { plans: [...postpaid, ...rest.plans], complete: !postpaidPage.error && postpaid.length > 0 && rest.complete, pages };
  },
};
