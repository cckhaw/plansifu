import type { Metadata } from "next";
import { COUNTRIES, formatPrice } from "@/lib/currency";
import { RESTRICTED } from "@/lib/picks";
import { kindPath, type Kind } from "@/lib/routes";
import type { Country, PlanWithProvider } from "@/types/database";

/**
 * Canonical origin. Set NEXT_PUBLIC_SITE_URL once a primary domain is chosen (e.g. https://plansifu.khaw.cc);
 * every canonical URL, sitemap entry and social image URL follows it.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://plansifu.vercel.app").replace(/\/$/, "");
export const SITE_NAME = "PlanSifu 师傅";
export const BRAND = "PlanSifu 师傅";

export const absoluteUrl = (path: string) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/** Canonical URL: path plus only the query params that change the page's content. */
export function canonicalUrl(path: string, query?: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) if (v) q.set(k, v);
  const s = q.toString();
  return absoluteUrl(s ? `${path}?${s}` : path);
}

const year = () => new Date().getFullYear();

export interface PlanStats {
  count: number;
  providers: string[];
  currency: "MYR" | "SGD";
  low: number | null;
  high: number | null;
}

/** Facts used in titles, descriptions and structured data. Only real numbers from the live data. */
export function planStats(plans: PlanWithProvider[], country: Country): PlanStats {
  // Headline price range excludes plans limited to an age group (senior, youth...), which most visitors cannot buy.
  const open = plans.filter((p) => !RESTRICTED.test(`${p.title} ${p.features.join(" ")}`));
  const prices = (open.length ? open : plans).map((p) => Number(p.monthly_price)).filter((n) => n > 0);
  const byCount = new Map<string, number>();
  plans.forEach((p) => byCount.set(p.provider.name, (byCount.get(p.provider.name) ?? 0) + 1));
  return {
    count: plans.length,
    providers: [...byCount].sort((a, b) => b[1] - a[1]).map(([n]) => n),
    currency: COUNTRIES[country].currency,
    low: prices.length ? Math.min(...prices) : null,
    high: prices.length ? Math.max(...prices) : null,
  };
}

export const fromPrice = (s: PlanStats) => (s.low === null ? undefined : formatPrice(s.low, s.currency));

const KIND_NOUN: Record<Kind, string> = {
  mobile: "Mobile Plans",
  postpaid: "Postpaid Plans",
  prepaid: "Prepaid Plans",
  broadband: "Home Fibre Broadband Plans",
  "travel-esim": "Travel eSIM",
};

/** High-CTR title: "Best Postpaid Plans in Malaysia (2026) | PlanSifu 师傅". `qualifier` is e.g. "5G" or "1Gbps". */
export function buildTitle(opts: { country: Country; kind: Kind; qualifier?: string; best?: boolean }): string {
  const place = COUNTRIES[opts.country].label;
  if (opts.kind === "travel-esim") return `${opts.qualifier ? `${opts.qualifier} ` : ""}Travel eSIM Compared (${year()}) | ${BRAND}`.replace("  ", " ");
  const noun = KIND_NOUN[opts.kind];
  const best = opts.best === false ? "" : "Best ";
  return `${best}${opts.qualifier ? `${opts.qualifier} ` : ""}${noun} in ${place} (${year()}) | ${BRAND}`;
}

export function buildDescription(opts: { country: Country; kind: Kind; stats: PlanStats; qualifier?: string }): string {
  const { country, kind, stats, qualifier } = opts;
  const place = COUNTRIES[country].label;
  const noun = KIND_NOUN[kind].toLowerCase();
  const q = qualifier ? `${qualifier} ` : "";
  if (!stats.count) return `Compare ${q}${noun} in ${place} on PlanSifu: prices, data and contract terms side by side, updated every night.`;
  const who = stats.providers.slice(0, 3).join(", ");
  const range = stats.low !== null && stats.high !== null && stats.low !== stats.high ? ` Prices from ${formatPrice(stats.low, stats.currency)} to ${formatPrice(stats.high, stats.currency)}.` : stats.low !== null ? ` From ${formatPrice(stats.low, stats.currency)}.` : "";
  return `Compare ${stats.count} ${q}${noun} in ${place} from ${who} and more.${range} Filter by price and data, updated every night.`;
}

