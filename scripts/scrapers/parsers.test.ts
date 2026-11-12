/**
 * Regression tests for the site parsers: each saved page (fixtures/<provider>/<page>.json) must still parse to
 * the checked-in plans (<page>.expected.json). Run with `npm run test:parsers`; no network, no browser, no model.
 * To accept a deliberate parser change: `npx tsx scripts/scrapers/try.ts "<provider>" --update` and review the diff.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { normalizePlans } from "./extract";
import { expectedPath, fixturePath, loadFixture, providerKey } from "./fixtures";
import { providers } from "./providers";

for (const p of providers) {
  describe(`${p.name} (${p.country})`, () => {
    for (const t of p.targets ?? []) {
      const fixture = fixturePath(providerKey(p), t.url);
      it(t.url, (ctx) => {
        const page = loadFixture(providerKey(p), t.url);
        if (!page) return ctx.skip("no fixture saved yet");
        const raw = t.parse(page);
        const { plans } = normalizePlans(raw, { country: p.country, category: t.category, fallbackUrl: t.url, mixed: t.mixed });
        if (!t.expectEmpty) assert.ok(plans.length > 0, "parser found no plans");
        for (const pl of plans) {
          assert.ok(pl.title && pl.monthly_price > 0, `bad plan ${JSON.stringify(pl)}`);
        }
        const expectedFile = expectedPath(fixture);
        if (existsSync(expectedFile)) {
          const expected = JSON.parse(readFileSync(expectedFile, "utf8"));
          assert.deepEqual(
            plans.map(({ affiliate_url: _a, ...rest }) => rest),
            expected,
          );
        }
      });
    }
  });
}
