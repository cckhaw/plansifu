import type { Metadata } from "next";
import { EsimFilters } from "@/components/EsimFilters";
import { EsimResults } from "@/components/EsimResults";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { COUNTRIES, parseCountry } from "@/lib/currency";
import { filterAndSort, getEsimDestinationCounts, getEsimPlans, getFxRates, toRowView, type EsimSort } from "@/lib/esim";
import { destinationByKey, ESIM_DESTINATIONS } from "@/lib/esim-destinations";

export const metadata: Metadata = { title: "Compare Travel eSIMs", description: "Compare travel eSIM brands by destination: price, cost per GB, voice/SMS, phone number and perks, in MYR or SGD." };
export const revalidate = 3600;

type Params = { country?: string; dest?: string; sort?: string; voice?: string; number?: string; min?: string; brand?: string };
const SORTS: EsimSort[] = ["gb", "price", "day", "data"];

export default async function TravelEsimPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const country = parseCountry(sp.country);
  const destination = destinationByKey(sp.dest) ?? ESIM_DESTINATIONS[0];
  const sort = SORTS.includes(sp.sort as EsimSort) ? (sp.sort as EsimSort) : "gb";
  const filters = { voice: sp.voice === "1", number: sp.number === "1", minGb: Number(sp.min) || 0, brand: sp.brand || null };

  const [plans, { rates, updatedAt }, counts] = await Promise.all([getEsimPlans(destination.key), getFxRates(), getEsimDestinationCounts()]);
  const all = plans.map((p) => toRowView(p, country, rates));
  const rows = filterAndSort(all, filters, sort);
  const brands = [...new Set(plans.map((p) => p.provider.name))].sort((a, b) => a.localeCompare(b));
  const bestGb = [...rows].filter((r) => r.perGb !== null).sort((a, b) => a.perGb! - b.perGb!)[0];
  const cheapest = [...rows].filter((r) => r.price !== null).sort((a, b) => a.price! - b.price!)[0];
  const query = new URLSearchParams({ dest: destination.key, sort });
  if (filters.voice) query.set("voice", "1");
  if (filters.number) query.set("number", "1");
  if (filters.minGb) query.set("min", String(filters.minGb));
  if (filters.brand) query.set("brand", filters.brand);

  return (
    <>
      <Header country={country} active="esim" pathname={`/travel-esim?${query}`} />
      <main className="mx-auto max-w-7xl px-4 py-8 pb-24">
        <h1 className="mb-1 text-2xl font-extrabold md:text-3xl">✈️ Travel eSIM for {destination.flag} {destination.name}</h1>
        <p className="mb-6 text-slate-600">
          Compare eSIM brands by destination or multi-country pass. Prices are shown in {COUNTRIES[country].currency}, converted from each brand&apos;s own currency.
        </p>

        <EsimFilters country={country} dest={destination.key} sort={sort} voice={filters.voice} number={filters.number} minGb={filters.minGb} brand={filters.brand ?? ""} brands={brands} counts={counts} />

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
            {plans.length === 0
              ? "No eSIM plans for this destination yet - they appear after the next crawl."
              : "No plans match these filters. Try clearing some."}
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-slate-500">{rows.length} plan{rows.length === 1 ? "" : "s"} from {new Set(rows.map((r) => r.plan.provider.name)).size} brands</p>
            <EsimResults rows={rows} country={country} bestGbId={bestGb?.plan.id ?? null} cheapestId={cheapest?.plan.id ?? null} />
          </>
        )}

        <p className="mt-6 text-xs text-slate-500">
          Currency conversion uses indicative daily rates{updatedAt ? ` (updated ${new Date(updatedAt).toISOString().slice(0, 10)})` : ""}; you pay in the brand&apos;s checkout currency, so the final amount can differ slightly.
          Cost per GB = price ÷ total data; unlimited plans are compared on price and cost per day. Plan details are collected automatically from each brand&apos;s site - confirm before you buy.
        </p>
      </main>
      <Footer />
    </>
  );
}
