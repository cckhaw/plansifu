import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import type { CrawlingLog, CrawlRun, Country } from "@/types/database";
import { getAdminClient } from "./supabase-admin";

/** A provider is "stale" if its last successful crawl is older than this (the crawl runs daily). */
export const STALE_HOURS = 30;
/** Travel eSIM brands are crawled weekly, so they only count as stale after a missed week. */
export const ESIM_STALE_HOURS = 8 * 24;

export interface ProviderCrawl {
  provider: { id: string; name: string; country: Country | "GL" };
  /** Latest crawl log for the provider (from any run). */
  log: CrawlingLog;
  /** Latest successful log, if different from `log` (shown when the latest attempt failed). */
  lastSuccessAt: string | null;
  stale: boolean;
}

export interface CrawlReportData {
  /** False when Supabase isn't configured on this deployment. */
  configured: boolean;
  /** False until supabase/migrations/02_crawl_reports.sql has been run. */
  schemaReady: boolean;
  error?: string;
  runs: CrawlRun[];
  providers: ProviderCrawl[];
  /** Providers in the database that have never been crawled. */
  neverCrawled: string[];
}

export function isAuthorised(key: string | undefined): boolean {
  const expected = process.env.CRAWL_REPORT_KEY;
  if (!expected || !key) return false;
  const a = createHash("sha256").update(key).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function getCrawlReport(): Promise<CrawlReportData> {
  const db = getAdminClient();
  if (!db) return { configured: false, schemaReady: false, runs: [], providers: [], neverCrawled: [] };

  const logsRes = await db
    .from("crawling_logs")
    .select("*, provider:providers(id, name, country)")
    .order("executed_at", { ascending: false })
    .limit(600);
  if (logsRes.error) {
    return { configured: true, schemaReady: false, error: logsRes.error.message, runs: [], providers: [], neverCrawled: [] };
  }

  const runsRes = await db.from("crawl_runs").select("*").order("started_at", { ascending: false }).limit(10);
  const schemaReady = !runsRes.error;

  type Row = CrawlingLog & { provider: { id: string; name: string; country: Country | "GL" } | null };
  const latest = new Map<string, Row>();
  const lastSuccess = new Map<string, string>();
  for (const row of (logsRes.data ?? []) as unknown as Row[]) {
    if (!row.provider) continue;
    if (!latest.has(row.provider.id)) latest.set(row.provider.id, row);
    if (row.status === "success" && !lastSuccess.has(row.provider.id)) lastSuccess.set(row.provider.id, row.executed_at);
  }

  const now = Date.now();
  const providers: ProviderCrawl[] = [...latest.values()].map((log) => {
    const ok = lastSuccess.get(log.provider!.id) ?? null;
    return {
      provider: log.provider!,
      log,
      lastSuccessAt: ok,
      stale: !ok || now - new Date(ok).getTime() > (log.provider!.country === "GL" ? ESIM_STALE_HOURS : STALE_HOURS) * 3_600_000,
    };
  });

  const all = await db.from("providers").select("id, name");
  const neverCrawled = ((all.data ?? []) as { id: string; name: string }[]).filter((p) => !latest.has(p.id)).map((p) => p.name);

  return {
    configured: true,
    schemaReady,
    error: runsRes.error?.message,
    runs: (runsRes.data ?? []) as CrawlRun[],
    providers,
    neverCrawled,
  };
}
