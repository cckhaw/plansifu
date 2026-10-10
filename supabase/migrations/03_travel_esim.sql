-- Travel eSIM section: global brands (providers with country 'GL'), their plans, FX rates.

alter table public.providers drop constraint if exists providers_country_check;
alter table public.providers add constraint providers_country_check check (country in ('MY', 'SG', 'GL'));

create table if not exists public.esim_plans (
  id              uuid primary key default gen_random_uuid(),
  provider_id     uuid not null references public.providers(id) on delete cascade,
  destination_key text not null,                 -- e.g. 'japan', 'europe', 'global'
  title           text not null,
  coverage        text,                          -- multi-country description
  data_gb         numeric,                       -- -1 = unlimited
  data_note       text,
  validity_days   integer,
  price           numeric(10,2) not null check (price >= 0),
  currency        varchar(3) not null,           -- the brand's own price currency
  voice_included  boolean,
  sms_included    boolean,
  voice_sms_note  text,
  phone_number    boolean,                       -- comes with a number that can receive calls / SMS
  perks           jsonb not null default '[]'::jsonb,
  affiliate_url   text,
  is_active       boolean not null default true,
  updated_at      timestamptz not null default now(),
  unique (provider_id, destination_key, title)
);

create index if not exists esim_plans_dest_active_idx on public.esim_plans (destination_key, is_active);

drop trigger if exists esim_plans_set_updated_at on public.esim_plans;
create trigger esim_plans_set_updated_at before update on public.esim_plans
  for each row execute function public.set_updated_at();

create table if not exists public.fx_rates (
  currency   varchar(3) primary key,
  per_usd    numeric not null,                   -- units of this currency per 1 USD
  updated_at timestamptz not null default now()
);

alter table public.affiliate_clicks add column if not exists esim_plan_id uuid references public.esim_plans(id) on delete set null;

alter table public.esim_plans enable row level security;
alter table public.fx_rates   enable row level security;

drop policy if exists "Public read active esim plans" on public.esim_plans;
create policy "Public read active esim plans" on public.esim_plans for select using (is_active = true);
drop policy if exists "Public read fx rates" on public.fx_rates;
create policy "Public read fx rates" on public.fx_rates for select using (true);
