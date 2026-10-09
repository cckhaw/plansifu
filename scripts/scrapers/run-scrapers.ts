import { errorMessage, logCrawl, resolveProviderId, upsertPlans } from "./db-upsert";
import { celcomdigi } from "./providers/celcomdigi";
import { m1 } from "./providers/m1";
import { malaysiaProviders } from "./providers/malaysia";
import { maxis } from "./providers/maxis";
import { singaporeProviders } from "./providers/singapore";
import { singtel } from "./providers/singtel";
import { starhub } from "./providers/starhub";
import { zym } from "./providers/zym";
import type { ProviderScraper } from "./types";

const scrapers: ProviderScraper[] = [maxis, singtel, celcomdigi, m1, ...malaysiaProviders, starhub, zym, ...singaporeProviders];

/** Providers run in parallel, capped so Firecrawl rate limits and headless browsers aren't swamped. */
const CONCURRENCY = Number(process.env.SCRAPE_CONCURRENCY ?? 4);
/** Optional: SCRAPE_ONLY="Maxis,M1" limits a run to named providers (handy when debugging). */
const only = process.env.SCRAPE_ONLY?.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

async function runOne(s: ProviderScraper): Promise<boolean> {
  let providerId: string | null = null;
  try {
    providerId = await resolveProviderId(s.name, s.country, s.website);
    const { plans, complete } = await s.scrape();
    if (!plans.length) throw new Error("No plans extracted");
    const count = await upsertPlans(providerId, plans, { deactivateMissing: complete });
    if (!complete) console.warn(`⚠ ${s.name}: some pages failed; existing plans were kept active`);
    await logCrawl(providerId, "success", count);
    console.log(`✔ ${s.name} (${s.country}): ${count} plans`);
    return true;
  } catch (err) {
    const message = errorMessage(err);
    console.error(`✘ ${s.name} (${s.country}): ${message}`);
    await logCrawl(providerId, "error", 0, message);
    return false;
  }
}

async function runPool<T>(items: T[], limit: number, fn: (item: T) => Promise<boolean>): Promise<boolean[]> {
  const results: boolean[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    }),
  );
  return results;
}

async function main() {
  for (const key of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
    if (!process.env[key]) throw new Error(`${key} must be set`);
  }
  const selected = only?.length ? scrapers.filter((s) => only.includes(s.name.toLowerCase())) : scrapers;
  const results = await runPool(selected, CONCURRENCY, runOne);
  const failed = results.filter((ok) => !ok).length;
  console.log(`Done: ${results.length - failed}/${results.length} providers succeeded`);
  // Fail the job only if everything failed, so one broken site doesn't block the deploy hook.
  if (failed === results.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
