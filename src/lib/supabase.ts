import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Public (anon) client for reading the catalogue. Returns null when env vars are missing. */
export function getPublicClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
