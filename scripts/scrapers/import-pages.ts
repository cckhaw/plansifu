import type { CrawlPageReport, ScrapedPlan } from "../../src/types/database";
import { canonicalUrl } from "./canonical-url";
import type { ImportSource } from "./import-sources";
import { normalizePlans } from "./normalize";
import { pageFromHtml } from "./page-from-html";

export interface UploadedPage {
  url: string;
  html: string;
}

export interface ImportPageResult {
  /** The provider page this upload was matched to (its canonical URL). */
  url: string;
  status: "ok" | "missing" | "error";
  plans: number;
  titles: string[];
  error?: string;
}

export interface ImportResult {
  provider: string;
  pages: ImportPageResult[];
  /** Uploaded pages that matched none of the provider's pages (wrong site or page). */
  ignored: string[];
  /** Every page of the provider was supplied and parsed, so plans that disappeared may be deactivated. */
  complete: boolean;
  plans: ScrapedPlan[];
  saved: boolean;
  message: string;
}

export interface ImportPersist {
  (args: { source: ImportSource; plans: ScrapedPlan[]; complete: boolean; pages: CrawlPageReport[] }): Promise<{ count: number }>;
}

/**
 * Parse pages captured in a real browser with the provider's own parsers and, when `persist` is given, save the plans.
 * Missing pages only add to what is saved (existing plans stay active); the provider's plans are only deactivated when
 * every one of its pages was supplied and parsed, like a full crawl.
 */
export async function importPages(source: ImportSource, uploads: UploadedPage[], persist?: ImportPersist): Promise<ImportResult> {
  const byUrl = new Map<string, UploadedPage>();
  const ignored: string[] = [];
  for (const up of uploads) {
    const canon = canonicalUrl(up.url);
    let host = "";
    try {
      host = new URL(up.url).hostname.toLowerCase();
    } catch {
      /* handled below */
    }
    const known = canon && source.targets.some((t) => canonicalUrl(t.url) === canon);
    if (!known || !source.hosts.includes(host)) ignored.push(up.url);
    else byUrl.set(canon, up);
  }

  const pages: ImportPageResult[] = [];
  const reports: CrawlPageReport[] = [];
  const all = new Map<string, ScrapedPlan>();
  for (const target of source.targets) {
    const up = byUrl.get(canonicalUrl(target.url) ?? "");
    if (!up) {
      pages.push({ url: target.url, status: "missing", plans: 0, titles: [] });
      continue;
    }
    const started = Date.now();
    try {
      const raw = target.parse(pageFromHtml(target.url, up.html));
      if (raw.length === 0 && !target.expectEmpty) throw new Error("the parser found no plans on this page (is it the right page, fully loaded?)");
      const { plans, dropped } = normalizePlans(raw, { country: source.country, category: target.category, fallbackUrl: target.url, mixed: target.mixed });
      for (const p of plans) if (!all.has(p.title.toLowerCase())) all.set(p.title.toLowerCase(), p);
      pages.push({ url: target.url, status: "ok", plans: plans.length, titles: plans.map((p) => p.title) });
      reports.push({ url: target.url, engine: "custom parser", raw_count: raw.length, kept_count: plans.length, dropped, notes: ["Imported by hand from a real browser"], ms: Date.now() - started });
    } catch (err) {
      const error = (err as Error).message;
      pages.push({ url: target.url, status: "error", plans: 0, titles: [], error });
      reports.push({ url: target.url, engine: "custom parser", raw_count: 0, kept_count: 0, dropped: [], error, ms: Date.now() - started });
    }
  }

  const plans = [...all.values()];
  const complete = pages.every((p) => p.status === "ok");
  const failed = pages.filter((p) => p.status === "error");
  let saved = false;
  let message: string;
  if (!plans.length) {
    message = failed.length ? `Nothing to save: ${failed.map((p) => p.error).join(" | ")}` : "Nothing to save: no pages were supplied.";
  } else if (!persist) {
    message = `Checked: ${plans.length} plans found${complete ? "" : ", but not every page was supplied, so nothing would be removed"}. Nothing was saved yet.`;
  } else {
    const { count } = await persist({ source, plans, complete, pages: reports });
    saved = true;
    message = `Saved ${count} plans for ${source.name}${complete ? "" : ` (not every page was supplied, so older plans were left as they are)`}.`;
  }
  return { provider: source.name, pages, ignored, complete, plans, saved, message };
}
