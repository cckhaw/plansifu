-- Crawl report: one row per crawl run, plus per-provider detail on each crawling_logs row.
-- The /crawl-report page reads these with the service-role key (no public policies).

create table if not exists public.crawl_runs (
  id                uuid primary key default gen_random_uuid(),
  started_at        timestamptz not null default now(),
  finished_at       timestamptz,
  trigger           text,            -- 'schedule' | 'workflow_dispatch' | 'local'
  scope             text,            -- null = all providers, otherwise the SCRAPE_ONLY list
  git_sha           text,
  run_url           text,            -- link to the GitHub Actions run
  providers_total   integer not null default 0,
  providers_ok      integer not null default 0,
  providers_failed  integer not null default 0,
  warnings_count    integer not null default 0,
  llm_calls         integer,
  llm_cost_usd      numeric(8,4),
  llm_summary       text
);

create index if not exists crawl_runs_started_idx on public.crawl_runs (started_at desc);

alter table public.crawling_logs
  add column if not exists run_id           uuid references public.crawl_runs(id) on delete set null,
  add column if not exists engine           text,            -- e.g. 'browser+llm', 'firecrawl', 'custom parser'
  add column if not exists pages            jsonb not null default '[]'::jsonb,
  add column if not exists warnings         jsonb not null default '[]'::jsonb,
  add column if not exists previous_count   integer,
  add column if not exists plans_added      integer,
  add column if not exists plans_removed    integer,
  add column if not exists plans_changed    integer,
  add column if not exists duration_ms      integer;

create index if not exists crawling_logs_run_idx on public.crawling_logs (run_id);
create index if not exists crawling_logs_provider_time_idx on public.crawling_logs (provider_id, executed_at desc);

alter table public.crawl_runs enable row level security;
-- No policies: only the service role (scrapers and the report page) can read or write.
