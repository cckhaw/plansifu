import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { load } from "cheerio";
import type { PageData } from "./types";

export const FIXTURE_DIR = path.join(import.meta.dirname, "fixtures");

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);

/** Folder name of a provider's fixtures: country + name, so the two CMLinks don't collide ("my-cmlink", "sg-cmlink"). */
export const providerKey = (p: { name: string; country: string }) => `${p.country.toLowerCase()}-${slug(p.name)}`;

/** Where the saved copy of a provider's page lives: fixtures/<provider>/<url slug>.json */
export function fixturePath(provider: string, url: string): string {
  return path.join(FIXTURE_DIR, slug(provider), `${slug(url)}.json`);
}

/** Path of the checked-in expected parse result next to a fixture. */
export const expectedPath = (fixture: string) => fixture.replace(/\.json$/, ".expected.json");

/**
 * Shrink a rendered page for storage: no scripts (except JSON-LD), styles, SVGs, iframes, comments, link/meta tags
 * or inline data URIs. Selectors and text are untouched, so a parser behaves the same on the trimmed copy.
 */
export function trimHtml(html: string): string {
  const $ = load(html);
  $("script:not([type='application/ld+json']), style, svg, noscript, iframe, link, meta, template").remove();
  $("*").contents().each((_, node) => {
    if (node.type === "comment") $(node).remove();
  });
  $("*").each((_, el) => {
    for (const attr of ["style", "srcset", "d", "viewbox"]) $(el).removeAttr(attr);
    // Pages sometimes carry credentials in data attributes (e.g. data-client-secret-id): never keep those, parsers don't need them.
    for (const attr of Object.keys((el as { attribs?: Record<string, string> }).attribs ?? {})) {
      if (/secret|token|password|api-?key|credential/i.test(attr)) $(el).removeAttr(attr);
    }
    for (const attr of ["src", "href"]) if (/^data:/i.test($(el).attr(attr) ?? "")) $(el).removeAttr(attr);
  });
  return $.html().replace(/[ \t]+\n/g, "\n").replace(/\n{2,}/g, "\n");
}

export function saveFixture(provider: string, page: PageData): string {
  const file = fixturePath(provider, page.url);
  mkdirSync(path.dirname(file), { recursive: true });
  const trimmed: PageData = { ...page, html: trimHtml(page.html), ...(page.states?.length ? { states: page.states.map(trimHtml) } : {}) };
  writeFileSync(file, JSON.stringify(trimmed, null, 1) + "\n");
  return file;
}

export function loadFixture(provider: string, url: string): PageData | null {
  const file = fixturePath(provider, url);
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as PageData) : null;
}
