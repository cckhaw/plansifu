import { scrapeTargets } from "../extract";
import type { Country } from "../../../src/types/database";
import type { ProviderScraper, ScrapeTarget } from "../types";

export function defineProvider(name: string, country: Country, website: string, targets: ScrapeTarget[]): ProviderScraper {
  return { name, country, website, scrape: () => scrapeTargets(targets, country, name) };
}

const pre = "mobile_prepaid" as const;
const post = "mobile_postpaid" as const;
const bb = "broadband" as const;

/** Shorthand: t(category, url) */
export const t = {
  post: (url: string, hint?: string): ScrapeTarget => ({ url, category: post, hint }),
  pre: (url: string): ScrapeTarget => ({ url, category: pre }),
  bb: (url: string): ScrapeTarget => ({ url, category: bb }),
  /** The page is known to list no plans (e.g. prices sit behind a configurator): an empty result is not a warning. */
  expectEmpty: (target: ScrapeTarget): ScrapeTarget => ({ ...target, expectEmpty: true }),
  /** Page listing several categories; the extractor may label each plan, falling back to `category`. */
  mixed: (url: string, category: ScrapeTarget["category"] = post): ScrapeTarget => ({ url, category, mixed: true }),
};
