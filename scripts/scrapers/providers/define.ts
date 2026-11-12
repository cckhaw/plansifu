import { scrapeTargets } from "../extract";
import type { Country } from "../../../src/types/database";
import type { PageParser, ProviderScraper, ScrapeTarget } from "../types";

export function defineProvider(name: string, country: Country, website: string, targets: ScrapeTarget[]): ProviderScraper {
  return { name, country, website, targets, scrape: () => scrapeTargets(targets, country, name) };
}

const pre = "mobile_prepaid" as const;
const post = "mobile_postpaid" as const;
const bb = "broadband" as const;

/** Shorthand: t.post(url, parser) - every page needs its own parser, see scripts/scrapers/README.md. */
export const t = {
  /** Same target, HTML fetched through our Vercel relay (for sites that block the CI network). */
  relay: (target: ScrapeTarget): ScrapeTarget => ({ ...target, relay: true }),
  post: (url: string, parse: PageParser): ScrapeTarget => ({ url, category: post, parse }),
  pre: (url: string, parse: PageParser): ScrapeTarget => ({ url, category: pre, parse }),
  bb: (url: string, parse: PageParser): ScrapeTarget => ({ url, category: bb, parse }),
  /** The page is known to list no plans (e.g. prices sit behind a configurator): an empty result is not a warning. */
  expectEmpty: (target: ScrapeTarget): ScrapeTarget => ({ ...target, expectEmpty: true }),
  /** Page listing several categories; the parser may label each plan, falling back to `category`. */
  mixed: (url: string, parse: PageParser, category: ScrapeTarget["category"] = post): ScrapeTarget => ({ url, category, mixed: true, parse }),
};
