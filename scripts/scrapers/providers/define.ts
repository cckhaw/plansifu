import { scrapeTargets } from "../extract";
import type { Country } from "../../../src/types/database";
import type { ProviderScraper, ScrapeTarget } from "../types";

export function defineProvider(name: string, country: Country, website: string, targets: ScrapeTarget[]): ProviderScraper {
  return { name, country, website, scrape: () => scrapeTargets(targets, country) };
}

const pre = "mobile_prepaid" as const;
const post = "mobile_postpaid" as const;
const bb = "broadband" as const;

/** Shorthand: t(category, url) */
export const t = {
  post: (url: string): ScrapeTarget => ({ url, category: post }),
  pre: (url: string): ScrapeTarget => ({ url, category: pre }),
  bb: (url: string): ScrapeTarget => ({ url, category: bb }),
};
