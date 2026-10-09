"use client";

import { useMemo, useState } from "react";
import { applyFilters, type Filters } from "@/lib/filters";
import type { PlanWithProvider, Provider } from "@/types/database";
import { ComparisonTable } from "./ComparisonTable";
import { FilterSidebar } from "./FilterSidebar";
import { PlanCard } from "./PlanCard";

const MAX_COMPARE = 3;

export function ComparisonView({ plans, initialQuery = "" }: { plans: PlanWithProvider[]; initialQuery?: string }) {
  const isBroadband = plans.length > 0 && plans.every((p) => p.category === "broadband");
  const priceCeiling = Math.max(10, Math.ceil(Math.max(0, ...plans.map((p) => p.monthly_price)) / 10) * 10);
  const currency = plans[0]?.currency ?? "MYR";

  const providers = useMemo(() => {
    const map = new Map<string, Provider>();
    plans.forEach((p) => map.set(p.provider.id, p.provider));
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [plans]);

  const initial: Filters = { query: initialQuery, maxPrice: priceCeiling, minData: 0, minSpeed: 0, contract: null, providers: [], sort: "price_asc" };
  const [filters, setFilters] = useState<Filters>(initial);
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  const visible = useMemo(() => applyFilters(plans, filters), [plans, filters]);
  const chosen = plans.filter((p) => selected.includes(p.id));
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < MAX_COMPARE ? [...s, id] : s));

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <FilterSidebar filters={filters} onChange={setFilters} providers={providers} currency={currency} priceCeiling={priceCeiling} isBroadband={isBroadband} onReset={() => setFilters(initial)} />

      <section aria-live="polite">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            placeholder="Search plans, providers or perks…"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm"
            aria-label="Search plans"
          />
          <p className="text-sm font-medium text-slate-600">{visible.length} plan{visible.length === 1 ? "" : "s"}</p>
        </div>

        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
            No plans match your filters. <button className="font-semibold text-sifu-gold underline" onClick={() => setFilters(initial)}>Reset filters</button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {visible.map((p) => (
              <PlanCard key={p.id} plan={p} compare={{ selected: selected.includes(p.id), disabled: selected.length >= MAX_COMPARE, onToggle: () => toggle(p.id) }} />
            ))}
          </div>
        )}
      </section>

      {selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-sifu-navy px-4 py-3 text-white shadow-lg">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <p className="flex-1 text-sm">
              <strong>{selected.length}</strong> of {MAX_COMPARE} selected: {chosen.map((p) => p.title).join(" · ")}
            </p>
            <button onClick={() => setSelected([])} className="text-sm underline">Clear</button>
            <button disabled={selected.length < 2} onClick={() => setOpen(true)} className="rounded-lg bg-sifu-gold px-4 py-2 text-sm font-bold disabled:opacity-50">
              Compare {selected.length < 2 ? "(pick 2+)" : "now"}
            </button>
          </div>
        </div>
      )}
      {open && chosen.length >= 2 && <ComparisonTable plans={chosen} onClose={() => setOpen(false)} />}
    </div>
  );
}
