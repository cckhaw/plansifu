import type { Country, CrawlPageReport, PlanCategory, ScrapedPlan } from "../../src/types/database";

/** What a parser gets: the rendered page in every form that is useful for picking plans out of it. */
export interface PageData {
  url: string;
  /** Rendered DOM (use with cheerio: `load(page.html)`). */
  html: string;
  /** Text nodes of the rendered page, one per line. */
  text: string;
  /** JSON responses the page loaded that contain prices (the site's own plan data). */
  feeds: { url: string; body: string; prices: number }[];
  /** The DOM in the page's other tab states (see renderPage). A parser for a tabbed page reads `html` and each of these. */
  states?: string[];
}

/** Turns one rendered page into raw plans. Must be deterministic and make no network or model calls. */
export type PageParser = (page: PageData) => RawPlan[];

export interface ScrapeTarget {
  url: string;
  /** Default category; the parser may override per plan when the page says otherwise (needs `mixed`). */
  category: PlanCategory;
  /**
   * True for pages that list several categories (e.g. a homepage or store front).
   * Otherwise the target's category is authoritative and the parser can't override it.
   */
  mixed?: boolean;
  /** Fetch the HTML through our Vercel relay (sites that 403 the CI network); see browser.ts. */
  relay?: boolean;
  /** The page is known to list no plans; an empty result should not raise a warning. */
  expectEmpty?: boolean;
  /** The site-specific parser for this page. */
  parse: PageParser;
}

/** `complete` is false when any page failed: keep existing plans active rather than hiding them. */
export interface ScrapeResult {
  plans: ScrapedPlan[];
  complete: boolean;
  /** What happened on each page, for the crawl report. */
  pages: CrawlPageReport[];
}

export interface ProviderScraper {
  name: string;
  country: Country;
  website: string;
  /** The pages this provider crawls (absent for providers with a fully custom scrape(), like StarHub and Zym). */
  targets?: ScrapeTarget[];
  scrape(): Promise<ScrapeResult>;
}

/** Loose shape returned by a parser, before normalisation. */
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
