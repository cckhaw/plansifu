import type { CrawlPageReport, CrawlWarning } from "../../src/types/database";
import type { UpsertStats } from "./db-upsert";
import type { ScrapeResult } from "./types";

export const short = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "");
const money = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

/** Everything about a provider's crawl that deserves a human look in the morning. */
export function buildWarnings(result: ScrapeResult, stats?: UpsertStats): CrawlWarning[] {
  const w: CrawlWarning[] = [];
  for (const p of result.pages) {
    if (p.error) {
      w.push({ level: "error", message: `Page failed: ${short(p.url)} - ${p.error}` });
    } else if (p.kept_count === 0 && p.raw_count > 0) {
      w.push({ level: "warn", message: `All ${p.raw_count} extracted plans were filtered out on ${short(p.url)}: ${p.dropped.slice(0, 4).map((d) => d.title).join("; ")}` });
    } else if (p.kept_count === 0 && !p.expect_empty) {
      w.push({ level: "warn", message: `No plans found on ${short(p.url)}` });
    } else if (p.kept_count > 0 && p.expect_empty) {
      w.push({ level: "info", message: `${short(p.url)} was expected to list no plans but returned ${p.kept_count}` });
    } else if (p.dropped.length >= 3 && p.dropped.length > p.kept_count) {
      w.push({ level: "info", message: `Filters dropped ${p.dropped.length} of ${p.raw_count} extracted rows on ${short(p.url)}` });
    }
  }
  if (!result.complete) w.push({ level: "warn", message: "Incomplete crawl: some pages failed, so missing plans were left active" });
  if (stats) {
    if (stats.previousCount >= 3 && stats.count < stats.previousCount * 0.7) {
      w.push({ level: "warn", message: `Plan count fell from ${stats.previousCount} to ${stats.count}` });
    }
    const names = (list: string[]) => list.slice(0, 8).join("; ") + (list.length > 8 ? `; +${list.length - 8} more` : "");
    if (stats.previousCount > 0 && stats.removed.length) w.push({ level: stats.removed.length >= 3 ? "warn" : "info", message: `Plans no longer listed (${stats.removed.length}): ${names(stats.removed)}` });
    if (stats.previousCount > 0 && stats.added.length) w.push({ level: "info", message: `New plans (${stats.added.length}): ${names(stats.added)}` });
    for (const c of stats.changed) {
      const pct = ((c.to - c.from) / c.from) * 100;
      if (Math.abs(pct) >= 25) {
        w.push({ level: "warn", message: `Price changed ${Math.abs(pct).toFixed(0)}% ${pct > 0 ? "up" : "down"}: "${c.title}" ${money(c.from)} -> ${money(c.to)}` });
      }
    }
  }
  return w;
}


/** "browser+llm", "firecrawl", "custom parser", or a combination when a provider mixes methods. */
export function engineOf(pages: CrawlPageReport[]): string | undefined {
  const engines = [...new Set(pages.map((p) => p.engine))];
  return engines.length ? engines.join(" + ") : undefined;
}

