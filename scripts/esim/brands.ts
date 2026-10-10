import { type EsimDestination } from "../../src/lib/esim-destinations";

export interface EsimBrand {
  name: string;
  website: string;
  /** Builds the brand's page URL for a destination slug. Slugs are tried in order until a page with prices loads. */
  pattern?: (slug: string) => string;
  /** Full control instead of `pattern`: candidate URLs for a destination (empty = brand has no such page). */
  urls?: (d: EsimDestination) => string[];
  /** Extra guidance for the model about this brand's pages. */
  hint?: string;
  /** Fetch via our Vercel relay (sites that block the CI network). */
  relay?: boolean;
}

export function candidateUrls(b: EsimBrand, d: EsimDestination): string[] {
  const list = b.urls ? b.urls(d) : b.pattern ? d.slugs.map(b.pattern) : [];
  return [...new Set(list)];
}

export const ESIM_BRANDS: EsimBrand[] = [
  { name: "Airalo", website: "https://www.airalo.com", pattern: (s) => `https://www.airalo.com/${s}-esim` },
  { name: "Holafly", website: "https://esim.holafly.com", pattern: (s) => `https://esim.holafly.com/esim-${s}/` },
  { name: "Saily", website: "https://saily.com", pattern: (s) => `https://saily.com/esim-${s}/` },
  { name: "Nomad", website: "https://www.nomadesim.com", pattern: (s) => `https://www.nomadesim.com/${s}-eSIM` },
  { name: "Jetpac", website: "https://www.jetpacglobal.com", pattern: (s) => `https://www.jetpacglobal.com/product-details/${s}-esim` },
  { name: "Eskimo", website: "https://www.eskimo.travel", pattern: (s) => `https://www.eskimo.travel/en/plans/${s}-esim` },
  { name: "Roamless", website: "https://roamless.com", pattern: (s) => `https://roamless.com/esim/${s}-esim` },
  { name: "MobiMatter", website: "https://mobimatter.com", pattern: (s) => `https://mobimatter.com/esim-${s}` },
  { name: "Yesim", website: "https://yesim.app", urls: (d) => [...d.slugs.map((s) => `https://yesim.app/country/${s}/`), ...d.slugs.map((s) => `https://yesim.app/regions/${s}-esim/`)] },
  { name: "SimLocal", website: "https://www.simlocal.com", pattern: (s) => `https://www.simlocal.com/plan-selection/${s}` },
  { name: "Firsty", website: "https://www.firsty.app", urls: (d) => [...d.slugs.map((s) => `https://www.firsty.app/${s}-esim`), ...d.slugs.map((s) => `https://www.firsty.app/esim-${s}`)] },
  { name: "easySim", website: "https://www.easysim.global", pattern: (s) => `https://www.easysim.global/destination/${s}` },
  { name: "Flexiroam", website: "https://www.flexiroam.com", pattern: (s) => `https://www.flexiroam.com/shop/esim-${s}` },
  { name: "Maya", website: "https://maya.net", pattern: (s) => `https://maya.net/esim/${s}` },
  { name: "BNESIM", website: "https://www.bnesim.com", urls: (d) => (d.iso2 ? [`https://www.bnesim.com/plans/${d.iso2}/`] : []) },
  { name: "Truely", website: "https://truely.com", pattern: (s) => `https://truely.com/destinations/${s}` },
  {
    name: "GigSky",
    website: "https://www.gigsky.com",
    urls: (d) => d.slugs.flatMap((s) => (d.type === "country" ? [`https://www.gigsky.com/country/esim-in-${s}`] : [`https://www.gigsky.com/region/esim-in-${s}`, `https://www.gigsky.com/country/esim-in-${s}`])),
  },
  {
    name: "aloSIM",
    website: "https://alosim.com",
    urls: (d) =>
      d.type === "country"
        ? d.slugs.map((s) => `https://alosim.com/destinations/${d.continent ?? "asia"}-esim/${s}-esim/`)
        : d.slugs.map((s) => `https://alosim.com/destinations/${s}-esim/`),
  },
  {
    name: "Ubigi",
    website: "https://ubigi.com",
    urls: (d) => (d.iso3 ? [`https://cellulardata.ubigi.com/data-plans-and-coverage/ubigi-esim-data-plans/?destination=${d.iso3}`] : d.slugs.map((s) => `https://cellulardata.ubigi.com/data-plans-and-coverage/ubigi-esim-data-plans/?region=${s}`)),
  },
  {
    name: "Instabridge",
    website: "https://store.instabridge.com",
    urls: (d) => (d.iso2 ? [`https://store.instabridge.com/mobile-data/${d.iso2.toUpperCase()}/10gb`] : d.slugs.map((s) => `https://store.instabridge.com/mobile-data/${s}`)),
  },
  {
    // A Malaysian reseller: pages group several countries, so the model is told to keep only plans for the destination.
    name: "GogoRoaming",
    website: "https://www.gogoroaming.my",
    hint: "Each page lists eSIM products covering several countries. Keep only products that work in the requested destination. Prices are in MYR (RM). Unlimited 'per day' products: title them 'Unlimited / N days' only if a duration is stated.",
    urls: (d) => {
      const m: Record<string, string> = {
        japan: "japan-taiwan-korea-esim", "south-korea": "japan-taiwan-korea-esim", taiwan: "japan-taiwan-korea-esim",
        china: "china-hong-kong-macao-esim", "hong-kong": "china-hong-kong-macao-esim",
        thailand: "southeast-asia-esim", vietnam: "southeast-asia-esim", indonesia: "southeast-asia-esim", singapore: "southeast-asia-esim", malaysia: "southeast-asia-esim",
        europe: "europe-esim", "united-kingdom": "europe-esim", asia: "asia-esim-data-plan", global: "worldwide-travel-esim-simcard",
        "united-states": "americas-esim", australia: "global-oceania-esim",
      };
      return m[d.key] ? [`https://www.gogoroaming.my/${m[d.key]}/`] : [];
    },
  },
];
