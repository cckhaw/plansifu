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
  /** Rendered inside a sheet: drop the card chrome. */
  bare?: boolean;
}

/** An iOS "inset grouped" section: a small caption above a rounded white list. */
function Group({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      {title && <h3 className="mb-1.5 px-4 text-[12px] font-medium uppercase tracking-wide text-label-3">{title}</h3>}
      <div className="divide-y divide-sep overflow-hidden rounded-2xl bg-surface shadow-card [&>*]:px-4">{children}</div>
    </section>
  );
}

const pct = (v: number, max: number) => ({ "--pct": `${max ? (v / max) * 100 : 0}%` }) as React.CSSProperties;

export function FilterSidebar({ filters, onChange, providers, currency, priceCeiling, isBroadband, onReset, bare }: Props) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onChange({ ...filters, [k]: v });
  const toggleProvider = (id: string) =>
    set("providers", filters.providers.includes(id) ? filters.providers.filter((x) => x !== id) : [...filters.providers, id]);
  const select = "menu rounded-lg bg-fill-strong py-1.5 pl-3 text-[15px] font-medium outline-none";

  return (
    <aside aria-label="Filters" className={bare ? "" : "lg:sticky lg:top-20"}>
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-[22px] font-bold tracking-tight">Filters</h2>
        <button onClick={onReset} className="press text-[15px] font-medium text-accent">Reset</button>
      </div>

      <Group>
        <label className="flex items-center justify-between gap-3 py-3 text-[16px]">
          Sort by
          <select value={filters.sort} onChange={(e) => set("sort", e.target.value as Filters["sort"])} className={select}>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value={isBroadband ? "speed_desc" : "data_desc"}>{isBroadband ? "Fastest speed" : "Most data"}</option>
          </select>
        </label>
      </Group>

      <Group>
        <div className="py-3">
          <div className="mb-1 flex items-center justify-between text-[16px]">
            <label htmlFor="f-price">Max price / month</label>
            <span className="font-semibold tabular-nums text-accent">{formatPrice(filters.maxPrice, currency)}</span>
          </div>
          <input id="f-price" className="slider w-full" style={pct(filters.maxPrice, priceCeiling)} type="range" min={0} max={priceCeiling} step={1} value={filters.maxPrice} onChange={(e) => set("maxPrice", Number(e.target.value))} />
        </div>
        {isBroadband ? (
          <label className="flex items-center justify-between gap-3 py-3 text-[16px]">
            Min speed
            <select value={filters.minSpeed} onChange={(e) => set("minSpeed", Number(e.target.value))} className={select}>
              {[0, 100, 300, 500, 1000, 2000].map((v) => <option key={v} value={v}>{v === 0 ? "Any" : v >= 1000 ? `${v / 1000}Gbps+` : `${v}Mbps+`}</option>)}
            </select>
          </label>
        ) : (
          <div className="py-3">
            <div className="mb-1 flex items-center justify-between text-[16px]">
              <label htmlFor="f-data">Min data</label>
              <span className="font-semibold tabular-nums text-accent">{filters.minData === 0 ? "Any" : `${filters.minData}GB`}</span>
            </div>
            <input id="f-data" className="slider w-full" style={pct(filters.minData, 200)} type="range" min={0} max={200} step={10} value={filters.minData} onChange={(e) => set("minData", Number(e.target.value))} />
          </div>
        )}
      </Group>

      <Group title="Contract">
        {[{ v: null, l: "Any" }, { v: 0, l: "No contract" }, { v: 12, l: "12 months" }, { v: 24, l: "24 months" }].map((o) => (
          <button key={o.l} type="button" role="radio" aria-checked={filters.contract === o.v} onClick={() => set("contract", o.v)} className="press flex w-full items-center justify-between py-3 text-left text-[16px]">
            {o.l}
            {filters.contract === o.v && <span aria-hidden className="text-accent">✓</span>}
          </button>
        ))}
      </Group>

      <Group title="Providers">
        {providers.map((p) => (
          <label key={p.id} className="flex cursor-pointer items-center justify-between gap-3 py-2.5 text-[16px]">
            {p.name}
            <input type="checkbox" className="switch" checked={filters.providers.includes(p.id)} onChange={() => toggleProvider(p.id)} />
          </label>
        ))}
      </Group>
    </aside>
  );
}
