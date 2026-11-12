import type { EsimDestination } from "../../src/lib/esim-destinations";
import type { PageData } from "../scrapers/types";

/** One travel eSIM plan as a parser reports it, before cleaning (see run-esim.ts `clean`). */
export interface RawEsimPlan {
  /** Short plan name that includes the data and validity, e.g. "5GB / 30 days" or "Unlimited / 7 days". */
  title: string;
  /** What a multi-country plan covers ("39 European countries"); null for a single country. */
  coverage: string | null;
  /** Total data in GB for the whole validity (1TB = 1000GB); -1 = unlimited; null = not stated. */
  data_gb: number | null;
  /** e.g. "1GB per day, then throttled"; null if nothing special. */
  data_note: string | null;
  validity_days: number | null;
  /** The price actually charged, number only. */
  price: number;
  /** ISO 4217 code of the displayed price (USD, EUR, MYR...). */
  currency: string;
  voice_included: boolean | null;
  sms_included: boolean | null;
  voice_sms_note: string | null;
  /** True if the plan comes with a phone number that can receive calls/SMS. */
  phone_number: boolean | null;
  /** Up to 6 short extras, e.g. "Hotspot allowed", "5G". */
  perks: string[];
}

/** Turns one brand page for one destination into plans. Deterministic; no network, no model. */
export type EsimParser = (page: PageData, destination: EsimDestination) => RawEsimPlan[];

/** Placeholder for a brand nobody has written a parser for yet: its pages fail with a clear message. */
export const todoEsim =
  (brand: string): EsimParser =>
  () => {
    throw new Error(`no parser written yet for ${brand}`);
  };

/** A complete plan with sensible defaults; parsers pass only what the page states. */
export function esimPlan(p: Partial<RawEsimPlan> & Pick<RawEsimPlan, "title" | "price" | "currency">): RawEsimPlan {
  return {
    coverage: null,
    data_gb: null,
    data_note: null,
    validity_days: null,
    voice_included: null,
    sms_included: null,
    voice_sms_note: null,
    phone_number: null,
    perks: [],
    ...p,
  };
}
