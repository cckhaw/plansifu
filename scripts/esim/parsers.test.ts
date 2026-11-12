/**
 * Regression tests for the Travel eSIM brand parsers: each saved page (fixtures/<brand>/<destination>.json) must parse
 * to the checked-in plans (<destination>.expected.json). `npm run test:parsers` runs these with the telco ones.
 * To accept a deliberate change: `npx tsx scripts/esim/try.ts "<brand>" --update` and review the diff.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { ESIM_DESTINATIONS } from "../../src/lib/esim-destinations";
import { ESIM_BRANDS } from "./brands";
import { clean } from "./clean";
import { esimExpectedPath, esimFixturePath, loadEsimFixture } from "./fixtures";

for (const b of ESIM_BRANDS) {
  describe(`eSIM ${b.name}`, () => {
    for (const d of ESIM_DESTINATIONS) {
      const page = loadEsimFixture(b.name, d.key);
      if (!page) continue;
      it(d.key, () => {
        const { rows } = clean(b.parse(page, d), d, page.url);
        assert.ok(rows.length > 0, "parser found no plans");
        const expectedFile = esimExpectedPath(esimFixturePath(b.name, d.key));
        if (existsSync(expectedFile)) {
          assert.deepEqual(rows.map(({ affiliate_url: _a, ...rest }) => rest), JSON.parse(readFileSync(expectedFile, "utf8")));
        }
      });
    }
  });
}
