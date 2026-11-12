# PlanSifu — Project Conventions

Telco & broadband comparison platform for Malaysia 🇲🇾 (MYR) and Singapore 🇸🇬 (SGD),
inspired by CompareHero.my.

## Stack
- Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind CSS v4
- Supabase Postgres via `@supabase/supabase-js`
- Scraping: Playwright renders each page (free, runs in GitHub Actions; tabs, "show more" buttons and accordions are opened first) and a
  per-page deterministic parser turns it into plans. **No model or paid API is used anywhere in the crawl.** Parsers live in
  `scripts/scrapers/providers/*.ts` (telco) and `scripts/esim/parsers/*.ts` (Travel eSIM), are tested against saved pages in
  `fixtures/` (`npm run test:parsers`), and are written with `npm run crawl:capture` / `crawl:try` (telco) and `esim:capture` / `esim:try`;
  see `scripts/scrapers/README.md`. A parser that finds nothing fails its page loudly instead of guessing.
  Sites that 403 GitHub's network (CelcomDigi) use `t.relay(...)`: HTML is fetched by `/api/fetch-page` on our Vercel deployment (Singapore region, auth = service-role key, host allowlist).
- Scripts run with `tsx`

## Structure
- `src/app` — App Router pages. Country lives in the path: `/` (hub), `/[country]` (`my`|`sg`), `/[country]/{mobile,postpaid,prepaid,broadband,travel-esim}`, programmatic `/[country]/mobile/[feature]`, `/[country]/broadband/[speed]` and `/[country]/travel-esim/[destination]` (noindex/404 below 3 plans), `/about`, `/sitemap.xml`, `/robots.txt`; APIs: `/api/redirect`, `/api/og` (social card, edge), `/api/fetch-page`. `src/middleware.ts` 301s the old `/mobile?type=&country=` and `?dest=` URLs.
- `src/lib/seo-helpers.ts` — titles, descriptions, canonicals, OpenGraph/Twitter metadata (set `NEXT_PUBLIC_SITE_URL` to the primary domain); `src/components/seo/` — JSON-LD (Product/AggregateOffer, BreadcrumbList, FAQPage; FAQ markup must match visible FAQ text)
- `src/components` — Hero, Header, FilterSidebar, ComparisonView, ComparisonTable,
  PlanCard, DealBadge, ProviderLogo
- `src/lib` — Supabase clients, currency helpers, plan queries, filtering, seed data
- `src/types/database.ts` — TS interfaces mirroring the DB tables
- `/import?key=<CRAWL_REPORT_KEY>` + `/api/import-page` — private page for providers whose sites block the crawler (M1, Maxx): a bookmarklet sends the page you are looking at in your own browser here, the provider's own parsers read it (`scripts/scrapers/import-pages.ts`, sources in `import-sources.ts` / `sources/`), and Save upserts the plans. Partial imports never deactivate plans.
- `scripts/scrapers` — Node scraping scripts (`db-upsert.ts`, `run-scrapers.ts`, `extract.ts`);
  providers are declared with `defineProvider` in `providers/*` (add a provider = add a row with its plan-page URLs)
- `supabase/migrations` — SQL migrations (numbered `NN_name.sql`)

## Commands
- `npm run dev` / `npm run build` / `npm run lint` / `npm run typecheck`
- `npm run scrape` — run all provider scrapers (needs `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`). `SCRAPE_ONLY` limits providers: `"Maxis,M1"` by name, `Malaysia` / `Singapore` for a country, `all` (default) or `none` (`scripts/scrapers/select.ts`; also used by `npm run scrape:esim` for brands);
  `SCRAPE_DEBUG=1` logs extra detail (dropped rows).

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
