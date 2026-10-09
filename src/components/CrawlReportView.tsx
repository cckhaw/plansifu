import type { CrawlPageReport, CrawlRun, CrawlWarning } from "@/types/database";
import type { CrawlReportData, ProviderCrawl } from "@/lib/crawl-report";
import { STALE_HOURS } from "@/lib/crawl-report";

const FLAG = { MY: "🇲🇾", SG: "🇸🇬" } as const;
const TZ = "Asia/Singapore"; // same offset as Malaysia (UTC+8)

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", { timeZone: TZ, weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  return `${date}, ${time} MYT/SGT`;
}

export function timeAgo(iso: string | null | undefined, now: number): string {
  if (!iso) return "never";
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins} min ago`;
  const hrs = mins / 60;
  if (hrs < 48) return `${hrs.toFixed(hrs < 10 ? 1 : 0)} h ago`;
  return `${Math.round(hrs / 24)} days ago`;
}

type Status = "failed" | "stale" | "warning" | "ok";

function statusOf(p: ProviderCrawl): Status {
  if (p.log.status !== "success") return "failed";
  if (p.stale) return "stale";
  if ((p.log.warnings ?? []).some((w) => w.level !== "info")) return "warning";
  return "ok";
}

const STATUS_STYLE: Record<Status, { label: string; dot: string; chip: string }> = {
  failed: { label: "Failed", dot: "bg-red-500", chip: "bg-red-50 text-red-700 ring-red-200" },
  stale: { label: "Stale", dot: "bg-orange-500", chip: "bg-orange-50 text-orange-700 ring-orange-200" },
  warning: { label: "Check", dot: "bg-amber-400", chip: "bg-amber-50 text-amber-800 ring-amber-200" },
  ok: { label: "OK", dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
};
const ORDER: Record<Status, number> = { failed: 0, stale: 1, warning: 2, ok: 3 };

const ENGINE_STYLE: Record<string, string> = {
  "browser+llm": "bg-sky-50 text-sky-700 ring-sky-200",
  firecrawl: "bg-orange-50 text-orange-700 ring-orange-200",
  "custom parser": "bg-violet-50 text-violet-700 ring-violet-200",
};
const ENGINE_LABEL: Record<string, string> = {
  "browser+llm": "Playwright + Haiku",
  firecrawl: "Firecrawl",
  "custom parser": "Custom parser",
};

function EngineBadges({ engine }: { engine: string | null | undefined }) {
  if (!engine) return <span className="text-slate-400">-</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {engine.split(" + ").map((e) => (
        <span key={e} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${ENGINE_STYLE[e] ?? "bg-slate-50 text-slate-600 ring-slate-200"}`}>
          {ENGINE_LABEL[e] ?? e}
        </span>
      ))}
    </span>
  );
}

