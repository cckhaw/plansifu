-- PlanSifu schema: providers, plans, crawling_logs, affiliate_clicks

create extension if not exists "pgcrypto";

create table if not exists public.providers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  country     varchar(2) not null check (country in ('MY', 'SG')),
  logo_url    text,
  website_url text,
  is_featured boolean not null default false,
  unique (name, country)
);

create table if not exists public.plans (
  id              uuid primary key default gen_random_uuid(),
  provider_id     uuid not null references public.providers(id) on delete cascade,
  title           text not null,
  category        text not null check (category in ('mobile_postpaid', 'mobile_prepaid', 'broadband')),
  monthly_price   numeric(8,2) not null check (monthly_price >= 0),
  currency        varchar(3) not null check (currency in ('MYR', 'SGD')),
  data_gb         numeric,                    -- -1 = unlimited
  speed_mbps      integer,
  talktime_mins   integer,
  sms_count       integer,
  contract_months integer not null default 0,
  features        jsonb not null default '[]'::jsonb,
  affiliate_url   text,
  promotion_badge text,
  is_active       boolean not null default true,
  updated_at      timestamptz not null default now(),
  -- required by the scraper upsert (onConflict: provider_id,title)
  unique (provider_id, title)
);

create index if not exists plans_category_active_idx on public.plans (category, is_active);
create index if not exists plans_provider_idx on public.plans (provider_id);

create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists plans_set_updated_at on public.plans;
create trigger plans_set_updated_at before update on public.plans
  for each row execute function public.set_updated_at();

create table if not exists public.crawling_logs (
  id            uuid primary key default gen_random_uuid(),
  provider_id   uuid references public.providers(id) on delete set null,
  status        text not null,                 -- 'success' | 'error'
  items_scraped integer not null default 0,
  error_message text,
  executed_at   timestamptz not null default now()
);

create table if not exists public.affiliate_clicks (
  id         uuid primary key default gen_random_uuid(),
  plan_id    uuid references public.plans(id) on delete set null,
  user_agent text,
  referer    text,
  created_at timestamptz not null default now()
);

create index if not exists affiliate_clicks_plan_idx on public.affiliate_clicks (plan_id, created_at desc);

-- Row Level Security: public can read catalogue; writes use the service role (bypasses RLS).
alter table public.providers        enable row level security;
alter table public.plans            enable row level security;
alter table public.crawling_logs    enable row level security;
alter table public.affiliate_clicks enable row level security;

create policy "providers are public" on public.providers for select using (true);
create policy "active plans are public" on public.plans for select using (is_active);
-- crawling_logs and affiliate_clicks: no public policies (service role only).

-- Seed providers
insert into public.providers (name, country, website_url, is_featured) values
  ('Maxis',      'MY', 'https://www.maxis.com.my',      true),
  ('CelcomDigi', 'MY', 'https://www.celcomdigi.com',    true),
  ('Unifi',      'MY', 'https://unifi.com.my',          true),
  ('U Mobile',   'MY', 'https://www.u.com.my',          false),
  ('Singtel',    'SG', 'https://www.singtel.com',       true),
  ('M1',         'SG', 'https://www.m1.com.sg',         true),
  ('StarHub',    'SG', 'https://www.starhub.com',       false)
on conflict (name, country) do nothing;