export function buildKeywords(opts: { country: Country; kind: Kind; qualifier?: string; providers?: string[] }): string[] {
  const place = COUNTRIES[opts.country].label;
  const noun = KIND_NOUN[opts.kind].toLowerCase().replace(" plans", " plan");
  const q = opts.qualifier ? `${opts.qualifier.toLowerCase()} ` : "";
  return [
    `${q}${noun} ${place.toLowerCase()}`,
    `best ${q}${noun} ${place.toLowerCase()}`,
    `compare ${q}${noun} ${COUNTRIES[opts.country].currency}`,
    ...(opts.providers ?? []).slice(0, 5).map((p) => `${p} ${q}${noun}`),
  ];
}

/** URL of the dynamic social card (see src/app/api/og/route.tsx). */
export function ogImageUrl(opts: { title: string; country: Country; from?: string; badge?: string }): string {
  const q = new URLSearchParams({ title: opts.title, country: opts.country });
  if (opts.from) q.set("from", opts.from);
  if (opts.badge) q.set("badge", opts.badge);
  return absoluteUrl(`/api/og?${q.toString()}`);
}

export interface PageSeo {
  country: Country;
  kind: Kind;
  /** Path without query, e.g. /my/broadband/1gbps */
  path: string;
  title: string;
  description: string;
  keywords: string[];
  /** Short page name for the social card, e.g. "Best Postpaid Plans". */
  heading: string;
  from?: string;
  /** Query params that define distinct content and belong in the canonical URL. */
  canonicalQuery?: Record<string, string | undefined>;
  /** noindex: filtered or thin pages that should not compete with the canonical one. */
  noindex?: boolean;
  /** The same page for the other country (en-MY / en-SG alternates). */
  alternates?: { MY?: string; SG?: string };
}

/** Complete Next.js Metadata: title, description, canonical, robots, OpenGraph and Twitter card. */
export function buildMetadata(s: PageSeo): Metadata {
  const url = canonicalUrl(s.path, s.canonicalQuery);
  const image = ogImageUrl({ title: s.heading, country: s.country, from: s.from });
  const locale = s.country === "SG" ? "en_SG" : "en_MY";
  return {
    title: { absolute: s.title },
    description: s.description,
    keywords: s.keywords,
    alternates: {
      canonical: url,
      ...(s.alternates
        ? {
            languages: {
              ...(s.alternates.MY ? { "en-MY": absoluteUrl(s.alternates.MY) } : {}),
              ...(s.alternates.SG ? { "en-SG": absoluteUrl(s.alternates.SG) } : {}),
              ...(s.alternates.MY ? { "x-default": absoluteUrl(s.alternates.MY) } : {}),
            },
          }
        : {}),
    },
    robots: s.noindex ? { index: false, follow: true } : { index: true, follow: true, "max-image-preview": "large" },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: s.title,
      description: s.description,
      url,
      locale,
      images: [{ url: image, width: 1200, height: 630, alt: s.heading }],
    },
    twitter: { card: "summary_large_image", title: s.title, description: s.description, images: [image] },
  };
}

/** Convenience for the category pages (/my/postpaid, /sg/broadband, ...). */
export function categorySeo(opts: { country: Country; kind: Kind; plans: PlanWithProvider[] }): PageSeo {
  const stats = planStats(opts.plans, opts.country);
  const title = buildTitle({ country: opts.country, kind: opts.kind });
  return {
    country: opts.country,
    kind: opts.kind,
    path: kindPath(opts.country, opts.kind),
    title,
    description: buildDescription({ country: opts.country, kind: opts.kind, stats }),
    keywords: buildKeywords({ country: opts.country, kind: opts.kind, providers: stats.providers }),
    heading: title.split(" | ")[0].replace(/ \(\d{4}\)/, ""),
    alternates: { MY: kindPath("MY", opts.kind), SG: kindPath("SG", opts.kind) },
    from: fromPrice(stats) && `From ${fromPrice(stats)}${opts.kind === "prepaid" ? "" : "/mo"}`,
  };
}
