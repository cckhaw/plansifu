import type { Country } from "../../src/types/database";
import { M1_TARGETS } from "./sources/m1";
import { MAXX_TARGETS } from "./sources/maxx";
import type { ScrapeTarget } from "./types";

/** A provider whose pages are imported by hand from a real browser instead of being crawled. */
export interface ImportSource {
  name: string;
  country: Country;
  website: string;
  /** Hostnames a captured page may come from (the bookmarklet runs on these). */
  hosts: string[];
  targets: ScrapeTarget[];
}

export const IMPORT_SOURCES: ImportSource[] = [
  { name: "M1", country: "SG", website: "https://www.m1.com.sg", hosts: ["www.m1.com.sg"], targets: M1_TARGETS },
  { name: "Maxx", country: "SG", website: "https://maxxonline.sg", hosts: ["maxxonline.sg", "www.maxxonline.sg"], targets: MAXX_TARGETS },
];
