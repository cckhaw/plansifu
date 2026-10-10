import type { EsimPlanWithProvider } from "@/types/database";

const brand = (id: string, name: string) => ({ id, name, logo_url: null, website_url: null });
const base = { coverage: null, data_note: null, voice_sms_note: null, sms_included: null, is_active: true, updated_at: "2026-01-01T00:00:00Z" };

/** Shown when Supabase isn't configured, so the page works locally out of the box. */
export const sampleEsimPlans: EsimPlanWithProvider[] = [
  { ...base, id: "esim-sample-1", provider_id: "g1", provider: brand("g1", "Airalo"), destination_key: "japan", title: "5GB / 30 days", data_gb: 5, validity_days: 30, price: 11.5, currency: "USD", voice_included: false, phone_number: false, perks: ["Hotspot allowed", "Top-up anytime"], affiliate_url: "https://www.airalo.com/japan-esim" },
  { ...base, id: "esim-sample-2", provider_id: "g2", provider: brand("g2", "Holafly"), destination_key: "japan", title: "Unlimited / 7 days", data_gb: -1, validity_days: 7, price: 27, currency: "USD", voice_included: false, phone_number: false, perks: ["Unlimited data", "Hotspot allowed"], affiliate_url: "https://esim.holafly.com/esim-japan/" },
  { ...base, id: "esim-sample-3", provider_id: "g3", provider: brand("g3", "Saily"), destination_key: "japan", title: "10GB / 30 days", data_gb: 10, validity_days: 30, price: 19, currency: "USD", voice_included: false, phone_number: false, perks: ["5G where available"], affiliate_url: "https://saily.com/esim-japan/" },
  { ...base, id: "esim-sample-4", provider_id: "g4", provider: brand("g4", "BNESIM"), destination_key: "japan", title: "3GB / 15 days + number", data_gb: 3, validity_days: 15, price: 14, currency: "USD", voice_included: true, sms_included: true, voice_sms_note: "Calls and SMS at pay-as-you-go rates", phone_number: true, perks: ["Phone number included"], affiliate_url: "https://www.bnesim.com/plans/jp/" },
];
