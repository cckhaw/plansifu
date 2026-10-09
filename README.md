# PlanSifu

Compare mobile (postpaid / prepaid) and home fibre broadband plans across Malaysia 🇲🇾 and Singapore 🇸🇬.
Next.js 15 · React 19 · Tailwind v4 · Supabase · Playwright + Claude Haiku · GitHub Actions · Vercel.

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
| `ANTHROPIC_API_KEY` | Scrapers | From [console.anthropic.com](https://console.anthropic.com); Claude Haiku extracts plans (about $0.10 per full crawl) |
| `FIRECRAWL_API_KEY` | Scrapers (optional) | Only with `SCRAPE_ENGINE=firecrawl` |
| `VERCEL_DEPLOY_HOOK_URL` | GitHub Action | Triggers a rebuild after each crawl |

## 2. Run the scrapers

```bash
npx playwright install chromium   # one-time
npm run scrape
```

Each page is rendered in headless Chromium (Playwright) and its text is sent to Claude Haiku, which returns
structured plans. StarHub and Zym have dedicated parsers (no model call). A page that fails to load or extract makes
that provider fail without touching its existing plans. Results are upserted on `(provider_id, title)`, plans that disappear are marked
inactive, and every run is recorded in `crawling_logs`. Hand-edited `affiliate_url`s are preserved, so
**set your real affiliate links in the `plans.affiliate_url` column** — scrapers only supply the landing page as default.

Scraper selectors/URLs are in `scripts/scrapers/providers/*.ts`; provider sites change often, so check
`crawling_logs` for failures.

## 3. GitHub Actions (nightly crawl)

`.github/workflows/daily-scraper.yml` runs once a day at 03:00 MYT/SGT (`0 19 * * *` UTC) and can be run manually
(**Actions → Daily Scraper → Run workflow**).

Add under **Settings → Secrets and variables → Actions → Repository secrets**:
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `VERCEL_DEPLOY_HOOK_URL`.

## 4. Deploy to Vercel

1. Import the repo at [vercel.com/new](https://vercel.com/new) (framework: Next.js, auto-detected).
2. Add env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
3. **Settings → Git → Deploy Hooks**: create a hook for `main`, and save its URL as the `VERCEL_DEPLOY_HOOK_URL` GitHub secret.

## Affiliate tracking

All "Get Deal" buttons point to `/api/redirect?plan_id=<id>`, which logs the click to `affiliate_clicks` and
302-redirects to the plan's `affiliate_url` (falling back to the provider's website).

## Scripts

`npm run dev | build | start | lint | typecheck | scrape`
