import { scrapeTargets } from "../extract";
import type { ProviderScraper, ScrapeTarget } from "../types";

const targets: ScrapeTarget[] = [
  { url: "https://www.celcomdigi.com/postpaid", category: "mobile_postpaid" },
  { url: "https://www.celcomdigi.com/home/fibre", category: "broadband" },
];

export const celcomdigi: ProviderScraper = {
  name: "CelcomDigi",
  country: "MY",
  scrape: () => scrapeTargets(targets, "MY"),
};
