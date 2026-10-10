
import { fetchLiveRates } from "../../src/lib/fx";
import { errorMessage, getAdminClient } from "../scrapers/db-upsert";
import type { RawEsimPlan } from "../scrapers/llm-extract";

export interface EsimRow extends Omit<RawEsimPlan, "perks"> {
  destination_key: string;
  perks: string[];
  affiliate_url: string;
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
