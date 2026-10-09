import type { Country, PlanCategory, PlanWithProvider, Provider } from "@/types/database";

/** Offline fallback so the UI works before Supabase is configured. */
const P = (id: string, name: string, country: Country, featured = false): Provider => ({
  id, name, country, logo_url: null, website_url: null, is_featured: featured,
});

const providers = {
  maxis: P("sample-p-maxis", "Maxis", "MY", true),
  celcomdigi: P("sample-p-celcomdigi", "CelcomDigi", "MY", true),
  unifi: P("sample-p-unifi", "Unifi", "MY", true),
  umobile: P("sample-p-umobile", "U Mobile", "MY"),
  singtel: P("sample-p-singtel", "Singtel", "SG", true),
  m1: P("sample-p-m1", "M1", "SG", true),
  starhub: P("sample-p-starhub", "StarHub", "SG"),
};

interface S {
  p: keyof typeof providers;
  title: string;
  cat: PlanCategory;
  price: number;
  data?: number;
  speed?: number;
  talk?: number;
  sms?: number;
  contract?: number;
  features?: string[];
  promo?: string;
}

const rows: S[] = [
  { p: "maxis", title: "Postpaid 5G 98", cat: "mobile_postpaid", price: 98, data: 100, talk: -1, sms: -1, contract: 24, features: ["5G", "Roaming SG/TH", "Disney+ Hotstar"], promo: "Sifu Pick: RM100 Touch 'n Go eWallet Voucher" },
  { p: "maxis", title: "Postpaid 5G 68", cat: "mobile_postpaid", price: 68, data: 60, talk: -1, sms: -1, contract: 24, features: ["5G", "Shareable data"] },
  { p: "celcomdigi", title: "Postpaid 5G 80", cat: "mobile_postpaid", price: 80, data: -1, talk: -1, sms: -1, contract: 0, features: ["5G", "Unlimited data", "Free eSIM"], promo: "First 3 Months 50% Off" },
  { p: "celcomdigi", title: "Postpaid 5G 50", cat: "mobile_postpaid", price: 50, data: 50, talk: -1, sms: -1, contract: 12, features: ["5G"] },
  { p: "umobile", title: "Postpaid Infinite 69", cat: "mobile_postpaid", price: 69, data: -1, talk: -1, sms: -1, contract: 0, features: ["Unlimited data", "5G"] },
  { p: "celcomdigi", title: "Prepaid 5G 30", cat: "mobile_prepaid", price: 30, data: 50, talk: 100, sms: 0, features: ["30-day validity", "5G"] },
  { p: "umobile", title: "Prepaid Unlimited 40", cat: "mobile_prepaid", price: 40, data: -1, talk: 200, features: ["Unlimited data", "Speed capped after 30GB"] },
  { p: "unifi", title: "Unifi Fibre 300Mbps", cat: "broadband", price: 99, speed: 300, contract: 24, features: ["Free Router", "Unifi TV Lite"] },
  { p: "unifi", title: "Unifi Fibre 1Gbps", cat: "broadband", price: 149, speed: 1000, contract: 24, features: ["Free Mesh Wi-Fi", "Wi-Fi 6"], promo: "Sifu Pick: Free Router + RM50 Cashback" },
  { p: "maxis", title: "Maxis Home Fibre 500Mbps", cat: "broadband", price: 119, speed: 500, contract: 24, features: ["Free Mesh Wi-Fi"] },
  { p: "celcomdigi", title: "CelcomDigi Fibre 1Gbps", cat: "broadband", price: 129, speed: 1000, contract: 24, features: ["Wi-Fi 6 Router"] },
  { p: "singtel", title: "5G Postpaid 89", cat: "mobile_postpaid", price: 89, data: 150, talk: -1, sms: -1, contract: 24, features: ["5G", "Roaming 5G MY", "Disney+"], promo: "Sifu Pick: S$100 Grab Voucher" },
  { p: "m1", title: "Postpaid 5G Lite", cat: "mobile_postpaid", price: 35, data: 30, talk: 300, sms: 300, contract: 0, features: ["5G", "SIM-only"] },
  { p: "starhub", title: "Mobile 5G Super 60", cat: "mobile_postpaid", price: 60, data: 100, talk: -1, sms: -1, contract: 0, features: ["5G", "Data rollover"], promo: "First 3 Months 50% Off" },
  { p: "singtel", title: "Prepaid hi!Card 5G", cat: "mobile_prepaid", price: 18, data: 30, talk: 100, sms: 100, features: ["28-day validity"] },
  { p: "singtel", title: "1Gbps Ultra Fibre", cat: "broadband", price: 39.9, speed: 1000, contract: 24, features: ["Free Mesh Wi-Fi", "Wi-Fi 6"], promo: "Sifu Pick: Free Router + S$50 Cashback" },
  { p: "m1", title: "M1 Fibre 2Gbps", cat: "broadband", price: 44.9, speed: 2000, contract: 24, features: ["Free Router", "Wi-Fi 6E"] },
  { p: "starhub", title: "StarHub Fibre 1Gbps", cat: "broadband", price: 36.9, speed: 1000, contract: 24, features: ["Free Router"] },
];

export const samplePlans: PlanWithProvider[] = rows.map((r, i) => {
  const provider = providers[r.p];
  return {
    id: `sample-${i + 1}`,
    provider_id: provider.id,
    title: r.title,
    category: r.cat,
    monthly_price: r.price,
    currency: provider.country === "MY" ? "MYR" : "SGD",
    data_gb: r.data ?? null,
    speed_mbps: r.speed ?? null,
    talktime_mins: r.talk ?? null,
    sms_count: r.sms ?? null,
    contract_months: r.contract ?? 0,
    features: r.features ?? [],
    affiliate_url: provider.website_url ?? `https://example.com/${provider.name.toLowerCase().replace(/\s/g, "")}`,
    promotion_badge: r.promo ?? null,
    is_active: true,
    updated_at: new Date(0).toISOString(),
    provider,
  };
});
