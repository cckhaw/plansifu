import { scrapeTargets } from "../extract";
import type { ProviderScraper, ScrapeTarget } from "../types";

const targets: ScrapeTarget[] = [
  { url: "https://www.maxis.com.my/en/personal/postpaid/", category: "mobile_postpaid" },
  { url: "https://www.maxis.com.my/en/personal/fibre/", category: "broadband" },
];

export const maxis: ProviderScraper = {
  name: "Maxis",
  country: "MY",
  scrape: () => scrapeTargets(targets, "MY"),
};
