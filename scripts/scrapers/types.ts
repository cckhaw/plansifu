import type { Country, PlanCategory, ScrapedPlan } from "../../src/types/database";

export interface ScrapeTarget {
  url: string;
  /** Default category; extraction may override per plan when the page says otherwise. */
  category: PlanCategory;
  /**
   * True for pages that list several categories (e.g. a homepage or store front).
   * Otherwise the target's category is authoritative and the extractor can't override it.
   */
  mixed?: boolean;
  /** Use Firecrawl for this page (e.g. sites that block datacenter browsers). Needs FIRECRAWL_API_KEY and credits. */
  engine?: "firecrawl";
  /** Extra guidance for the model about this specific page. */
  hint?: string;
}

/** `complete` is false when any page failed: keep existing plans active rather than hiding them. */
export interface ScrapeResult {
  plans: ScrapedPlan[];
  complete: boolean;
}

export interface ProviderScraper {
  name: string;
  country: Country;
  website: string;
  scrape(): Promise<ScrapeResult>;
}

/** Loose shape returned by LLM extraction / heuristic parsing, before normalisation. */
export interface RawPlan {
  title?: string | null;
  monthly_price?: number | string | null;
  data_gb?: number | string | null;
  speed_mbps?: number | string | null;
  talktime_mins?: number | string | null;
  sms_count?: number | string | null;
  contract_months?: number | string | null;
  category?: string | null;
  features?: string[] | null;
  promotion_badge?: string | null;
  supplementary_line_price?: number | null;
  affiliate_url?: string | null;
}
