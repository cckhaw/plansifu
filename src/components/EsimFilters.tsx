"use client";

import type { Country } from "@/types/database";
import { ESIM_DESTINATIONS } from "@/lib/esim-destinations";

interface Props {
  country: Country;
  dest: string;
  sort: string;
  all: boolean;
  voice: boolean;
  number: boolean;
  minGb: number;
  brand: string;
  brands: string[];
  counts: Record<string, number>;
}

const submit = (e: React.ChangeEvent<HTMLElement>) => (e.currentTarget as HTMLInputElement).form?.requestSubmit();

const groups = [
  { label: "Countries", type: "country" as const },
  { label: "Multi-country combos", type: "region" as const },
  { label: "Worldwide", type: "global" as const },
];

export function EsimFilters({ country, dest, sort, all, voice, number, minGb, brand, brands, counts }: Props) {
  const field = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium focus:border-sifu-gold focus:outline-none focus:ring-2 focus:ring-sifu-gold/30";
  return (
    <form method="get" action="/travel-esim" className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[2fr_1fr_1fr_1fr]">
      <input type="hidden" name="country" value={country} />
      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Where are you going?
        <select name="dest" defaultValue={dest} onChange={submit} className={field}>
          {groups.map((g) => (
            <optgroup key={g.type} label={g.label}>
              {ESIM_DESTINATIONS.filter((d) => d.type === g.type).map((d) => (
                <option key={d.key} value={d.key}>
                  {d.flag} {d.name} {counts[d.key] ? `(${counts[d.key]} plans)` : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Sort by
        <select name="sort" defaultValue={sort} onChange={submit} className={field}>
          <option value="gb">Lowest cost per GB</option>
          <option value="price">Lowest price</option>
          <option value="day">Lowest cost per day</option>
          <option value="data">Most data</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        At least
        <select name="min" defaultValue={String(minGb)} onChange={submit} className={field}>
          <option value="0">Any data</option>
          <option value="1">1 GB</option>
          <option value="3">3 GB</option>
          <option value="5">5 GB</option>
          <option value="10">10 GB</option>
          <option value="20">20 GB</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Brand
        <select name="brand" defaultValue={brand} onChange={submit} className={field}>
          <option value="">All brands</option>
          {brands.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 md:col-span-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="all" value="1" defaultChecked={all} onChange={submit} className="size-4 accent-sifu-gold" />
          Show all plan sizes
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="voice" value="1" defaultChecked={voice} onChange={submit} className="size-4 accent-sifu-gold" />
          Includes voice or SMS
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="number" value="1" defaultChecked={number} onChange={submit} className="size-4 accent-sifu-gold" />
          Comes with a phone number
        </label>
        <noscript>
          <button type="submit" className="rounded-lg bg-sifu-gold px-3 py-1.5 text-sm font-bold text-white">Apply</button>
        </noscript>
      </div>
    </form>
  );
}
