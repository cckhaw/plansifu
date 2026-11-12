import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ImportTool } from "@/components/ImportTool";
import { isAuthorised } from "@/lib/crawl-report";
import { IMPORT_SOURCES } from "../../../scripts/scrapers/import-sources";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Import pages", robots: { index: false, follow: false } };

/**
 * Private page for providers whose sites block the nightly crawler (M1, Maxx): capture the page in your own browser
 * with the bookmarklet and import it here. Open `/import?key=<CRAWL_REPORT_KEY>`; without the key the page doesn't exist.
 */
export default async function ImportPage({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const { key } = await searchParams;
  if (!key || !isAuthorised(key)) notFound();
  const sources = IMPORT_SOURCES.map((s) => ({ name: s.name, hosts: s.hosts, pages: s.targets.map((t) => t.url) }));
  return (
    <main className="mx-auto max-w-3xl px-4 py-8" style={{ colorScheme: "light" }}>
      <ImportTool apiKey={key} sources={sources} />
    </main>
  );
}
