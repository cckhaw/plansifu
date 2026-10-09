export type Country = "MY" | "SG";
export type Currency = "MYR" | "SGD";
export type PlanCategory = "mobile_postpaid" | "mobile_prepaid" | "broadband";

export interface Provider {
  id: string;
  name: string;
  country: Country;
  logo_url: string | null;
  website_url: string | null;
  is_featured: boolean;
}

export interface Plan {
  id: string;
  provider_id: string;
  title: string;
  category: PlanCategory;
  monthly_price: number;
  currency: Currency;
  /** -1 means unlimited */
  data_gb: number | null;
  speed_mbps: number | null;
  talktime_mins: number | null;
  sms_count: number | null;
  contract_months: number;
  features: string[];
  affiliate_url: string | null;
  promotion_badge: string | null;
  is_active: boolean;
  updated_at: string;
}

export interface CrawlingLog {
  id: string;
  provider_id: string | null;
  status: "success" | "error" | string;
  items_scraped: number;
  error_message: string | null;
  executed_at: string;
}

export interface AffiliateClick {
  id: string;
  plan_id: string | null;
  user_agent: string | null;
  referer: string | null;
  created_at: string;
}

/** Plan joined with its provider, as used by the UI. */
export interface PlanWithProvider extends Plan {
  provider: Provider;
}

/** Shape scrapers produce before provider resolution / upsert. */
export type ScrapedPlan = Omit<Plan, "id" | "provider_id" | "updated_at" | "is_active"> & {
  is_active?: boolean;
};
