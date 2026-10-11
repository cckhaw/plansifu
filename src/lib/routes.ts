import type { Country } from "@/types/database";

/** Country slugs used in URLs: /my/..., /sg/... */
export const COUNTRY_SLUGS = ["my", "sg"] as const;
export type CountrySlug = (typeof COUNTRY_SLUGS)[number];

export const slugOf = (c: Country): CountrySlug => (c === "SG" ? "sg" : "my");
export const countryOfSlug = (s: string | undefined): Country | null => (s === "my" ? "MY" : s === "sg" ? "SG" : null);

/** Page families under /[country]/. `mobile` lists postpaid and prepaid together. */
export type Kind = "mobile" | "postpaid" | "prepaid" | "broadband" | "travel-esim";
export const KINDS: Kind[] = ["mobile", "postpaid", "prepaid", "broadband", "travel-esim"];

export const kindPath = (c: Country, k: Kind) => `/${slugOf(c)}/${k}`;
export const homePath = (c: Country) => `/${slugOf(c)}`;
