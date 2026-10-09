import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Country, ScrapedPlan } from "../../src/types/database";

let client: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export async function resolveProviderId(name: string, country: Country): Promise<string> {
  const db = getAdminClient();
  const { data, error } = await db
    .from("providers")
    .select("id")
    .eq("name", name)
    .eq("country", country)
    .maybeSingle();
  if (error) throw error;
  if (data) return data.id as string;
  const { data: created, error: insertErr } = await db
    .from("providers")
    .insert({ name, country })
    .select("id")
    .single();
  if (insertErr) throw insertErr;
  return created.id as string;
}

export async function upsertPlans(providerId: string, plans: ScrapedPlan[]): Promise<number> {
  if (!plans.length) return 0;
  const db = getAdminClient();

  // Keep affiliate URLs / promo badges that were curated by hand: scrapers only
  // supply a landing-page fallback and may not see exclusive promos.
  const { data: existing, error: selErr } = await db
    .from("plans")
    .select("title, affiliate_url, promotion_badge")
    .eq("provider_id", providerId);
  if (selErr) throw selErr;
  const prev = new Map((existing ?? []).map((p) => [p.title as string, p]));

  const now = new Date().toISOString();
  const rows = plans.map((p) => {
    const old = prev.get(p.title);
    return {
      ...p,
      provider_id: providerId,
      affiliate_url: old?.affiliate_url ?? p.affiliate_url,
      promotion_badge: p.promotion_badge ?? old?.promotion_badge ?? null,
      is_active: true,
      updated_at: now,
    };
  });

  const { error } = await db.from("plans").upsert(rows, { onConflict: "provider_id,title" });
  if (error) throw error;

  // Plans that vanished from the provider's site are hidden, not deleted.
  const { error: staleErr } = await db
    .from("plans")
    .update({ is_active: false })
    .eq("provider_id", providerId)
    .lt("updated_at", now);
  if (staleErr) throw staleErr;

  return rows.length;
}

export async function logCrawl(
  providerId: string | null,
  status: "success" | "error",
  itemsScraped: number,
  errorMessage?: string,
): Promise<void> {
  const { error } = await getAdminClient().from("crawling_logs").insert({
    provider_id: providerId,
    status,
    items_scraped: itemsScraped,
    error_message: errorMessage ?? null,
  });
  if (error) console.error(`[log] failed to write crawling_logs: ${error.message}`);
}
