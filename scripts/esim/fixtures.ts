import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { trimHtml } from "../scrapers/fixtures";
import type { PageData } from "../scrapers/types";

export const ESIM_FIXTURE_DIR = path.join(import.meta.dirname, "fixtures");

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** fixtures/<brand>/<destination key>.json */
export const esimFixturePath = (brand: string, destinationKey: string) => path.join(ESIM_FIXTURE_DIR, slug(brand), `${destinationKey}.json`);
export const esimExpectedPath = (fixture: string) => fixture.replace(/\.json$/, ".expected.json");

export function saveEsimFixture(brand: string, destinationKey: string, page: PageData): string {
  const file = esimFixturePath(brand, destinationKey);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify({ ...page, html: trimHtml(page.html) }, null, 1) + "\n");
  return file;
}

export function loadEsimFixture(brand: string, destinationKey: string): PageData | null {
  const file = esimFixturePath(brand, destinationKey);
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as PageData) : null;
}
