import type { NextRequest } from "next/server";
import { IMPORT_SOURCES } from "../../../../scripts/scrapers/import-sources";
import { importPages, type ImportPersist, type UploadedPage } from "../../../../scripts/scrapers/import-pages";
import { logCrawl, resolveProviderId, upsertPlans } from "../../../../scripts/scrapers/db-upsert";
import { isAuthorised } from "@/lib/crawl-report";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PAGES = 8;
const MAX_HTML_CHARS = 8_000_000;

const persist: ImportPersist = async ({ source, plans, complete, pages }) => {
  const started = Date.now();
  const providerId = await resolveProviderId(source.name, source.country, source.website);
  const stats = await upsertPlans(providerId, plans, { deactivateMissing: complete });
  await logCrawl({
    providerId,
    runId: null,
    status: "success",
    itemsScraped: stats.count,
    engine: "manual import",
    pages,
    warnings: [{ level: "info", message: `Imported by hand from a real browser${complete ? "" : " (some pages missing)"}` }],
    stats,
    durationMs: Date.now() - started,
  });
  return { count: stats.count };
};

/**
 * Parse pages captured in the owner's own browser (bookmarklet on /import) and optionally save the plans.
 * Auth: header `x-import-key` = CRAWL_REPORT_KEY. Body: { provider, pages: [{ url, html }], save: boolean }.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorised(req.headers.get("x-import-key") ?? undefined)) return new Response("Not found", { status: 404 });

  let body: { provider?: string; pages?: UploadedPage[]; save?: boolean };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }
  const source = IMPORT_SOURCES.find((s) => s.name.toLowerCase() === String(body.provider ?? "").toLowerCase());
  if (!source) return Response.json({ error: `Unknown provider. Valid: ${IMPORT_SOURCES.map((s) => s.name).join(", ")}` }, { status: 400 });
  const pages = Array.isArray(body.pages) ? body.pages : [];
  if (pages.length > MAX_PAGES || pages.some((p) => typeof p?.url !== "string" || typeof p?.html !== "string")) {
    return Response.json({ error: `Send up to ${MAX_PAGES} pages as { url, html }` }, { status: 400 });
  }
  if (pages.reduce((n, p) => n + p.html.length, 0) > MAX_HTML_CHARS) return Response.json({ error: "Pages are too large" }, { status: 413 });

  try {
    const result = await importPages(source, pages, body.save ? persist : undefined);
    // The parsed plans are echoed back for the preview; the HTML is never stored.
    return Response.json({
      ...result,
      plans: result.plans.map((p) => ({
        title: p.title,
        category: p.category,
        monthly_price: p.monthly_price,
        currency: p.currency,
        data_gb: p.data_gb,
        speed_mbps: p.speed_mbps,
        contract_months: p.contract_months,
      })),
    });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Import failed" }, { status: 500 });
  }
}
