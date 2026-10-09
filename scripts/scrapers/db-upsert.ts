import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Country, CrawlPageReport, CrawlWarning, ScrapedPlan } from "../../src/types/database";

let client: SupabaseClient | null = null;

/** Supabase errors are plain objects (PostgrestError), not Error instances. */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const e = err as { message?: string; code?: string; details?: string; hint?: string };
    const parts = [e.message, e.code && `code=${e.code}`, e.details, e.hint].filter(Boolean);
    if (parts.length) return parts.join(" | ");
    return JSON.stringify(err);
  }
  return String(err);
}

export function getAdminClient(): SupabaseClient {
  if (client) return client;
  const rawUrl = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!rawUrl || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  // supabase-js appends /rest/v1 itself; tolerate trailing slashes or pasted API paths.
  const url = new URL(rawUrl).origin;
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export async function resolveProviderId(name: string, country: Country, website?: string): Promise<string> {
  const db = getAdminClient();
  const { data, error } = await db
    .from("providers")
    .select("id")
    .eq("name", name)
    .eq("country", country)
    .maybeSingle();
  if (error) throw error;
  if (data) return data.id as string;
  const { data: created, error: insertErr } = await db
    .from("providers")
    .insert({ name, country, website_url: website ?? null })
    .select("id")
    .single();
  if (insertErr) throw insertErr;
  return created.id as string;
}

export interface UpsertStats {
  count: number;
  /** Active plans before this crawl. */
  previousCount: number;
  added: string[];
  removed: string[];
  changed: { title: string; from: number; to: number }[];
}

export async function upsertPlans(
  providerId: string,
  plans: ScrapedPlan[],
  opts: { deactivateMissing: boolean } = { deactivateMissing: true },
): Promise<UpsertStats> {
  const db = getAdminClient();

  // Keep affiliate URLs / promo badges that were curated by hand: scrapers only
  // supply a landing-page fallback and may not see exclusive promos.
  const { data: existing, error: selErr } = await db
    .from("plans")
    .select("title, affiliate_url, promotion_badge, monthly_price, is_active")
    .eq("provider_id", providerId);
  if (selErr) throw selErr;
  const prev = new Map((existing ?? []).map((p) => [p.title as string, p]));
  const previousActive = (existing ?? []).filter((p) => p.is_active);

  const now = new Date().toISOString();
  // (provider_id, title) is the conflict key: one row per title in a batch.
  plans = [...new Map(plans.map((p) => [p.title.toLowerCase(), p])).values()];

  const newTitles = new Set(plans.map((p) => p.title));
  const stats: UpsertStats = {
    count: plans.length,
    previousCount: previousActive.length,
    added: plans.filter((p) => !prev.get(p.title)?.is_active).map((p) => p.title),
    removed: opts.deactivateMissing ? previousActive.filter((p) => !newTitles.has(p.title as string)).map((p) => p.title as string) : [],
    changed: plans
      .filter((p) => prev.get(p.title)?.is_active && Math.abs(Number(prev.get(p.title)!.monthly_price) - p.monthly_price) >= 0.01)
      .map((p) => ({ title: p.title, from: Number(prev.get(p.title)!.monthly_price), to: p.monthly_price })),
  };

  const rows = plans.map((p) => {
    const old = prev.get(p.title);
    return {
      ...p,
      provider_id: providerId,
      affiliate_url: old?.affiliate_url ?? p.affiliate_url,
      promotion_badge: p.promotion_badge ?? old?.promotion_badge ?? null,
      is_active: true,
      updated_at: now,
    };
  });

  if (rows.length) {
    const { error } = await db.from("plans").upsert(rows, { onConflict: "provider_id,title" });
    if (error) throw error;
  }

  // Plans that vanished from the provider's site are hidden, not deleted - but only after a
  // complete scrape; if any page failed we can't tell "gone" from "not fetched".
  if (opts.deactivateMissing) {
    const { error: staleErr } = await db
      .from("plans")
      .update({ is_active: false })
      .eq("provider_id", providerId)
      .lt("updated_at", now);
    if (staleErr) throw staleErr;
  }
  return stats;
}

export interface CrawlLogEntry {
  providerId: string | null;
  runId: string | null;
  status: "success" | "error";
  itemsScraped: number;
  message?: string;
  engine?: string;
  pages?: CrawlPageReport[];
  warnings?: CrawlWarning[];
  stats?: Pick<UpsertStats, "previousCount" | "added" | "removed" | "changed">;
  durationMs?: number;
}

/** Postgres/PostgREST errors for a column or table that the report migration (02) hasn't created yet. */
const isMissingSchema = (err: unknown) => /42703|42P01|PGRST204|PGRST205|schema cache|does not exist/i.test(errorMessage(err));

let reportSchemaWarned = false;
function warnReportSchema() {
  if (reportSchemaWarned) return;
  reportSchemaWarned = true;
  console.warn("[log] crawl-report columns/tables not found; run supabase/migrations/02_crawl_reports.sql. Falling back to basic logging.");
}

export async function logCrawl(e: CrawlLogEntry): Promise<void> {
  const db = getAdminClient();
  const basic = {
    provider_id: e.providerId,
    status: e.status,
    items_scraped: e.itemsScraped,
    error_message: e.message ?? null,
  };
  try {
    const { error } = await db.from("crawling_logs").insert({
      ...basic,
      run_id: e.runId,
      engine: e.engine ?? null,
      pages: e.pages ?? [],
      warnings: e.warnings ?? [],
      previous_count: e.stats?.previousCount ?? null,
      plans_added: e.stats?.added.length ?? null,
      plans_removed: e.stats?.removed.length ?? null,
      plans_changed: e.stats?.changed.length ?? null,
      duration_ms: e.durationMs ?? null,
    });
    if (!error) return;
    if (!isMissingSchema(error)) throw error;
    warnReportSchema();
    const { error: fallbackErr } = await db.from("crawling_logs").insert(basic);
    if (fallbackErr) throw fallbackErr;
  } catch (err) {
    // Logging must never mask the real result or abort other providers.
    console.error(`[log] failed to write crawling_logs: ${errorMessage(err)}`);
  }
}

export interface RunInfo {
  trigger: string;
  scope: string | null;
  gitSha: string | null;
  runUrl: string | null;
}

export async function startRun(info: RunInfo, providersTotal: number): Promise<string | null> {
  try {
    const { data, error } = await getAdminClient()
      .from("crawl_runs")
      .insert({
        trigger: info.trigger,
        scope: info.scope,
        git_sha: info.gitSha,
        run_url: info.runUrl,
        providers_total: providersTotal,
      })
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  } catch (err) {
    if (isMissingSchema(err)) warnReportSchema();
    else console.error(`[log] failed to create crawl_runs row: ${errorMessage(err)}`);
    return null;
  }
}

export async function finishRun(
  runId: string | null,
  summary: { ok: number; failed: number; warnings: number; llmCalls: number; llmCostUsd: number; llmSummary: string },
): Promise<void> {
  if (!runId) return;
  const { error } = await getAdminClient()
    .from("crawl_runs")
    .update({
      finished_at: new Date().toISOString(),
      providers_ok: summary.ok,
      providers_failed: summary.failed,
      warnings_count: summary.warnings,
      llm_calls: summary.llmCalls,
      llm_cost_usd: Math.round(summary.llmCostUsd * 10000) / 10000,
      llm_summary: summary.llmSummary,
    })
    .eq("id", runId);
  if (error) console.error(`[log] failed to finish crawl_runs row: ${errorMessage(error)}`);
}
