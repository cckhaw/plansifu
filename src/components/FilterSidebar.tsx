"use client";

import type { Filters } from "@/lib/filters";
import { formatPrice } from "@/lib/currency";
import type { Currency, Provider } from "@/types/database";

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  providers: Provider[];
  currency: Currency;
  priceCeiling: number;
  isBroadband: boolean;
  onReset: () => void;
}

const field = "mb-5";
const label = "mb-2 block text-sm font-bold";

export function FilterSidebar({ filters, onChange, providers, currency, priceCeiling, isBroadband, onReset }: Props) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onChange({ ...filters, [k]: v });
  const toggleProvider = (id: string) =>
    set("providers", filters.providers.includes(id) ? filters.providers.filter((x) => x !== id) : [...filters.providers, id]);

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-20" aria-label="Filters">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-extrabold">Filters</h2>
        <button onClick={onReset} className="text-xs font-semibold text-sifu-gold hover:underline">Reset</button>
      </div>

      <div className={field}>
        <label htmlFor="f-sort" className={label}>Sort by</label>
        <select id="f-sort" value={filters.sort} onChange={(e) => set("sort", e.target.value as Filters["sort"])} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value={isBroadband ? "speed_desc" : "data_desc"}>{isBroadband ? "Fastest speed" : "Most data"}</option>
        </select>
      </div>

      <div className={field}>
        <label htmlFor="f-price" className={label}>Max monthly price: <span className="text-sifu-gold">{formatPrice(filters.maxPrice, currency)}</span></label>
        <input id="f-price" type="range" min={0} max={priceCeiling} step={1} value={filters.maxPrice} onChange={(e) => set("maxPrice", Number(e.target.value))} className="w-full accent-sifu-gold" />
      </div>

      {isBroadband ? (
        <div className={field}>
          <label htmlFor="f-speed" className={label}>Min speed</label>
          <select id="f-speed" value={filters.minSpeed} onChange={(e) => set("minSpeed", Number(e.target.value))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            {[0, 100, 300, 500, 1000, 2000].map((v) => <option key={v} value={v}>{v === 0 ? "Any" : v >= 1000 ? `${v / 1000}Gbps+` : `${v}Mbps+`}</option>)}
          </select>
        </div>
      ) : (
        <div className={field}>
          <label htmlFor="f-data" className={label}>Min data: <span className="text-sifu-gold">{filters.minData === 0 ? "Any" : `${filters.minData}GB`}</span></label>
          <input id="f-data" type="range" min={0} max={200} step={10} value={filters.minData} onChange={(e) => set("minData", Number(e.target.value))} className="w-full accent-sifu-gold" />
        </div>
      )}

      <fieldset className={field}>
        <legend className={label}>Contract</legend>
        {[{ v: null, l: "Any" }, { v: 0, l: "No contract" }, { v: 12, l: "12 months" }, { v: 24, l: "24 months" }].map((o) => (
          <label key={o.l} className="mb-1 flex cursor-pointer items-center gap-2 text-sm">
            <input type="radio" name="contract" className="accent-sifu-gold" checked={filters.contract === o.v} onChange={() => set("contract", o.v)} />
            {o.l}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend className={label}>Providers</legend>
        {providers.map((p) => (
          <label key={p.id} className="mb-1 flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" className="accent-sifu-gold" checked={filters.providers.includes(p.id)} onChange={() => toggleProvider(p.id)} />
            {p.name}
          </label>
        ))}
      </fieldset>
    </aside>
  );
}
