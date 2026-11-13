import { closeBrowser, cleanPageText, renderPage } from "../scrapers/browser";
import { errorMessage, finishRun, logCrawl, resolveProviderId, startRun } from "../scrapers/db-upsert";
import { short } from "../scrapers/report";
import { selectByName } from "../scrapers/select";
import { ESIM_DESTINATIONS, type EsimDestination } from "../../src/lib/esim-destinations";
import type { CrawlPageReport, CrawlWarning } from "../../src/types/database";
import { ESIM_BRANDS, candidateUrls, type EsimBrand } from "./brands";
import { refreshFxRates, removeRetiredEsimProviders, upsertEsimPlans, type EsimRow } from "./db";
import { clean } from "./clean";

const CONCURRENCY = Number(process.env.SCRAPE_CONCURRENCY ?? 4);
/** SCRAPE_ONLY="Airalo,Saily" limits the brands; "all" (default) or "none"; see scrapers/select.ts. */
const only = process.env.SCRAPE_ONLY?.trim();
/** ESIM_DESTINATIONS="japan,europe" limits the destinations (debugging). */
const onlyDest = process.env.ESIM_DESTINATIONS?.split(",").map((s) => s.trim()).filter(Boolean);

const PRICE_RE = /(?:US\$|A\$|S\$|HK\$|NT\$|\$|€|£|¥|RM|USD|EUR|GBP|AUD|SGD|MYR)\s?\d|\d\s?(?:USD|EUR|GBP|AUD|SGD|MYR)\b/;

interface BrandResult {
  rows: EsimRow[];
  pages: CrawlPageReport[];
  fetchedKeys: string[];
  missing: string[];
}

async function scrapeBrand(b: EsimBrand, destinations: EsimDestination[]): Promise<BrandResult> {
  const out: BrandResult = { rows: [], pages: [], fetchedKeys: [], missing: [] };
  for (const d of destinations) {
    const tried: string[] = [];
    let done = false;
    for (const url of candidateUrls(b, d)) {
      const started = Date.now();
      const page: CrawlPageReport = { url, engine: "custom parser", raw_count: 0, kept_count: 0, dropped: [] };
      try {
        const rendered = await renderPage(url, { minChars: 500, mode: "nodes", relay: b.relay, feeds: true });
        const text = cleanPageText(rendered.text);
        page.text_chars = text.length;
        if (text.length < 400 || !PRICE_RE.test(text)) {
          tried.push(`${short(url)}: no plan page`);
          continue;
        }
        const raw = b.parse({ url, html: rendered.html, text, feeds: rendered.feeds, states: rendered.states }, d);
        const { rows, dropped } = clean(raw, d, url);
        Object.assign(page, { raw_count: raw.length, kept_count: rows.length, dropped, ms: Date.now() - started });
        if (rows.length === 0) {
          tried.push(`${short(url)}: ${raw.length ? "all plans filtered" : "no plans"}`);
          out.pages.push({ ...page, error: tried.at(-1) });
          continue;
        }
        out.rows.push(...rows);
        out.pages.push(page);
        out.fetchedKeys.push(d.key);
        done = true;
        break;
      } catch (err) {
        tried.push(`${short(url)}: ${errorMessage(err)}`);
        out.pages.push({ ...page, error: errorMessage(err), ms: Date.now() - started });
      }
    }
    if (!done) out.missing.push(d.name);
  }
  return out;
}

function buildWarnings(b: EsimBrand, r: BrandResult, total: number, stats: Awaited<ReturnType<typeof upsertEsimPlans>>): CrawlWarning[] {
  const w: CrawlWarning[] = [];
  const errored = r.pages.filter((p) => p.error && !/no plan page/.test(p.error));
  for (const p of errored) w.push({ level: "warn", message: `Page failed: ${short(p.url)} - ${p.error}` });
  if (r.missing.length) {
    w.push({ level: r.missing.length > total / 2 ? "warn" : "info", message: `No usable plan page for ${r.missing.length}/${total} destinations: ${r.missing.join(", ")}` });
  }
  if (stats.previousCount >= 10 && stats.count < stats.previousCount * 0.7) {
    w.push({ level: "warn", message: `Plan count dropped from ${stats.previousCount} to ${stats.count}` });
  }
  for (const c of stats.changed.filter((x) => x.from > 0 && Math.abs(x.to - x.from) / x.from >= 0.25).slice(0, 5)) {
    w.push({ level: "warn", message: `Price changed ${Math.round(((c.to - c.from) / c.from) * 100)}%: "${c.title}" ${c.from} -> ${c.to}` });
  }
  if (stats.added.length && stats.previousCount) w.push({ level: "info", message: `New plans (${stats.added.length}): ${stats.added.slice(0, 4).join("; ")}${stats.added.length > 4 ? "…" : ""}` });
  void b;
  return w;
}

