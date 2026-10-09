import type { Country, PlanCategory, ScrapedPlan } from "../../src/types/database";

export interface ScrapeTarget {
  url: string;
  /** Default category; extraction may override per plan when the page says otherwise. */
  category: PlanCategory;
}

export interface ProviderScraper {
  name: string;
  country: Country;
  website: string;
  scrape(): Promise<ScrapedPlan[]>;
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
  affiliate_url?: string | null;
}
