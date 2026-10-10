import { cache } from "react";
import type { Country, EsimPlanWithProvider } from "@/types/database";
import { COUNTRIES } from "./currency";
import { convert, FALLBACK_USD_RATES, type FxRates } from "./fx";
import { sampleEsimPlans } from "./sample-esim";
import { getPublicClient } from "./supabase";

export const getEsimPlans = cache(async (destinationKey: string): Promise<EsimPlanWithProvider[]> => {
  const db = getPublicClient();
  if (!db) return sampleEsimPlans.filter((p) => p.destination_key === destinationKey);
  const { data, error } = await db
    .from("esim_plans")
    .select("*, provider:providers!inner(id, name, logo_url, website_url)")
    .eq("is_active", true)
    .eq("destination_key", destinationKey);
  if (error) {
    // Table missing (migration 03 not run) or other failure: show an empty section rather than crash.
    console.error("[getEsimPlans]", error.message);
    return [];
  }
  return (data ?? []) as unknown as EsimPlanWithProvider[];
});

/** Destinations that currently have at least one active plan, with plan counts. */
export const getEsimDestinationCounts = cache(async (): Promise<Record<string, number>> => {
  const db = getPublicClient();
  if (!db) return sampleEsimPlans.reduce<Record<string, number>>((m, p) => ((m[p.destination_key] = (m[p.destination_key] ?? 0) + 1), m), {});
  const { data, error } = await db.from("esim_plans").select("destination_key").eq("is_active", true).limit(20000);
  if (error) return {};
  const counts: Record<string, number> = {};
  for (const r of data ?? []) counts[r.destination_key as string] = (counts[r.destination_key as string] ?? 0) + 1;
  return counts;
});

export const getFxRates = cache(async (): Promise<{ rates: FxRates; updatedAt: string | null }> => {
  const db = getPublicClient();
  if (!db) return { rates: FALLBACK_USD_RATES, updatedAt: null };
  const { data, error } = await db.from("fx_rates").select("currency, per_usd, updated_at");
  if (error || !data?.length) return { rates: FALLBACK_USD_RATES, updatedAt: null };
  const rates: FxRates = { ...FALLBACK_USD_RATES };
  let updatedAt: string | null = null;
  for (const r of data) {
    rates[r.currency as string] = Number(r.per_usd);
    if (!updatedAt || (r.updated_at as string) > updatedAt) updatedAt = r.updated_at as string;
  }
  return { rates, updatedAt };
});

export type EsimSort = "gb" | "price" | "day" | "data";

export interface EsimRowView {
  plan: EsimPlanWithProvider;
  /** Price converted to the selected currency (null if the brand's currency is unknown). */
  price: number | null;
  unlimited: boolean;
  /** Converted price per GB; null for unlimited or unknown data. */
  perGb: number | null;
  /** Converted price per day of validity. */
  perDay: number | null;
}

export function toRowView(plan: EsimPlanWithProvider, country: Country, rates: FxRates): EsimRowView {
  const price = convert(Number(plan.price), plan.currency, COUNTRIES[country].currency, rates);
  const unlimited = plan.data_gb !== null && Number(plan.data_gb) < 0;
  const gb = plan.data_gb === null ? null : Number(plan.data_gb);
  return {
    plan,
    price,
    unlimited,
    perGb: price !== null && gb !== null && gb > 0 ? price / gb : null,
    perDay: price !== null && plan.validity_days ? price / plan.validity_days : null,
  };
}

export interface EsimFilters {
  /** Show every plan size; otherwise only plans suited to a typical trip. */
  all: boolean;
  voice: boolean;
  number: boolean;
  minGb: number;
  brand: string | null;
}

/** A plan a typical traveller would pick: 1-20 GB for up to 45 days, or unlimited for up to 15 days. */
export function isTypicalTrip(r: EsimRowView): boolean {
  const p = r.plan;
  const days = p.validity_days;
  if (r.unlimited) return days !== null && days <= 15;
  const gb = p.data_gb === null ? null : Number(p.data_gb);
  return gb !== null && gb >= 1 && gb <= 20 && (days === null || days <= 45);
}

/** The same offer can be listed twice by a brand (or under two titles); show it once. */
export function dedupeRows(rows: EsimRowView[]): EsimRowView[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    const p = r.plan;
    const key = [p.provider.name, p.data_gb, p.validity_days, Number(p.price), p.currency, p.coverage ?? ""].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function filterAndSort(rows: EsimRowView[], f: EsimFilters, sort: EsimSort): { rows: EsimRowView[]; hidden: number } {
  rows = dedupeRows(rows);
  const matches = (r: EsimRowView) => {
    const p = r.plan;
    if (f.voice && !(p.voice_included || p.sms_included)) return false;
    if (f.number && !p.phone_number) return false;
    if (f.brand && p.provider.name !== f.brand) return false;
    if (f.minGb > 0 && !r.unlimited && !(p.data_gb !== null && Number(p.data_gb) >= f.minGb)) return false;
    return true;
  };
  const matching = rows.filter(matches);
  const typical = matching.filter(isTypicalTrip);
  // Fall back to everything when the typical view would be empty (e.g. a brand that only sells big plans).
  const kept = f.all || typical.length === 0 ? matching : typical;
  const hidden = matching.length - kept.length;
  const inf = Number.POSITIVE_INFINITY;
  const by: Record<EsimSort, (r: EsimRowView) => number> = {
    // Unlimited plans have no per-GB cost: rank them after the metered plans, cheapest first.
    gb: (r) => r.perGb ?? (r.unlimited && r.price !== null ? 1e6 + r.price : inf),
    price: (r) => r.price ?? inf,
    day: (r) => r.perDay ?? inf,
    data: (r) => (r.unlimited ? -1 : -(Number(r.plan.data_gb) || 0)),
  };
  return { rows: kept.sort((a, b) => by[sort](a) - by[sort](b) || (a.price ?? inf) - (b.price ?? inf)), hidden };
}
