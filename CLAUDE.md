# PlanSifu — Project Conventions

Telco & broadband comparison platform for Malaysia 🇲🇾 (MYR) and Singapore 🇸🇬 (SGD),
inspired by CompareHero.my.

## Stack
- Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind CSS v4
- Supabase Postgres via `@supabase/supabase-js`
- Firecrawl via `@mendable/firecrawl-js` (the published npm name of the Firecrawl SDK;
  `@firecrawl/sdk` does not exist on npm) with Playwright as fallback
- Scripts run with `tsx`

## Structure
- `src/app` — App Router pages: `/`, `/mobile`, `/broadband`, `/api/redirect`
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
  `SUPABASE_SERVICE_ROLE_KEY`, `FIRECRAWL_API_KEY`)

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
