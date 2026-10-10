export type Country = "MY" | "SG";
export type Currency = "MYR" | "SGD";
export type PlanCategory = "mobile_postpaid" | "mobile_prepaid" | "broadband";

export interface Provider {
  id: string;
  name: string;
  country: Country | "GL"; // "GL" = global (travel eSIM brands)
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

export type CrawlEngine = "browser+llm" | "firecrawl" | "custom parser";

export interface CrawlPageReport {
  url: string;
  engine: CrawlEngine;
  /** Plans the extractor returned before our filters. */
  raw_count: number;
  /** Plans kept after filtering. */
  kept_count: number;
  dropped: { title: string; reason: string }[];
  /** Characters of page text sent to the model (browser+llm only). */
  text_chars?: number;
  error?: string;
  /** True for pages known to list no plans (an empty result is not a warning). */
  expect_empty?: boolean;
  ms?: number;
}

export interface CrawlWarning {
  level: "error" | "warn" | "info";
  message: string;
}

export interface CrawlingLog {
  id: string;
  provider_id: string | null;
  status: "success" | "error" | string;
  items_scraped: number;
  error_message: string | null;
  executed_at: string;
  run_id?: string | null;
  engine?: string | null;
  pages?: CrawlPageReport[];
  warnings?: CrawlWarning[];
  previous_count?: number | null;
  plans_added?: number | null;
  plans_removed?: number | null;
  plans_changed?: number | null;
  duration_ms?: number | null;
}

export interface CrawlRun {
  id: string;
  started_at: string;
  finished_at: string | null;
  trigger: string | null;
  scope: string | null;
  git_sha: string | null;
  run_url: string | null;
  providers_total: number;
  providers_ok: number;
  providers_failed: number;
  warnings_count: number;
  llm_calls: number | null;
  llm_cost_usd: number | null;
  llm_summary: string | null;
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

/** Travel eSIM plan (table `esim_plans`). Prices are in the brand's own currency; the site converts at display time. */
export interface EsimPlan {
  id: string;
  provider_id: string;
  destination_key: string;
  title: string;
  /** Short description of the coverage, e.g. "39 European countries". */
  coverage: string | null;
  /** -1 = unlimited */
  data_gb: number | null;
  data_note: string | null;
  validity_days: number | null;
  price: number;
  currency: string;
  voice_included: boolean | null;
  sms_included: boolean | null;
  voice_sms_note: string | null;
  /** The plan comes with a phone number that can receive calls / SMS. */
  phone_number: boolean | null;
  perks: string[];
  affiliate_url: string | null;
  is_active: boolean;
  updated_at: string;
}

export type EsimPlanWithProvider = EsimPlan & { provider: Pick<Provider, "id" | "name" | "logo_url" | "website_url"> };
