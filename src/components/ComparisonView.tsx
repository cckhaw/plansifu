"use client";

import { useEffect, useMemo, useState } from "react";
import { applyFilters, type Filters } from "@/lib/filters";
import type { PlanWithProvider, Provider } from "@/types/database";
import { ComparisonTable } from "./ComparisonTable";
import { FilterSidebar } from "./FilterSidebar";
import { CloseIcon, SearchIcon } from "./Icons";
import { PlanCard } from "./PlanCard";

const MAX_COMPARE = 3;

export function ComparisonView({ plans, initialQuery = "", lead }: { plans: PlanWithProvider[]; initialQuery?: string; /** Content shown between the search/filter bar and the full list (e.g. the "Best for…" picks). */ lead?: React.ReactNode }) {
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
  const [sheet, setSheet] = useState(false);

  const visible = useMemo(() => applyFilters(plans, filters), [plans, filters]);
  const chosen = plans.filter((p) => selected.includes(p.id));
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < MAX_COMPARE ? [...s, id] : s));
  const activeFilters = [filters.maxPrice < priceCeiling, filters.minData > 0, filters.minSpeed > 0, filters.contract !== null, filters.providers.length > 0].filter(Boolean).length;

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheet(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet]);

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="hidden lg:block">
        <FilterSidebar filters={filters} onChange={setFilters} providers={providers} currency={currency} priceCeiling={priceCeiling} isBroadband={isBroadband} onReset={() => setFilters(initial)} />
      </div>

      <section aria-live="polite" className="min-w-0">
        <div className="mb-4 flex items-center gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-[12px] bg-fill-strong px-3 py-2.5 transition-shadow focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_40%,transparent)]">
            <SearchIcon className="size-[18px] shrink-0 text-label-3" />
            <input
              type="search"
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              placeholder="Search plans, providers or perks"
              className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-label-3"
              aria-label="Search plans"
            />
          </label>
          <button onClick={() => setSheet(true)} className="press rounded-full bg-tint px-4 py-2.5 text-[15px] font-semibold text-accent lg:hidden">
            Filters{activeFilters ? ` · ${activeFilters}` : ""}
          </button>
        </div>
        {lead && <div className="mb-10">{lead}</div>}
        <div className="mb-3 flex items-baseline justify-between px-1">
          <h2 className="text-[22px] font-bold tracking-tight md:text-[26px]">All plans</h2>
          <p className="text-[13px] font-medium text-label-3">{visible.length} plan{visible.length === 1 ? "" : "s"}{activeFilters ? " · filtered" : ""}</p>
        </div>

        {visible.length === 0 ? (
          <div className="pop rounded-[22px] bg-surface p-10 text-center text-label-2 shadow-card">
            No plans match your filters. <button className="press font-semibold text-accent" onClick={() => setFilters(initial)}>Reset filters</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {visible.map((p, i) => (
              <PlanCard key={p.id} index={i} plan={p} compare={{ selected: selected.includes(p.id), disabled: selected.length >= MAX_COMPARE, onToggle: () => toggle(p.id) }} />
            ))}
          </div>
        )}
      </section>

      {sheet && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="fade-in absolute inset-0 bg-black/40" onClick={() => setSheet(false)} />
          <div className="sheet absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-[28px] bg-bg px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-fill-strong" />
            <button onClick={() => setSheet(false)} aria-label="Close filters" className="press absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-fill-strong text-label-2"><CloseIcon className="size-4" /></button>
            <FilterSidebar bare filters={filters} onChange={setFilters} providers={providers} currency={currency} priceCeiling={priceCeiling} isBroadband={isBroadband} onReset={() => setFilters(initial)} />
            <button onClick={() => setSheet(false)} className="press mt-2 w-full rounded-full bg-accent-fill py-3.5 text-[17px] font-semibold text-accent-on-fill">Show {visible.length} plans</button>
          </div>
        </div>
      )}

      {selected.length > 0 && (
        <div className="material fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-1/2 z-40 -translate-x-1/2 flex w-[min(40rem,calc(100%-1.5rem))] items-center gap-3 rounded-full px-4 py-2.5 shadow-lift md:bottom-6" style={{ animation: "float-in 0.5s var(--spring) both" }}>
          <p className="min-w-0 flex-1 truncate text-[14px]">
            <strong>{selected.length}</strong> of {MAX_COMPARE} · <span className="text-label-2">{chosen.map((p) => p.title).join(" · ")}</span>
          </p>
          <button onClick={() => setSelected([])} className="press text-[14px] font-medium text-label-2">Clear</button>
          <button disabled={selected.length < 2} onClick={() => setOpen(true)} className="press rounded-full bg-accent-fill px-4 py-2 text-[14px] font-semibold text-accent-on-fill disabled:opacity-40">
            Compare
          </button>
        </div>
      )}
      {open && chosen.length >= 2 && <ComparisonTable plans={chosen} onClose={() => setOpen(false)} />}
    </div>
  );
}
