# PlanSifu — Project Conventions

Telco & broadband comparison platform for Malaysia 🇲🇾 (MYR) and Singapore 🇸🇬 (SGD),
inspired by CompareHero.my.

## Stack
- Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind CSS v4
- Supabase Postgres via `@supabase/supabase-js`
- Scraping: Playwright renders each page (free, runs in GitHub Actions) and Claude Haiku
  (`claude-haiku-5-5`, via `@anthropic-ai/sdk` structured outputs) extracts plans from the page text.
  Firecrawl (`@mendable/firecrawl-js`) is only a backup, used per page when Playwright + Haiku errors or finds nothing (`SCRAPE_ENGINE=firecrawl` flips the order).
  Sites that 403 GitHub's network (CelcomDigi) use `t.relay(...)`: HTML is fetched by `/api/fetch-page` on our Vercel deployment (Singapore region, auth = service-role key, host allowlist).
  Sites with a regular layout get a dedicated parser instead (StarHub, Zym - no model needed).
- Scripts run with `tsx`

## Structure
- `src/app` — App Router pages. Country lives in the path: `/` (hub), `/[country]` (`my`|`sg`), `/[country]/{mobile,postpaid,prepaid,broadband,travel-esim}`, programmatic `/[country]/mobile/[feature]` and `/[country]/broadband/[speed]` (404 below 3 plans), `/about`, `/sitemap.xml`, `/robots.txt`; APIs: `/api/redirect`, `/api/og` (social card, edge), `/api/fetch-page`. `src/middleware.ts` 301s the old `/mobile?type=&country=` URLs.
- `src/lib/seo-helpers.ts` — titles, descriptions, canonicals, OpenGraph/Twitter metadata (set `NEXT_PUBLIC_SITE_URL` to the primary domain); `src/components/seo/` — JSON-LD (Product/AggregateOffer, BreadcrumbList, FAQPage; FAQ markup must match visible FAQ text)
- `src/components` — Hero, Header, FilterSidebar, ComparisonView, ComparisonTable,
  PlanCard, DealBadge, ProviderLogo
- `src/lib` — Supabase clients, currency helpers, plan queries, filtering, seed data
- `src/types/database.ts` — TS interfaces mirroring the DB tables
- `scripts/scrapers` — Node scraping scripts (`db-upsert.ts`, `run-scrapers.ts`, `extract.ts`);
  providers are declared with `defineProvider` in `providers/*` (add a provider = add a row with its plan-page URLs)
- `supabase/migrations` — SQL migrations (numbered `NN_name.sql`)

## Commands
- `npm run dev` / `npm run build` / `npm run lint` / `npm run typecheck`
- `npm run scrape` — run all provider scrapers (needs `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`). `SCRAPE_ONLY="Maxis,M1"` limits providers;
  `SCRAPE_DEBUG=1` logs the raw model output; the run ends with a token/cost summary.

## Conventions
- Server Components by default; add `"use client"` only for interactive components.
- The service-role key is server/scraper only. Never import `src/lib/supabase-admin.ts`
  from client components.
- `data_gb = -1` means unlimited. Prices are always shown with their `currency`.
- Without Supabase env vars the site falls back to `src/lib/sample-plans.ts` so it
  runs locally out of the box.
- Scrapers must never throw out of `run-scrapers.ts` for one provider failing;
  failures are logged to `crawling_logs`.
- Affiliate links always go through `/api/redirect?plan_id=…` so clicks are tracked.

## Design System
Friendly, high-density, modern local aesthetic (CompareHero.my): clean card grids,
bold feature callouts, side-by-side spec comparison, filter sidebar, clear
"Get Deal / Apply Now" CTAs.
- Primary: Deep Sifu Gold `#D97706` (`sifu-gold`)
- Secondary: Dark Slate Blue `#0F172A` (`sifu-navy`)
- Tokens live in `src/app/globals.css` (`@theme`).
