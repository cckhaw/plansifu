import { cache } from "react";
import type { EsimPlanWithProvider } from "@/types/database";
import { FALLBACK_USD_RATES, type FxRates } from "./fx";
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

// The pure ranking helpers live in esim-rank.ts so client components can use them without the data layer.
export * from "./esim-rank";