const LEVEL_STYLE: Record<CrawlWarning["level"], string> = {
  error: "border-red-300 bg-red-50 text-red-800",
  warn: "border-amber-300 bg-amber-50 text-amber-900",
  info: "border-slate-200 bg-slate-50 text-slate-700",
};

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "bad" | "warn" | "good" }) {
  const color = tone === "bad" ? "text-red-600" : tone === "warn" ? "text-amber-600" : tone === "good" ? "text-emerald-600" : "text-sifu-navy";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

const shortUrl = (u: string) => u.replace(/^https?:\/\/(www\.)?/, "");

function PageRow({ p }: { p: CrawlPageReport }) {
  const bad = !!p.error;
  return (
    <tr className={bad ? "bg-red-50/60" : ""}>
      <td className="max-w-[18rem] break-all py-1.5 pr-3 align-top">
        <a href={p.url} target="_blank" rel="noreferrer" className="text-sky-700 hover:underline">{shortUrl(p.url)}</a>
        {p.error && <p className="mt-0.5 text-xs font-medium text-red-700">{p.error}</p>}
        {p.dropped.length > 0 && (
          <p className="mt-0.5 text-xs text-slate-500">Filtered out: {p.dropped.slice(0, 6).map((d) => `${d.title} (${d.reason})`).join("; ")}{p.dropped.length > 6 ? ` +${p.dropped.length - 6}` : ""}</p>
        )}
      </td>
      <td className="whitespace-nowrap py-1.5 pr-3 align-top"><EngineBadges engine={p.engine} /></td>
      <td className="whitespace-nowrap py-1.5 pr-3 text-right align-top tabular-nums">{p.raw_count} → <strong>{p.kept_count}</strong></td>
      <td className="whitespace-nowrap py-1.5 pr-3 text-right align-top tabular-nums text-slate-500">{p.text_chars ? `${(p.text_chars / 1000).toFixed(1)}k` : "-"}</td>
      <td className="whitespace-nowrap py-1.5 text-right align-top tabular-nums text-slate-500">{p.ms ? `${(p.ms / 1000).toFixed(0)}s` : "-"}</td>
    </tr>
  );
}

function ProviderRow({ p, now }: { p: ProviderCrawl; now: number }) {
  const status = statusOf(p);
  const st = STATUS_STYLE[status];
  const { log } = p;
  const pages = log.pages ?? [];
  // The failure message is already shown in its own banner.
  const warnings = (log.warnings ?? []).filter((w) => w.message !== log.error_message);
  const issues = warnings.filter((w) => w.level !== "info").length + (log.status !== "success" ? 1 : 0);
  const delta = log.previous_count != null && log.status === "success" ? log.items_scraped - log.previous_count : null;
  const pagesOk = pages.filter((x) => !x.error).length;

  return (
    <details className="group rounded-xl border border-slate-200 bg-white open:shadow-sm" open={status === "failed"}>
      <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 md:grid-cols-[minmax(10rem,1.2fr)_minmax(9rem,1fr)_6rem_7rem_6rem_9rem]">
        <span className="flex items-center gap-2 font-bold">
          <span className={`size-2.5 shrink-0 rounded-full ${st.dot}`} />
          {FLAG[p.provider.country]} {p.provider.name}
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${st.chip}`}>{st.label}</span>
        </span>
        <span className="order-3 col-span-2 md:order-none md:col-span-1"><EngineBadges engine={log.engine} /></span>
        <span className="text-right text-sm tabular-nums md:text-left">
          <strong>{log.status === "success" ? log.items_scraped : "-"}</strong> plans
          {delta != null && delta !== 0 && <span className={delta < 0 ? "ml-1 text-red-600" : "ml-1 text-emerald-600"}>({delta > 0 ? "+" : ""}{delta})</span>}
        </span>
        <span className="hidden text-sm tabular-nums text-slate-600 md:block">{pages.length ? `${pagesOk}/${pages.length} pages OK` : "-"}</span>
        <span className="hidden text-sm md:block">{issues ? <span className="font-semibold text-amber-700">{issues} issue{issues > 1 ? "s" : ""}</span> : <span className="text-slate-400">none</span>}</span>
        <span className="hidden text-right text-xs text-slate-500 md:block" title={formatTime(log.executed_at)}>{timeAgo(log.executed_at, now)}</span>
      </summary>

      <div className="space-y-3 border-t border-slate-100 px-4 py-3 text-sm">
        <p className="text-xs text-slate-500">
          Crawled {formatTime(log.executed_at)}
          {log.duration_ms ? ` · took ${(log.duration_ms / 1000).toFixed(0)}s` : ""}
          {log.status !== "success" && p.lastSuccessAt ? ` · last success ${formatTime(p.lastSuccessAt)} (${timeAgo(p.lastSuccessAt, now)})` : ""}
          {log.status !== "success" && !p.lastSuccessAt ? " · never succeeded" : ""}
          {status === "stale" ? ` · last success is over ${STALE_HOURS} h old` : ""}
        </p>

        {log.error_message && <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 font-medium text-red-800">{log.error_message}</p>}

        {warnings.length > 0 && (
          <ul className="space-y-1.5">
            {warnings.map((w, i) => (
              <li key={i} className={`rounded-lg border px-3 py-1.5 ${LEVEL_STYLE[w.level]}`}>
                <span className="mr-1.5 text-[11px] font-bold uppercase">{w.level === "warn" ? "check" : w.level}</span>
                {w.message}
              </li>
            ))}
          </ul>
        )}
        {warnings.length === 0 && !log.error_message && <p className="text-emerald-700">No mismatches or errors.</p>}

        {pages.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-slate-500">
                <tr><th className="pb-1 pr-3 font-medium">Page</th><th className="pb-1 pr-3 font-medium">Method</th><th className="pb-1 pr-3 text-right font-medium">Extracted → kept</th><th className="pb-1 pr-3 text-right font-medium">Text</th><th className="pb-1 text-right font-medium">Time</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">{pages.map((pg) => <PageRow key={pg.url} p={pg} />)}</tbody>
            </table>
          </div>
        )}
      </div>
    </details>
  );
}

export function CrawlReportView({ data, now }: { data: CrawlReportData; now: number }) {
  const providers = [...data.providers].sort(
    (a, b) => ORDER[statusOf(a)] - ORDER[statusOf(b)] || a.provider.country.localeCompare(b.provider.country) || a.provider.name.localeCompare(b.provider.name),
  );
  const counts = { failed: 0, stale: 0, warning: 0, ok: 0 } as Record<Status, number>;
  providers.forEach((p) => counts[statusOf(p)]++);
  const totalPlans = providers.reduce((n, p) => n + (p.log.status === "success" ? p.log.items_scraped : 0), 0);

  const lastRun: CrawlRun | undefined = data.runs[0];
  const lastFullRun = data.runs.find((r) => !r.scope && r.finished_at);
  const refRun = lastFullRun ?? lastRun;
  const lastTime = refRun?.finished_at ?? refRun?.started_at ?? providers.map((p) => p.log.executed_at).sort().at(-1) ?? null;
  const hoursSince = lastTime ? (now - new Date(lastTime).getTime()) / 3_600_000 : Infinity;
  const stale = hoursSince > STALE_HOURS;

  const needsAttention = counts.failed + counts.stale + counts.warning;
  const headline = stale ? "No recent crawl" : counts.failed ? "Crawl finished with failures" : needsAttention ? "Crawl finished, some checks needed" : "All providers crawled cleanly";
  const headTone = stale || counts.failed ? "border-red-300 bg-red-50" : needsAttention ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50";

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-sifu-gold">PlanSifu · internal</p>
        <h1 className="text-2xl font-extrabold md:text-3xl">Crawl report</h1>
      </header>

      <section className={`rounded-2xl border p-5 ${headTone}`}>
        <p className="text-lg font-extrabold">{headline}</p>
        <p className="mt-1 text-sm">
          Last crawl finished <strong>{formatTime(lastTime)}</strong> ({timeAgo(lastTime, now)})
          {refRun?.trigger ? ` · triggered by ${refRun.trigger === "schedule" ? "the 03:00 schedule" : refRun.trigger === "workflow_dispatch" ? "a manual run" : refRun.trigger}` : ""}
          {refRun?.run_url ? <> · <a className="font-semibold text-sky-700 underline" href={refRun.run_url} target="_blank" rel="noreferrer">GitHub run</a></> : null}
        </p>
        {stale && <p className="mt-2 text-sm font-semibold text-red-700">No crawl has finished in the last {STALE_HOURS} hours. The 03:00 job may not have run - check GitHub Actions.</p>}
        {lastRun && lastRun !== refRun && (
          <p className="mt-1 text-xs text-slate-600">Most recent run (partial/test{lastRun.scope ? `: ${lastRun.scope}` : ""}): {formatTime(lastRun.finished_at ?? lastRun.started_at)}</p>
        )}
      </section>

      {!data.configured && <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">Supabase isn&apos;t configured on this deployment, so there is nothing to report.</p>}
      {data.configured && !data.schemaReady && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
          The report tables don&apos;t exist yet. Run <code className="rounded bg-white px-1">supabase/migrations/02_crawl_reports.sql</code> in the Supabase SQL editor; richer detail (methods, pages, comparisons) appears from the next crawl.
          {data.error ? <span className="block text-xs text-slate-600">({data.error})</span> : null}
        </p>
      )}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <Tile label="Providers OK" value={`${counts.ok}/${providers.length}`} tone={counts.ok === providers.length ? "good" : undefined} />
        <Tile label="Failed" value={String(counts.failed)} tone={counts.failed ? "bad" : "good"} />
        <Tile label="Need a check" value={String(counts.warning + counts.stale)} sub={counts.stale ? `${counts.stale} stale` : undefined} tone={counts.warning + counts.stale ? "warn" : "good"} />
        <Tile label="Plans live" value={String(totalPlans)} />
        <Tile label="Model cost" value={refRun?.llm_cost_usd != null ? `$${Number(refRun.llm_cost_usd).toFixed(3)}` : "-"} sub={refRun?.llm_calls != null ? `${refRun.llm_calls} Haiku calls` : undefined} />
        <Tile label="Run time" value={refRun?.finished_at ? `${Math.round((new Date(refRun.finished_at).getTime() - new Date(refRun.started_at).getTime()) / 60_000)} min` : "-"} sub={refRun?.git_sha ? `commit ${refRun.git_sha.slice(0, 7)}` : undefined} />
      </section>

      <section className="space-y-2">
        <div className="hidden grid-cols-[minmax(10rem,1.2fr)_minmax(9rem,1fr)_6rem_7rem_6rem_9rem] gap-x-4 px-4 text-[11px] font-medium uppercase tracking-wide text-slate-500 md:grid">
          <span>Operator</span><span>Crawl method</span><span>Plans</span><span>Pages</span><span>Issues</span><span className="text-right">Last crawled</span>
        </div>
        {providers.map((p) => <ProviderRow key={p.provider.id} p={p} now={now} />)}
        {providers.length === 0 && data.configured && <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">No crawls recorded yet.</p>}
      </section>

      {data.neverCrawled.length > 0 && <p className="text-sm text-slate-600">Never crawled: {data.neverCrawled.join(", ")}</p>}

      {data.runs.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-extrabold">Recent runs</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr><th className="px-3 py-2 font-medium">Started</th><th className="px-3 py-2 font-medium">Trigger</th><th className="px-3 py-2 font-medium">Scope</th><th className="px-3 py-2 text-right font-medium">OK / failed</th><th className="px-3 py-2 text-right font-medium">Issues</th><th className="px-3 py-2 text-right font-medium">Cost</th><th className="px-3 py-2 font-medium" /></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.runs.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap px-3 py-2">{formatTime(r.started_at)}{!r.finished_at && <span className="ml-1 text-xs text-amber-600">(not finished)</span>}</td>
                    <td className="px-3 py-2">{r.trigger ?? "-"}</td>
                    <td className="px-3 py-2">{r.scope ?? "all providers"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.providers_ok} / <span className={r.providers_failed ? "font-semibold text-red-600" : ""}>{r.providers_failed}</span></td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.warnings_count}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.llm_cost_usd != null ? `$${Number(r.llm_cost_usd).toFixed(3)}` : "-"}</td>
                    <td className="px-3 py-2 text-right">{r.run_url && <a className="text-sky-700 hover:underline" href={r.run_url} target="_blank" rel="noreferrer">logs</a>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <footer className="border-t border-slate-200 pt-4 text-xs text-slate-500">
        <strong>Check</strong> = something differs from the previous crawl or from what the page showed: a page failed or returned nothing, the plan count fell 30% or more, a plan&apos;s price moved 25% or more, or extracted plans were all filtered out.
        &quot;Stale&quot; = no successful crawl in {STALE_HOURS} hours. Times are Malaysia/Singapore time.
      </footer>
    </div>
  );
}
