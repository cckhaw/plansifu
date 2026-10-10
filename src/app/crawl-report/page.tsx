import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CrawlReportView } from "@/components/CrawlReportView";
import { getCrawlReport, isAuthorised } from "@/lib/crawl-report";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Crawl report", robots: { index: false, follow: false } };

/**
 * Private daily crawl report. Bookmark `/crawl-report?key=<CRAWL_REPORT_KEY>`.
 * Without a matching key (or if the env var isn't set) the page doesn't exist.
 */
export default async function CrawlReportPage({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const { key } = await searchParams;
  if (!isAuthorised(key)) notFound();
  const data = await getCrawlReport();
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900" style={{ colorScheme: "light" }}>
      <CrawlReportView data={data} now={Date.now()} />
    </main>
  );
}
