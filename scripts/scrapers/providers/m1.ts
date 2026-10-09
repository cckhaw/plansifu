import { scrapeTargets } from "../extract";
import type { ProviderScraper, ScrapeTarget } from "../types";

const targets: ScrapeTarget[] = [
  { url: "https://www.m1.com.sg/personal/mobile/postpaid-plans", category: "mobile_postpaid" },
  { url: "https://www.m1.com.sg/personal/broadband", category: "broadband" },
];

export const m1: ProviderScraper = {
  name: "M1",
  country: "SG",
  scrape: () => scrapeTargets(targets, "SG"),
};
