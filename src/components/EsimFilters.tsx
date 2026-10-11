"use client";

import type { Country } from "@/types/database";
import { ESIM_DESTINATIONS } from "@/lib/esim-destinations";
import { kindPath } from "@/lib/routes";

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

const menu = "menu max-w-[60%] rounded-lg bg-fill-strong py-1.5 pl-3 text-[15px] font-medium outline-none";
const row = "flex items-center justify-between gap-3 px-4 py-3 text-[16px]";

export function EsimFilters({ country, dest, sort, all, voice, number, minGb, brand, brands, counts }: Props) {
  return (
    <form method="get" action={kindPath(country, "travel-esim")} className="rise mb-6 grid gap-4 md:grid-cols-2" style={{ "--i": 2 } as React.CSSProperties}>

      <div className="divide-y divide-sep overflow-hidden rounded-[18px] bg-surface shadow-card">
        <label className={row}>
          <span className="font-medium">Destination</span>
          <select name="dest" defaultValue={dest} onChange={submit} className={menu}>
            {groups.map((g) => (
              <optgroup key={g.type} label={g.label}>
                {ESIM_DESTINATIONS.filter((d) => d.type === g.type).map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.flag} {d.name} {counts[d.key] ? `(${counts[d.key]})` : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className={row}>
          <span>Sort by</span>
          <select name="sort" defaultValue={sort} onChange={submit} className={menu}>
            <option value="gb">Lowest cost per GB</option>
            <option value="price">Lowest price</option>
            <option value="day">Lowest cost per day</option>
            <option value="data">Most data</option>
          </select>
        </label>
        <label className={row}>
          <span>At least</span>
          <select name="min" defaultValue={String(minGb)} onChange={submit} className={menu}>
            <option value="0">Any data</option>
            <option value="1">1 GB</option>
            <option value="3">3 GB</option>
            <option value="5">5 GB</option>
            <option value="10">10 GB</option>
            <option value="20">20 GB</option>
          </select>
        </label>
        <label className={row}>
          <span>Brand</span>
          <select name="brand" defaultValue={brand} onChange={submit} className={menu}>
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="divide-y divide-sep self-start overflow-hidden rounded-[18px] bg-surface shadow-card">
        <label className={`${row} cursor-pointer`}>
          <span>Includes voice or SMS</span>
          <input type="checkbox" name="voice" value="1" defaultChecked={voice} onChange={submit} className="switch" />
        </label>
        <label className={`${row} cursor-pointer`}>
          <span>Comes with a phone number</span>
          <input type="checkbox" name="number" value="1" defaultChecked={number} onChange={submit} className="switch" />
        </label>
        <label className={`${row} cursor-pointer`}>
          <span>Show all plan sizes</span>
          <input type="checkbox" name="all" value="1" defaultChecked={all} onChange={submit} className="switch" />
        </label>
        <noscript>
          <div className="p-3"><button type="submit" className="rounded-full bg-accent-fill px-4 py-2 text-sm font-semibold text-accent-on-fill">Apply</button></div>
        </noscript>
      </div>
    </form>
  );
}
