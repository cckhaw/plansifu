/**
 * Run a brand's parser on its saved pages and print the plans (nothing is written to the database).
 *
 *   npx tsx scripts/esim/try.ts "Airalo"             every saved destination page
 *   npx tsx scripts/esim/try.ts "Airalo" japan       one destination
 *   npx tsx scripts/esim/try.ts "Airalo" --update    also (re)write the .expected.json files used by the tests
 */
import { readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ESIM_DESTINATIONS } from "../../src/lib/esim-destinations";
import { selectByName } from "../scrapers/select";
import { ESIM_BRANDS } from "./brands";
import { clean } from "./clean";
import { ESIM_FIXTURE_DIR, esimExpectedPath, esimFixturePath, loadEsimFixture } from "./fixtures";

const args = process.argv.slice(2);
const update = args.includes("--update");
const [name, only] = args.filter((a) => !a.startsWith("--"));
if (!name) throw new Error('usage: try.ts "<brand>" [destination-key] [--update]');
for (const b of selectByName(name, ESIM_BRANDS, "brand")) {
  const dir = path.join(ESIM_FIXTURE_DIR, b.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
  let keys: string[] = [];
  try {
    keys = readdirSync(dir).filter((f) => f.endsWith(".json") && !f.endsWith(".expected.json")).map((f) => f.replace(/\.json$/, ""));
  } catch {
    console.log(`${b.name}: no fixtures yet - run capture.ts first`);
    continue;
  }
  for (const key of keys.filter((k) => !only || k === only)) {
    const d = ESIM_DESTINATIONS.find((x) => x.key === key)!;
    const page = loadEsimFixture(b.name, key)!;
    console.log(`\n== ${b.name} / ${key}  ${page.url}`);
    try {
      const raw = b.parse(page, d);
      const { rows, dropped } = clean(raw, d, page.url);
      for (const r of rows) console.log(`   ${r.title} | ${r.data_gb}GB ${r.validity_days}d | ${r.price} ${r.currency} | voice=${r.voice_included} sms=${r.sms_included} number=${r.phone_number}${r.coverage ? ` | ${r.coverage}` : ""}${r.perks.length ? ` | ${r.perks.join("; ")}` : ""}`);
      console.log(`   -> ${rows.length} plans (${raw.length} raw, ${dropped.length} dropped${dropped.length ? `: ${dropped.slice(0, 4).map((x) => `${x.title} [${x.reason}]`).join("; ")}` : ""})`);
      if (update) {
        const file = esimExpectedPath(esimFixturePath(b.name, key));
        writeFileSync(file, JSON.stringify(rows.map(({ affiliate_url: _a, ...rest }) => rest), null, 1) + "\n");
        console.log(`   wrote ${file}`);
      }
    } catch (e) {
      console.log(`   PARSER ERROR: ${(e as Error).message}`);
    }
  }
}
