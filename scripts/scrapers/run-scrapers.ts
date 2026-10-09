import { errorMessage, logCrawl, resolveProviderId, upsertPlans } from "./db-upsert";
import { celcomdigi } from "./providers/celcomdigi";
import { m1 } from "./providers/m1";
import { maxis } from "./providers/maxis";
import { singtel } from "./providers/singtel";
import type { ProviderScraper } from "./types";

const scrapers: ProviderScraper[] = [maxis, singtel, celcomdigi, m1];

async function runOne(s: ProviderScraper): Promise<boolean> {
  let providerId: string | null = null;
  try {
    providerId = await resolveProviderId(s.name, s.country);
    const plans = await s.scrape();
    if (!plans.length) throw new Error("No plans extracted");
    const count = await upsertPlans(providerId, plans);
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

async function main() {
  for (const key of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
    if (!process.env[key]) throw new Error(`${key} must be set`);
  }
  const results = await Promise.all(scrapers.map(runOne));
  const failed = results.filter((ok) => !ok).length;
  console.log(`Done: ${results.length - failed}/${results.length} providers succeeded`);
  // Fail the job only if everything failed, so one broken site doesn't block the deploy hook.
  if (failed === results.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
