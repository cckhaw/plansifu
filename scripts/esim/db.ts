
import { fetchLiveRates } from "../../src/lib/fx";
import { errorMessage, getAdminClient } from "../scrapers/db-upsert";
import type { RawEsimPlan } from "./types";

export interface EsimRow extends Omit<RawEsimPlan, "perks"> {
  destination_key: string;
  perks: string[];
  affiliate_url: string;
}

/**
 * Remove Travel eSIM providers (country "GL") that are no longer in the brand list, e.g. a brand that was dropped because it
 * could never be crawled. Their plans go with them (foreign keys cascade), and they stop showing up in the crawl report.
 * Returns the names removed.
 */
export async function removeRetiredEsimProviders(currentBrandNames: string[]): Promise<string[]> {
  if (currentBrandNames.length === 0) return [];
  const db = getAdminClient();
  const keep = new Set(currentBrandNames.map((n) => n.toLowerCase()));
  const { data, error } = await db.from("providers").select("id, name").eq("country", "GL");
  if (error) throw error;
  const retired = (data ?? []).filter((p) => !keep.has(String(p.name).toLowerCase()));
  if (!retired.length) return [];
  const { error: delErr } = await db.from("providers").delete().in("id", retired.map((p) => p.id as string));
  if (delErr) throw delErr;
  return retired.map((p) => String(p.name));
}

export interface EsimUpsertStats {
  count: number;
  previousCount: number;
  added: string[];
  removed: string[];
  changed: { title: string; from: number; to: number }[];
}

/**
 * Upsert one brand's plans. Only destinations that were fetched successfully (`fetchedKeys`) may have
 * plans hidden: a destination whose page failed keeps its old plans.
 */
export async function upsertEsimPlans(providerId: string, rows: EsimRow[], fetchedKeys: string[]): Promise<EsimUpsertStats> {
  const db = getAdminClient();
  const { data: existing, error } = await db
    .from("esim_plans")
    .select("destination_key, title, price, is_active, affiliate_url")
    .eq("provider_id", providerId);
  if (error) throw error;
  const id = (k: string, t: string) => `${k}::${t.toLowerCase()}`;
  const prev = new Map((existing ?? []).map((p) => [id(p.destination_key as string, p.title as string), p]));
  const previousActive = (existing ?? []).filter((p) => p.is_active);
  const now = new Date().toISOString();

  const unique = [...new Map(rows.map((r) => [id(r.destination_key, r.title), r])).values()];
  const keep = new Set(unique.map((r) => id(r.destination_key, r.title)));
  const stats: EsimUpsertStats = {
    count: unique.length,
    previousCount: previousActive.length,
    added: unique.filter((r) => !prev.get(id(r.destination_key, r.title))?.is_active).map((r) => `${r.destination_key}: ${r.title}`),
    removed: previousActive
      .filter((p) => fetchedKeys.includes(p.destination_key as string) && !keep.has(id(p.destination_key as string, p.title as string)))
      .map((p) => `${p.destination_key}: ${p.title}`),
    changed: unique
      .filter((r) => {
        const o = prev.get(id(r.destination_key, r.title));
        return o?.is_active && Math.abs(Number(o.price) - r.price) >= 0.01;
      })
      .map((r) => ({ title: `${r.destination_key}: ${r.title}`, from: Number(prev.get(id(r.destination_key, r.title))!.price), to: r.price })),
  };

  if (unique.length) {
    const payload = unique.map((r) => ({
      ...r,
      provider_id: providerId,
      affiliate_url: prev.get(id(r.destination_key, r.title))?.affiliate_url ?? r.affiliate_url,
      currency: r.currency.toUpperCase(),
      is_active: true,
      updated_at: now,
    }));
    const { error: upErr } = await db.from("esim_plans").upsert(payload, { onConflict: "provider_id,destination_key,title" });
    if (upErr) throw upErr;
  }
  if (fetchedKeys.length) {
    const { error: staleErr } = await db
      .from("esim_plans")
      .update({ is_active: false })
      .eq("provider_id", providerId)
      .in("destination_key", fetchedKeys)
      .lt("updated_at", now);
    if (staleErr) throw staleErr;
  }
  return stats;
}

/** Refresh the FX table; failure is non-fatal (the site falls back to built-in rates). */
export async function refreshFxRates(): Promise<string> {
  try {
    const rates = await fetchLiveRates();
    const now = new Date().toISOString();
    const { error } = await getAdminClient()
      .from("fx_rates")
      .upsert(Object.entries(rates).map(([currency, per_usd]) => ({ currency, per_usd, updated_at: now })), { onConflict: "currency" });
    if (error) throw error;
    return `FX rates updated (${Object.keys(rates).length} currencies, 1 USD = ${rates.MYR} MYR / ${rates.SGD} SGD)`;
  } catch (err) {
    return `FX rates not updated: ${errorMessage(err)}`;
  }
}