async function runBrand(b: EsimBrand, destinations: EsimDestination[], runId: string | null): Promise<{ ok: boolean; issues: number }> {
  const started = Date.now();
  let providerId: string | null = null;
  try {
    providerId = await resolveProviderId(b.name, "GL", b.website);
    const r = await scrapeBrand(b, destinations);
    if (!r.rows.length) {
      const errs = r.pages.filter((p) => p.error).slice(0, 3).map((p) => p.error);
      throw new Error(`No plans found for any destination${errs.length ? ` - ${errs.join(" | ")}` : ""}`);
    }
    const stats = await upsertEsimPlans(providerId, r.rows, r.fetchedKeys);
    const warnings = buildWarnings(b, r, destinations.length, stats);
    await logCrawl({
      providerId,
      runId,
      status: "success",
      itemsScraped: stats.count,
      engine: "custom parser",
      pages: r.pages,
      warnings,
      stats,
      durationMs: Date.now() - started,
    });
    console.log(`✔ ${b.name}: ${stats.count} plans across ${r.fetchedKeys.length}/${destinations.length} destinations`);
    return { ok: true, issues: warnings.filter((x) => x.level !== "info").length };
  } catch (err) {
    const message = errorMessage(err);
    console.error(`✘ ${b.name}: ${message}`);
    await logCrawl({ providerId, runId, status: "error", itemsScraped: 0, message, warnings: [{ level: "error", message }], durationMs: Date.now() - started });
    return { ok: false, issues: 1 };
  }
}

async function main() {
  for (const key of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
    if (!process.env[key]) throw new Error(`${key} must be set`);
  }
  // Brands dropped from the list (e.g. Truely, which never crawled successfully) are removed from the database too.
  const retired = await removeRetiredEsimProviders(ESIM_BRANDS.map((b) => b.name)).catch((err) => {
    console.warn(`Could not remove retired brands: ${errorMessage(err)}`);
    return [] as string[];
  });
  if (retired.length) console.log(`Removed retired Travel eSIM brands: ${retired.join(", ")}`);
  const brands = selectByName(only, ESIM_BRANDS, "Travel eSIM brand");
  const destinations = onlyDest?.length ? ESIM_DESTINATIONS.filter((d) => onlyDest.includes(d.key)) : ESIM_DESTINATIONS;
  if (!brands.length) {
    console.log("No Travel eSIM brands selected; skipping.");
    return;
  }
  console.log(await refreshFxRates());
  const env = process.env;
  const runId = await startRun(
    {
      trigger: env.GITHUB_EVENT_NAME ?? "local",
      scope: `Travel eSIM${brands.length === ESIM_BRANDS.length ? "" : `: ${brands.map((b) => b.name).join(", ")}`}`,
      gitSha: env.GITHUB_SHA ?? null,
      runUrl: env.GITHUB_RUN_ID ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}` : null,
    },
    brands.length,
  );
  const results: { ok: boolean; issues: number }[] = new Array(brands.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, brands.length) }, async () => {
      while (next < brands.length) {
        const i = next++;
        results[i] = await runBrand(brands[i], destinations, runId);
      }
    }),
  ).finally(closeBrowser);
  const failed = results.filter((r) => !r.ok).length;
  console.log(`Done: ${results.length - failed}/${results.length} brands succeeded`);
  await finishRun(runId, {
    ok: results.length - failed,
    failed,
    warnings: results.reduce((n, r) => n + r.issues, 0),
    llmCalls: 0,
    llmCostUsd: 0,
    llmSummary: "No model calls: every brand has its own parser",
  });
  if (failed === results.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
