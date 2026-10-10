/**
 * Destinations the Travel eSIM section compares. `type: "region"` covers multi-country plans
 * (a region pass or a worldwide plan). Add a row here and every brand's URL builder picks it up.
 */
export type EsimDestinationType = "country" | "region" | "global";

export interface EsimDestination {
  key: string;
  name: string;
  type: EsimDestinationType;
  flag: string;
  iso2?: string;
  iso3?: string;
  /** URL slugs brands commonly use for this destination, most common first. */
  slugs: string[];
}

export const ESIM_DESTINATIONS: EsimDestination[] = [
  { key: "japan", name: "Japan", type: "country", flag: "🇯🇵", iso2: "jp", iso3: "jpn", slugs: ["japan"] },
  { key: "south-korea", name: "South Korea", type: "country", flag: "🇰🇷", iso2: "kr", iso3: "kor", slugs: ["south-korea", "korea"] },
  { key: "thailand", name: "Thailand", type: "country", flag: "🇹🇭", iso2: "th", iso3: "tha", slugs: ["thailand"] },
  { key: "indonesia", name: "Indonesia (Bali)", type: "country", flag: "🇮🇩", iso2: "id", iso3: "idn", slugs: ["indonesia", "bali"] },
  { key: "vietnam", name: "Vietnam", type: "country", flag: "🇻🇳", iso2: "vn", iso3: "vnm", slugs: ["vietnam"] },
  { key: "china", name: "China", type: "country", flag: "🇨🇳", iso2: "cn", iso3: "chn", slugs: ["china"] },
  { key: "taiwan", name: "Taiwan", type: "country", flag: "🇹🇼", iso2: "tw", iso3: "twn", slugs: ["taiwan"] },
  { key: "hong-kong", name: "Hong Kong", type: "country", flag: "🇭🇰", iso2: "hk", iso3: "hkg", slugs: ["hong-kong"] },
  { key: "singapore", name: "Singapore", type: "country", flag: "🇸🇬", iso2: "sg", iso3: "sgp", slugs: ["singapore"] },
  { key: "malaysia", name: "Malaysia", type: "country", flag: "🇲🇾", iso2: "my", iso3: "mys", slugs: ["malaysia"] },
  { key: "australia", name: "Australia", type: "country", flag: "🇦🇺", iso2: "au", iso3: "aus", slugs: ["australia"] },
  { key: "united-states", name: "United States", type: "country", flag: "🇺🇸", iso2: "us", iso3: "usa", slugs: ["united-states", "usa", "us"] },
  { key: "united-kingdom", name: "United Kingdom", type: "country", flag: "🇬🇧", iso2: "gb", iso3: "gbr", slugs: ["united-kingdom", "uk", "great-britain"] },
  { key: "europe", name: "Europe (multi-country)", type: "region", flag: "🇪🇺", slugs: ["europe", "europe-and-uk", "european-union"] },
  { key: "asia", name: "Asia (multi-country)", type: "region", flag: "🌏", slugs: ["asia", "asia-pacific"] },
  { key: "global", name: "Worldwide (multi-region)", type: "global", flag: "🌍", slugs: ["global", "worldwide", "world"] },
];

export const destinationByKey = (key: string | undefined): EsimDestination | undefined =>
  ESIM_DESTINATIONS.find((d) => d.key === key);
