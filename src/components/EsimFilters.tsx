"use client";

import { useRouter } from "next/navigation";
import type { EsimSort } from "@/lib/esim-rank";
import { ESIM_DESTINATIONS } from "@/lib/esim-destinations";
import { kindPath } from "@/lib/routes";
import type { Country } from "@/types/database";

export interface EsimFilterState {
  sort: EsimSort;
  all: boolean;
  voice: boolean;
  number: boolean;
  minGb: number;
  brand: string;
}

interface Props {
  country: Country;
  dest: string;
  state: EsimFilterState;
  onChange: (patch: Partial<EsimFilterState>) => void;
  brands: string[];
  counts: Record<string, number>;
}

const groups = [
  { label: "Countries", type: "country" as const },
  { label: "Multi-country combos", type: "region" as const },
  { label: "Worldwide", type: "global" as const },
];

const menu = "menu max-w-[60%] rounded-lg bg-fill-strong py-1.5 pl-3 text-[15px] font-medium outline-none";
const row = "flex items-center justify-between gap-3 px-4 py-3 text-[16px]";

/** Destination changes the page (each destination has its own URL); everything else filters in place. */
export function EsimFilters({ country, dest, state, onChange, brands, counts }: Props) {
  const router = useRouter();
  return (
    <div className="mb-6 grid gap-4 md:grid-cols-2">
      <div className="divide-y divide-sep overflow-hidden rounded-[18px] bg-surface shadow-card">
        <label className={row}>
          <span className="font-medium">Destination</span>
          <select value={dest} onChange={(e) => router.push(`${kindPath(country, "travel-esim")}/${e.target.value}`)} className={menu} aria-label="Destination">
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
          <select value={state.sort} onChange={(e) => onChange({ sort: e.target.value as EsimSort })} className={menu}>
            <option value="gb">Lowest cost per GB</option>
            <option value="price">Lowest price</option>
            <option value="day">Lowest cost per day</option>
            <option value="data">Most data</option>
          </select>
        </label>
        <label className={row}>
          <span>At least</span>
          <select value={String(state.minGb)} onChange={(e) => onChange({ minGb: Number(e.target.value) })} className={menu}>
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
          <select value={state.brand} onChange={(e) => onChange({ brand: e.target.value })} className={menu}>
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
          <input type="checkbox" checked={state.voice} onChange={(e) => onChange({ voice: e.target.checked })} className="switch" />
        </label>
        <label className={`${row} cursor-pointer`}>
          <span>Comes with a phone number</span>
          <input type="checkbox" checked={state.number} onChange={(e) => onChange({ number: e.target.checked })} className="switch" />
        </label>
        <label className={`${row} cursor-pointer`}>
          <span>Show all plan sizes</span>
          <input type="checkbox" checked={state.all} onChange={(e) => onChange({ all: e.target.checked })} className="switch" />
        </label>
      </div>
    </div>
  );
}
