/**
 * Crawl a brand live (no database): render each destination page the way the weekly crawl does, parse and clean it, and
 * print what would be stored and what the crawl report would flag. Use it to check a brand after changing its parser or URLs.
 *
 *   npx tsx scripts/esim/try-live.ts "Airalo"                 all 16 destinations
 *   npx tsx scripts/esim/try-live.ts "Airalo" japan,europe     chosen destinations
 *   npx tsx scripts/esim/try-live.ts "Airalo" --plans          also print every plan
 */
import { ESIM_DESTINATIONS } from "../../src/lib/esim-destinations";
import { cleanPageText, closeBrowser, renderPage } from "../scrapers/browser";
import { selectByName } from "../scrapers/select";
import { ESIM_BRANDS, candidateUrls } from "./brands";
import { clean } from "./clean";

const PRICE_RE = /(?:US\$|A\$|S\$|HK\$|NT\$|\$|€|£|¥|RM|USD|EUR|GBP|AUD|SGD|MYR)\s?\d|\d\s?(?:USD|EUR|GBP|AUD|SGD|MYR)\b/;
const args = process.argv.slice(2);
const showPlans = args.includes("--plans");
const [name, dests] = args.filter((a) => !a.startsWith("--"));
if (!name) throw new Error('usage: try-live.ts "<brand>" [destination,keys] [--plans]');
const keys = dests ? dests.split(",") : ESIM_DESTINATIONS.map((d) => d.key);

async function main() {
  for (const b of selectByName(name, ESIM_BRANDS, "brand")) {
    const missing: string[] = [];
    let total = 0;
    for (const key of keys) {
      const d = ESIM_DESTINATIONS.find((x) => x.key === key);
      if (!d) throw new Error(`unknown destination ${key}`);
      const tried: string[] = [];
      let done = false;
      for (const url of candidateUrls(b, d)) {
        try {
          const r = await renderPage(url, { minChars: 500, mode: "nodes", relay: b.relay, feeds: true });
          const text = cleanPageText(r.text);
          if (text.length < 400 || !PRICE_RE.test(text)) {
            tried.push(`${url}: no plan page`);
            continue;
          }
          const raw = b.parse({ url, html: r.html, text, feeds: r.feeds }, d);
          const { rows, dropped } = clean(raw, d, url);
          if (!rows.length) {
            tried.push(`${url}: ${raw.length ? "all plans filtered" : "no plans"}`);
            continue;
          }
          total += rows.length;
          const currencies = [...new Set(rows.map((x) => x.currency))].join("/");
          console.log(`${b.name} ${key}: ${rows.length} plans (${raw.length} raw, ${dropped.length} dropped) ${currencies}  ${url}`);
          if (showPlans) for (const p of rows) console.log(`     ${p.title} | ${p.data_gb}GB ${p.validity_days}d | ${p.price} ${p.currency} | ${p.coverage ?? "single"}`);
          done = true;
          break;
        } catch (e) {
          tried.push(`${url}: ${(e as Error).message}`);
        }
      }
      if (!done) {
        missing.push(d.name);
        console.log(`${b.name} ${key}: NO PLANS  (${tried.join(" | ")})`);
      }
    }
    console.log(`== ${b.name}: ${total} plans, no plan page for ${missing.length}/${keys.length}: ${missing.join(", ") || "-"}`);
  }
}

main().finally(closeBrowser);
