import type { Metadata } from "next";
import { ComparisonView } from "@/components/ComparisonView";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { COUNTRIES, parseCountry } from "@/lib/currency";
import { getPlans } from "@/lib/plans";

export const metadata: Metadata = { title: "Compare Home Fibre Broadband" };
export const revalidate = 3600;

export default async function BroadbandPage({ searchParams }: { searchParams: Promise<{ country?: string; q?: string }> }) {
  const sp = await searchParams;
  const country = parseCountry(sp.country);
  const plans = await getPlans(country, ["broadband"]);

  return (
    <>
      <Header country={country} active="broadband" pathname="/broadband" />
      <main className="mx-auto max-w-7xl px-4 py-8 pb-24">
        <h1 className="mb-1 text-2xl font-extrabold md:text-3xl">{COUNTRIES[country].flag} Home fibre broadband in {COUNTRIES[country].label}</h1>
        <p className="mb-6 text-slate-600">Compare speeds, prices and freebies from every major fibre provider.</p>
        <ComparisonView key={country} plans={plans} initialQuery={sp.q ?? ""} />
      </main>
      <Footer />
    </>
  );
}
