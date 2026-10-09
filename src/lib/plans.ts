import { cache } from "react";
import type { Country, PlanCategory, PlanWithProvider } from "@/types/database";
import { samplePlans } from "./sample-plans";
import { getPublicClient } from "./supabase";

export const getPlans = cache(async (country: Country, categories: PlanCategory[]): Promise<PlanWithProvider[]> => {
  const db = getPublicClient();
  if (!db) return samplePlans.filter((p) => p.provider.country === country && categories.includes(p.category));

  const { data, error } = await db
    .from("plans")
    .select("*, provider:providers!inner(*)")
    .eq("is_active", true)
    .eq("provider.country", country)
    .in("category", categories)
    .order("monthly_price", { ascending: true });

  if (error) {
    console.error("[getPlans]", error.message);
    return [];
  }
  return (data ?? []) as unknown as PlanWithProvider[];
});
