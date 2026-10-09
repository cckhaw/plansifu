import { closeBrowser } from "./browser";
import { llmUsage, llmUsageSummary } from "./llm-extract";
import { errorMessage, finishRun, logCrawl, resolveProviderId, startRun, upsertPlans } from "./db-upsert";
import { celcomdigi } from "./providers/celcomdigi";
import { m1 } from "./providers/m1";
import { malaysiaProviders } from "./providers/malaysia";
import { maxis } from "./providers/maxis";
import { singaporeProviders } from "./providers/singapore";
import { singtel } from "./providers/singtel";
import { buildWarnings, engineOf, short } from "./report";
import { starhub } from "./providers/starhub";
import { zym } from "./providers/zym";
import type { ProviderScraper, ScrapeResult } from "./types";

const scrapers: ProviderScraper[] = [maxis, singtel, celcomdigi, m1, ...malaysiaProviders, starhub, zym, ...singaporeProviders];

/** Providers run in parallel, capped so Firecrawl rate limits and headless browsers aren't swamped. */
const CONCURRENCY = Number(process.env.SCRAPE_CONCURRENCY ?? 4);
/** Optional: SCRAPE_ONLY="Maxis,M1" limits a run to named providers (handy when debugging). */
const only = process.env.SCRAPE_ONLY?.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

interface ProviderOutcome {
  ok: boolean;
  /** Warnings and errors (info notes are not counted). */
  issues: number;
}

async function runOne(s: ProviderScraper, runId: string | null): Promise<ProviderOutcome> {
  const started = Date.now();
  let providerId: string | null = null;
  let result: ScrapeResult | null = null;
  try {
    providerId = await resolveProviderId(s.name, s.country, s.website);
    result = await s.scrape();
    if (!result.plans.length) {
      const errors = result.pages.filter((p) => p.error).map((p) => `${short(p.url)}: ${p.error}`);
      throw new Error(errors.length ? `All pages failed - ${errors.join(" | ")}` : "No plans extracted");
    }
    const stats = await upsertPlans(providerId, result.plans, { deactivateMissing: result.complete });
    const warnings = buildWarnings(result, stats);
    if (!result.complete) console.warn(`⚠ ${s.name}: some pages failed; existing plans were kept active`);
    await logCrawl({
      providerId,
      runId,
      status: "success",
      itemsScraped: stats.count,
      engine: engineOf(result.pages),
      pages: result.pages,
      warnings,
      stats,
      durationMs: Date.now() - started,
    });
    console.log(`✔ ${s.name} (${s.country}): ${stats.count} plans`);
    return { ok: true, issues: warnings.filter((w) => w.level !== "info").length };
  } catch (err) {
    const message = errorMessage(err);
    console.error(`✘ ${s.name} (${s.country}): ${message}`);
    const pages = result?.pages ?? [];
    await logCrawl({
      providerId,
      runId,
      status: "error",
      itemsScraped: 0,
      message,
      engine: engineOf(pages),
      pages,
      warnings: [{ level: "error", message }, ...(result ? buildWarnings(result).filter((w) => !w.message.startsWith("Page failed")) : [])],
      durationMs: Date.now() - started,
    });
    return { ok: false, issues: 1 };
  }
}

async function runPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
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
  const env = process.env;
  const runId = await startRun(
    {
      trigger: env.GITHUB_EVENT_NAME ?? "local",
      scope: only?.length ? only.join(", ") : null,
      gitSha: env.GITHUB_SHA ?? null,
      runUrl: env.GITHUB_RUN_ID ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}` : null,
    },
    selected.length,
  );
  const results = await runPool(selected, CONCURRENCY, (s) => runOne(s, runId)).finally(closeBrowser);
  const usage = llmUsage();
  console.log(`LLM usage: ${llmUsageSummary()}`);
  const failed = results.filter((r) => !r.ok).length;
  console.log(`Done: ${results.length - failed}/${results.length} providers succeeded`);
  await finishRun(runId, {
    ok: results.length - failed,
    failed,
    warnings: results.reduce((n, r) => n + r.issues, 0),
    llmCalls: usage.calls,
    llmCostUsd: usage.costUsd,
    llmSummary: llmUsageSummary(),
  });
  // Fail the job only if everything failed, so one broken site doesn't block the deploy hook.
  if (failed === results.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
