# PlanSifu

Compare mobile (postpaid / prepaid) and home fibre broadband plans across Malaysia 🇲🇾 and Singapore 🇸🇬.
Next.js 15 · React 19 · Tailwind v4 · Supabase · Playwright + per-site parsers · GitHub Actions · Vercel.

See [`CLAUDE.md`](./CLAUDE.md) for architecture and conventions.

## Quick start (no backend needed)

```bash
npm install
npm run dev     # http://localhost:3000
```

Without Supabase env vars the site renders built-in sample plans (`src/lib/sample-plans.ts`).

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/migrations/01_plansifu_schema.sql` in **SQL Editor** (or `supabase db push`).
   It creates `providers`, `plans`, `crawling_logs`, `affiliate_clicks`, RLS policies and seeds providers.
3. From **Project Settings → API** copy the URL, `anon` key and `service_role` key.
4. `cp .env.example .env.local` and fill in the values.

| Variable | Used by | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Next.js (read plans) | Safe for the browser |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Scrapers, `/api/redirect` | **Secret** – server only |
| `VERCEL_DEPLOY_HOOK_URL` | GitHub Action | Triggers a rebuild after each crawl |

## 2. Run the scrapers

```bash
npx playwright install chromium   # one-time
npm run scrape
```

Each page is rendered in headless Chromium (Playwright), which opens tabs, "show more" buttons and accordions and records any JSON
price feeds the page loads. A parser written for that specific page (`scripts/scrapers/providers/*.ts`, and
`scripts/esim/parsers/*.ts` for Travel eSIM brands) turns it into plans: **no model or paid service is involved, so a crawl
costs nothing**. See `scripts/scrapers/README.md` for how to write or fix a parser. A page that fails to load or parse makes that
provider fail without touching its existing plans. Results are upserted on `(provider_id, title)`, plans that disappear are marked
inactive, and every run is recorded in `crawling_logs`. Hand-edited `affiliate_url`s are preserved, so
**set your real affiliate links in the `plans.affiliate_url` column** — scrapers only supply the landing page as default.

Provider sites change often: when a parser stops finding plans the crawl report names the page; capture it again
(`npm run crawl:capture -- "<provider>"`), fix the parser and run `npm run test:parsers`.

## 3. GitHub Actions (nightly crawl)

`.github/workflows/daily-scraper.yml` runs once a day at about 02:30 MYT/SGT (`23 18 * * *` UTC) and can be run manually
(**Actions → Daily Scraper → Run workflow**). Two inputs, each listing its valid values in the form:
- `telco_providers`: `all` (default), `none`, `Malaysia`, `Singapore`, or comma-separated names (`M1, Maxx`; `CMLink (SG)` when a name exists in both countries).
- `esim_providers`: `none` (default), `all`, or comma-separated Travel eSIM brands (`Airalo, Saily`).

A targeted run (anything other than all/none) also logs which extracted rows the filters dropped. The value lists in the workflow are static: update them when you add a provider or brand (an unknown name fails the run with the full list of valid values).
The nightly run crawls every telco and no eSIM. The **Travel eSIM** crawl runs separately once a week, Sundays about 03:40 MYT/SGT (`37 19 * * 6` UTC). Run `supabase/migrations/03_travel_esim.sql` before its first run.

Add under **Settings → Secrets and variables → Actions → Repository secrets**:
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VERCEL_DEPLOY_HOOK_URL`. The crawl calls no paid service, so no model API key is needed.

## 4. Deploy to Vercel

1. Import the repo at [vercel.com/new](https://vercel.com/new) (framework: Next.js, auto-detected).
2. Add env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
3. **Settings → Git → Deploy Hooks**: create a hook for `main`, and save its URL as the `VERCEL_DEPLOY_HOOK_URL` GitHub secret.

## Affiliate tracking

All "Get Deal" buttons point to `/api/redirect?plan_id=<id>`, which logs the click to `affiliate_clicks` and
302-redirects to the plan's `affiliate_url` (falling back to the provider's website).

## Scripts

`npm run dev | build | start | lint | typecheck | scrape`

## 4. Importing pages the crawler cannot reach (M1, Maxx)

`m1.com.sg` and `maxxonline.sg` show a CAPTCHA to datacenter networks (GitHub, Vercel), so they are imported from your own browser:

1. Open `https://<your site>/import?key=<CRAWL_REPORT_KEY>` and drag **Send to PlanSifu** to your bookmarks bar (once).
2. Open each listed page on the provider's site, wait for the plans to load, and click the bookmark (allow the pop-up the first time). Keep the import window open.
3. Press **Check** to preview the parsed plans, then **Save to PlanSifu**. If a page cannot be sent, use "or upload" with a saved copy (Ctrl+S, "Webpage, HTML only").

If every page of a provider is supplied, plans that no longer appear are deactivated; otherwise existing plans stay as they are. The parsers for these two providers live in `scripts/scrapers/sources/` and are written against real captured pages ("Download the captured pages" on the import page saves them as a file).

## 5. Vercel housekeeping

- Preview deployments are switched off for the project (Vercel: `previewDeploymentsDisabled`), so only pushes to `main` build.
- `.github/workflows/prune-deployments.yml` deletes every deployment except the latest production one after each successful
  production deploy (and weekly as a safety net; "Run workflow" with `dry_run` = true only lists them). It needs the repository
  secret `VERCEL_TOKEN`. The script (`scripts/ops/prune-deployments.mjs`) refuses to delete anything unless the newest production
  deployment is ready and serves the live domain, and it uses fixed project/team ids rather than `VERCEL_PROJECT_ID`.
  Because only one deployment is kept, there is nothing to roll back to in Vercel: fix forward by pushing to `main`.
- The Travel eSIM crawl removes providers that are no longer in `scripts/esim/brands.ts` (e.g. a dropped brand) from the database.
