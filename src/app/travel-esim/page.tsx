import type { Metadata } from "next";
import { EsimFilters } from "@/components/EsimFilters";
import { EsimResults } from "@/components/EsimResults";
import { Footer } from "@/components/Footer";
import { COUNTRIES, parseCountry } from "@/lib/currency";
import { filterAndSort, getEsimDestinationCounts, getEsimPlans, getFxRates, toRowView, type EsimSort } from "@/lib/esim";
import { destinationByKey, ESIM_DESTINATIONS } from "@/lib/esim-destinations";

export const metadata: Metadata = { title: "Compare Travel eSIMs", description: "Compare travel eSIM brands by destination: price, cost per GB, voice/SMS, phone number and perks, in MYR or SGD." };
export const revalidate = 3600;

type Params = { all?: string; country?: string; dest?: string; sort?: string; voice?: string; number?: string; min?: string; brand?: string };
const SORTS: EsimSort[] = ["gb", "price", "day", "data"];

export default async function TravelEsimPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const country = parseCountry(sp.country);
  const destination = destinationByKey(sp.dest) ?? ESIM_DESTINATIONS[0];
  const sort = SORTS.includes(sp.sort as EsimSort) ? (sp.sort as EsimSort) : "gb";
  const filters = { all: sp.all === "1", voice: sp.voice === "1", number: sp.number === "1", minGb: Number(sp.min) || 0, brand: sp.brand || null };

  const [plans, { rates, updatedAt }, counts] = await Promise.all([getEsimPlans(destination.key), getFxRates(), getEsimDestinationCounts()]);
  const all = plans.map((p) => toRowView(p, country, rates));
  const { rows, hidden } = filterAndSort(all, filters, sort);
  const brands = [...new Set(plans.map((p) => p.provider.name))].sort((a, b) => a.localeCompare(b));
  const bestGb = [...rows].filter((r) => r.perGb !== null).sort((a, b) => a.perGb! - b.perGb!)[0];
  const cheapest = [...rows].filter((r) => r.price !== null).sort((a, b) => a.price! - b.price!)[0];

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 md:pb-16">
        <h1 className="rise mb-1 text-[34px] font-bold leading-[1.1] tracking-[-0.025em] md:text-5xl">Travel eSIM</h1>
        <p className="rise mb-6 max-w-2xl text-[17px] text-label-2" style={{ "--i": 1 } as React.CSSProperties}>
          {destination.flag} {destination.name} · compare brands by price, cost per GB, voice and perks, shown in {COUNTRIES[country].currency}.
        </p>

        <EsimFilters country={country} dest={destination.key} sort={sort} all={filters.all} voice={filters.voice} number={filters.number} minGb={filters.minGb} brand={filters.brand ?? ""} brands={brands} counts={counts} />

        {rows.length === 0 ? (
          <div className="pop rounded-[22px] bg-surface p-10 text-center text-label-2 shadow-card">
            {plans.length === 0
              ? "No eSIM plans for this destination yet - they appear after the next crawl."
              : "No plans match these filters. Try clearing some."}
          </div>
        ) : (
          <>
            <p className="mb-3 px-1 text-[13px] font-medium text-label-3">
              {rows.length} plan{rows.length === 1 ? "" : "s"} from {new Set(rows.map((r) => r.plan.provider.name)).size} brands
              {hidden > 0 && ` · typical-trip plans (1–20 GB, or unlimited up to 15 days); ${hidden} larger or longer hidden`}
            </p>
            <EsimResults rows={rows} country={country} bestGbId={bestGb?.plan.id ?? null} cheapestId={cheapest?.plan.id ?? null} />
          </>
        )}

        <p className="mt-6 px-1 text-xs leading-relaxed text-label-3">
          Currency conversion uses indicative daily rates{updatedAt ? ` (updated ${new Date(updatedAt).toISOString().slice(0, 10)})` : ""}; you pay in the brand&apos;s checkout currency, so the final amount can differ slightly.
          Cost per GB = price ÷ total data; unlimited plans are compared on price and cost per day. Plan details are collected automatically from each brand&apos;s site - confirm before you buy.
        </p>
      </main>
      <Footer />
    </>
  );
}
