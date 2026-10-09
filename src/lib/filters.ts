import type { PlanWithProvider } from "@/types/database";

export interface Filters {
  query: string;
  maxPrice: number;
  minData: number;
  minSpeed: number;
  /** null = any */
  contract: number | null;
  providers: string[];
  sort: "price_asc" | "price_desc" | "data_desc" | "speed_desc";
}

export function applyFilters(plans: PlanWithProvider[], f: Filters): PlanWithProvider[] {
  const q = f.query.trim().toLowerCase();
  const out = plans.filter((p) => {
    if (q && !`${p.title} ${p.provider.name} ${p.features.join(" ")}`.toLowerCase().includes(q)) return false;
    if (p.monthly_price > f.maxPrice) return false;
    if (f.minData > 0 && (p.data_gb === null || (p.data_gb >= 0 && p.data_gb < f.minData))) return false;
    if (f.minSpeed > 0 && (p.speed_mbps === null || p.speed_mbps < f.minSpeed)) return false;
    if (f.contract !== null && p.contract_months !== f.contract) return false;
    if (f.providers.length && !f.providers.includes(p.provider.id)) return false;
    return true;
  });
  const dataKey = (p: PlanWithProvider) => (p.data_gb === null ? -2 : p.data_gb < 0 ? Infinity : p.data_gb);
  const sorters: Record<Filters["sort"], (a: PlanWithProvider, b: PlanWithProvider) => number> = {
    price_asc: (a, b) => a.monthly_price - b.monthly_price,
    price_desc: (a, b) => b.monthly_price - a.monthly_price,
    data_desc: (a, b) => dataKey(b) - dataKey(a),
    speed_desc: (a, b) => (b.speed_mbps ?? 0) - (a.speed_mbps ?? 0),
  };
  return out.sort(sorters[f.sort]);
}
