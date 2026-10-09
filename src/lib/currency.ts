import type { Country, Currency, Plan } from "@/types/database";

export const COUNTRIES: Record<Country, { flag: string; label: string; currency: Currency; symbol: string }> = {
  MY: { flag: "🇲🇾", label: "Malaysia", currency: "MYR", symbol: "RM" },
  SG: { flag: "🇸🇬", label: "Singapore", currency: "SGD", symbol: "S$" },
};

export function parseCountry(v: string | string[] | undefined): Country {
  return v === "SG" ? "SG" : "MY";
}

export function formatPrice(amount: number, currency: Currency): string {
  const symbol = currency === "MYR" ? "RM" : "S$";
  const value = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return `${symbol}${value}`;
}

export function formatData(gb: number | null): string {
  if (gb === null) return "—";
  if (gb < 0) return "Unlimited";
  return `${gb}GB`;
}

export function formatSpeed(mbps: number | null): string {
  if (mbps === null) return "—";
  return mbps >= 1000 ? `${mbps / 1000}Gbps` : `${mbps}Mbps`;
}

export function formatTalktime(p: Pick<Plan, "talktime_mins" | "sms_count">): string {
  const call = p.talktime_mins === null ? null : p.talktime_mins < 0 ? "Unlimited calls" : `${p.talktime_mins} mins`;
  const sms = p.sms_count === null ? null : p.sms_count < 0 ? "Unlimited SMS" : `${p.sms_count} SMS`;
  return [call, sms].filter(Boolean).join(" · ") || "—";
}

export function formatContract(months: number): string {
  return months === 0 ? "No contract" : `${months} months`;
}
