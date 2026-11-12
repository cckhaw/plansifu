import { load, type CheerioAPI } from "cheerio";
import type { PageData, PageParser, RawPlan } from "./types";

/** Placeholder parser for a page nobody has written a parser for yet: the page fails with a clear message. */
export function todo(provider: string): PageParser {
  return () => {
    throw new Error(`no parser written yet for ${provider}`);
  };
}

/** `load(page.html)` - the DOM to run selectors on. */
export const dom = (page: PageData): CheerioAPI => load(page.html);

/** Collapse whitespace (including non-breaking spaces) and trim. */
export const clean = (s: string | null | undefined): string => (s ?? "").replace(/[\s ]+/g, " ").trim();

/** First price in a string: "RM 89.00/mth" -> 89, "S$1,299" -> 1299, "$9.9" -> 9.9. null if none. */
export function price(s: string | null | undefined): number | null {
  const m = clean(s).match(/(?:RM|S\$|SGD|MYR|\$)\s?(\d[\d,]*(?:\.\d+)?)|(\d[\d,]*(?:\.\d+)?)\s?(?:RM|SGD|MYR)\b/i);
  if (!m) return null;
  const n = Number((m[1] ?? m[2]).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * Data allowance in GB from text like "100GB", "1.5 GB", "2TB", "500MB", "Unlimited data". -1 = unlimited, null = none found.
 * Takes the first allowance mentioned; pass the specific snippet, not the whole card, when a card lists several.
 */
export function dataGb(s: string | null | undefined): number | null {
  const t = clean(s);
  const m = t.match(/(\d[\d,]*(?:\.\d+)?)\s?(TB|GB|MB)\b/i);
  if (m) {
    const n = Number(m[1].replace(/,/g, ""));
    const unit = m[2].toUpperCase();
    return unit === "TB" ? n * 1000 : unit === "MB" ? Math.round((n / 1000) * 1000) / 1000 : n;
  }
  return /unlimited\s+(?:data|internet)|(?:data|internet)\s+unlimited/i.test(t) ? -1 : null;
}

/** Broadband speed in Mbps from "500Mbps", "1 Gbps", "10Gbps". null if none found. */
export function speedMbps(s: string | null | undefined): number | null {
  const m = clean(s).match(/(\d[\d,]*(?:\.\d+)?)\s?(Gbps|Mbps)\b/i);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  return Math.round(/g/i.test(m[2]) ? n * 1000 : n);
}

/** Contract length in months from "24 months", "12-month contract", "no contract" (0). null if not stated. */
export function contractMonths(s: string | null | undefined): number | null {
  const t = clean(s);
  if (/no[\s-]contract|contract[\s-]free/i.test(t)) return 0;
  const m = t.match(/(\d+)[\s-]*(?:months?|mths?)(?:[\s-]*contract)?/i) ?? t.match(/(\d+)[\s-]*(?:year|yr)s?(?:[\s-]*contract)?/i);
  if (!m) return null;
  return /year|yr/i.test(m[0]) ? Number(m[1]) * 12 : Number(m[1]);
}

/** The text lines of the page (`page.text` is one text node per line), trimmed and without blanks. */
export const lines = (page: PageData): string[] => page.text.split("\n").map(clean).filter(Boolean);

/** Walk any JSON value, calling `visit` on every object (arrays and nested objects included). */
export function walkJson(value: unknown, visit: (obj: Record<string, unknown>) => void): void {
  if (Array.isArray(value)) value.forEach((v) => walkJson(v, visit));
  else if (value && typeof value === "object") {
    visit(value as Record<string, unknown>);
    Object.values(value as Record<string, unknown>).forEach((v) => walkJson(v, visit));
  }
}

/** The page's JSON feeds, parsed (bodies that aren't valid JSON are skipped). */
export function feedJson(page: PageData): { url: string; json: unknown }[] {
  const out: { url: string; json: unknown }[] = [];
  for (const f of page.feeds) {
    try {
      out.push({ url: f.url, json: JSON.parse(f.body) });
    } catch {
      /* truncated or not JSON */
    }
  }
  return out;
}

/** All `application/ld+json` blocks of the page, parsed. */
export function jsonLd(page: PageData): unknown[] {
  const out: unknown[] = [];
  dom(page)('script[type="application/ld+json"]').each((_, el) => {
    try {
      out.push(JSON.parse(dom(page)(el).text()));
    } catch {
      /* ignore malformed blocks */
    }
  });
  return out;
}

/** Build a RawPlan with the fields every parser sets, dropping undefined so `normalizePlans` sees clean input. */
export function plan(p: RawPlan): RawPlan {
  return Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== null && v !== "")) as RawPlan;
}
