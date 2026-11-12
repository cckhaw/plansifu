/**
 * Save a brand's destination pages as test fixtures, so its parser can be written and tested offline.
 *
 *   npx tsx scripts/esim/capture.ts "Airalo"                       default destinations (japan, europe, global, thailand, united-states)
 *   npx tsx scripts/esim/capture.ts "Airalo" japan,south-korea     chosen destination keys (see src/lib/esim-destinations.ts)
 */
import { cleanPageText, closeBrowser, renderPage } from "../scrapers/browser";
import { ESIM_DESTINATIONS } from "../../src/lib/esim-destinations";
import { ESIM_BRANDS, candidateUrls } from "./brands";
import { saveEsimFixture } from "./fixtures";
import { selectByName } from "../scrapers/select";

const DEFAULT_DESTINATIONS = ["japan", "europe", "global", "thailand", "united-states"];
const PRICE_RE = /(?:US\$|A\$|S\$|HK\$|NT\$|\$|€|£|¥|RM|USD|EUR|GBP|AUD|SGD|MYR)\s?\d|\d\s?(?:USD|EUR|GBP|AUD|SGD|MYR)\b/;

async function main() {
  const [name, dests] = process.argv.slice(2);
  if (!name) throw new Error('usage: capture.ts "<brand>" [destination,keys]');
  const keys = dests ? dests.split(",").map((s) => s.trim()) : DEFAULT_DESTINATIONS;
  for (const b of selectByName(name, ESIM_BRANDS, "brand")) {
    for (const key of keys) {
      const d = ESIM_DESTINATIONS.find((x) => x.key === key);
      if (!d) throw new Error(`unknown destination key ${key}`);
      let saved = false;
      for (const url of candidateUrls(b, d)) {
        try {
          const r = await renderPage(url, { minChars: 500, mode: "nodes", relay: b.relay, feeds: true });
          const text = cleanPageText(r.text);
          if (text.length < 400 || !PRICE_RE.test(text)) {
            console.log(`  ${b.name} ${key}: no plan page at ${url}`);
            continue;
          }
          console.log(`saved ${saveEsimFixture(b.name, key, { url, html: r.html, text, feeds: r.feeds })} (${text.length} chars, ${r.feeds.length} feeds) from ${url}`);
          saved = true;
          break;
        } catch (e) {
          console.log(`  ${b.name} ${key}: ${url} failed: ${(e as Error).message}`);
        }
      }
      if (!saved) console.log(`NOT SAVED ${b.name} ${key}`);
    }
  }
}

main().finally(closeBrowser);
