"use client";

import { useMemo, useState } from "react";
import { filterAndSort, type EsimRowView } from "@/lib/esim-rank";
import type { Country } from "@/types/database";
import { EsimFilters, type EsimFilterState } from "./EsimFilters";
import { EsimResults } from "./EsimResults";

/**
 * The interactive part of a destination page. The page itself is statically rendered with the default view in the
 * HTML (typical-trip plans, cheapest per GB first); sorting and filtering then happen in the browser.
 */
export function EsimExplorer({ country, dest, rows, counts }: { country: Country; dest: string; rows: EsimRowView[]; counts: Record<string, number> }) {
  const [state, setState] = useState<EsimFilterState>({ sort: "gb", all: false, voice: false, number: false, minGb: 0, brand: "" });
  const brands = useMemo(() => [...new Set(rows.map((r) => r.plan.provider.name))].sort((a, b) => a.localeCompare(b)), [rows]);
  const { rows: shown, hidden } = useMemo(
    () => filterAndSort(rows, { all: state.all, voice: state.voice, number: state.number, minGb: state.minGb, brand: state.brand || null }, state.sort),
    [rows, state],
  );
  const bestGb = [...shown].filter((r) => r.perGb !== null).sort((a, b) => a.perGb! - b.perGb!)[0];
  const cheapest = [...shown].filter((r) => r.price !== null).sort((a, b) => a.price! - b.price!)[0];

  return (
    <section aria-labelledby="esim-plans-heading">
      <h2 id="esim-plans-heading" className="mb-3 px-1 text-[22px] font-bold tracking-tight md:text-[26px]">All plans</h2>
      <EsimFilters country={country} dest={dest} state={state} onChange={(p) => setState((s) => ({ ...s, ...p }))} brands={brands} counts={counts} />
      {shown.length === 0 ? (
        <div className="pop rounded-[22px] bg-surface p-10 text-center text-label-2 shadow-card">
          {rows.length === 0 ? "No eSIM plans for this destination yet. They appear after the next update." : "No plans match these filters. Try clearing some."}
        </div>
      ) : (
        <>
          <p aria-live="polite" className="mb-3 px-1 text-[13px] font-medium text-label-3">
            {shown.length} plan{shown.length === 1 ? "" : "s"} from {new Set(shown.map((r) => r.plan.provider.name)).size} brands
            {hidden > 0 && ` · typical-trip plans (1–20 GB, or unlimited up to 15 days); ${hidden} larger or longer hidden`}
          </p>
          <EsimResults rows={shown} country={country} bestGbId={bestGb?.plan.id ?? null} cheapestId={cheapest?.plan.id ?? null} />
        </>
      )}
    </section>
  );
}
