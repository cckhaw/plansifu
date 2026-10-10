/** Currency conversion for travel eSIM prices. Rates are "units of currency per 1 USD". */
export const FALLBACK_USD_RATES: Record<string, number> = {
  USD: 1, EUR: 0.86, GBP: 0.75, MYR: 4.2, SGD: 1.29, AUD: 1.5, NZD: 1.7, CAD: 1.38, JPY: 150, KRW: 1380,
  CNY: 7.2, HKD: 7.8, THB: 34, IDR: 16000, INR: 85, PHP: 57, CHF: 0.8, SEK: 10, NOK: 10.5, DKK: 6.4, PLN: 3.7,
  CZK: 21, HUF: 345, TRY: 40, AED: 3.67, ZAR: 18, BRL: 5.4, MXN: 19.5, ILS: 3.4, RON: 4.4, BGN: 1.68, ISK: 125,
};

export type FxRates = Record<string, number>;

export function convert(amount: number, from: string, to: string, rates: FxRates): number | null {
  const f = rates[from.toUpperCase()] ?? FALLBACK_USD_RATES[from.toUpperCase()];
  const t = rates[to.toUpperCase()] ?? FALLBACK_USD_RATES[to.toUpperCase()];
  if (!f || !t) return null;
  return (amount / f) * t;
}

/** Free ECB-backed rates (no key). Returns units per 1 USD. */
export async function fetchLiveRates(): Promise<FxRates> {
  const res = await fetch("https://api.frankfurter.dev/v1/latest?base=USD", { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`FX API ${res.status}`);
  const json = (await res.json()) as { rates?: Record<string, number> };
  if (!json.rates || !json.rates.MYR || !json.rates.SGD) throw new Error("FX API returned no MYR/SGD rate");
  return { USD: 1, ...json.rates };
}
