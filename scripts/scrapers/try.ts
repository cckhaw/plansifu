/**
 * Run a provider's parsers and print the plans they find (nothing is written to the database).
 *
 *   npx tsx scripts/scrapers/try.ts "Maxis"                 on the saved fixtures (offline, instant)
 *   npx tsx scripts/scrapers/try.ts "Maxis" --live          on freshly rendered pages
 *   npx tsx scripts/scrapers/try.ts "Maxis" --update        also (re)write the .expected.json files used by the tests
 */
import { writeFileSync } from "node:fs";
import { cleanPageText, closeBrowser, renderPage } from "./browser";
import { normalizePlans } from "./extract";
import { expectedPath, fixturePath, loadFixture, providerKey } from "./fixtures";
import { providers } from "./providers";
import { selectByName } from "./select";
import type { PageData } from "./types";

async function main() {
  const [name, ...flags] = process.argv.slice(2);
  if (!name) throw new Error('usage: try.ts "<provider>" [--live] [--update]');
  const live = flags.includes("--live");
  const update = flags.includes("--update");
  for (const p of selectByName(name, providers, "provider")) {
    for (const t of p.targets ?? []) {
      console.log(`\n== ${p.name} (${p.country}) ${t.url}${t.relay ? " [relay]" : ""}${t.expectEmpty ? " [expect empty]" : ""}`);
      let page: PageData | null = null;
      if (live) {
        const r = await renderPage(t.url, { minChars: 800, mode: "nodes", feeds: true });
        page = { url: t.url, html: r.html, text: cleanPageText(r.text), feeds: r.feeds, states: r.states };
      } else {
        page = loadFixture(providerKey(p), t.url);
        if (!page) {
          console.log("   no fixture yet - run capture.ts first");
          continue;
        }
      }
      try {
        const raw = t.parse(page);
        const { plans, dropped } = normalizePlans(raw, { country: p.country, category: t.category, fallbackUrl: t.url, mixed: t.mixed });
        for (const pl of plans) {
          console.log(`   ${pl.category.padEnd(15)} ${String(pl.monthly_price).padStart(7)} ${pl.currency}  ${pl.title}  | data=${pl.data_gb} speed=${pl.speed_mbps} contract=${pl.contract_months} calls=${pl.talktime_mins} sms=${pl.sms_count}${pl.features.length ? ` | ${pl.features.join("; ")}` : ""}${pl.promotion_badge ? ` | promo: ${pl.promotion_badge}` : ""}`);
        }
        console.log(`   -> ${plans.length} plans (${raw.length} raw, ${dropped.length} dropped${dropped.length ? `: ${dropped.map((d) => `${d.title} [${d.reason}]`).slice(0, 5).join("; ")}` : ""})`);
        if (update) {
          const file = expectedPath(fixturePath(providerKey(p), t.url));
          writeFileSync(file, JSON.stringify(plans.map(({ affiliate_url: _a, ...rest }) => rest), null, 1) + "\n");
          console.log(`   wrote ${file}`);
        }
      } catch (e) {
        console.log(`   PARSER ERROR: ${(e as Error).message}`);
      }
    }
  }
}

main().finally(closeBrowser);
