import { scrapeTargets } from "../extract";
import type { ProviderScraper, ScrapeTarget } from "../types";

const targets: ScrapeTarget[] = [
  { url: "https://www.singtel.com/personal/products-services/mobile/mobile-plans", category: "mobile_postpaid" },
  { url: "https://www.singtel.com/personal/products-services/broadband", category: "broadband" },
];

export const singtel: ProviderScraper = {
  name: "Singtel",
  country: "SG",
  scrape: () => scrapeTargets(targets, "SG"),
};
