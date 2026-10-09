import type { Metadata } from "next";
import { ComparisonView } from "@/components/ComparisonView";
import { Footer } from "@/components/Footer";
import { Header, type NavKey } from "@/components/Header";
import { COUNTRIES, parseCountry } from "@/lib/currency";
import { getPlans } from "@/lib/plans";
import type { PlanCategory } from "@/types/database";

export const metadata: Metadata = { title: "Compare Mobile Plans" };
export const revalidate = 3600;

type Params = { country?: string; type?: string; q?: string };

export default async function MobilePage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const country = parseCountry(sp.country);
  const type = sp.type === "prepaid" || sp.type === "postpaid" ? sp.type : null;
  const categories: PlanCategory[] = type ? [`mobile_${type}`] : ["mobile_postpaid", "mobile_prepaid"];
  const active: NavKey = type ?? "postpaid";
  const plans = await getPlans(country, categories);
  const pathname = type ? `/mobile?type=${type}` : "/mobile";

  return (
    <>
      <Header country={country} active={active} pathname={pathname} />
      <main className="mx-auto max-w-7xl px-4 py-8 pb-24">
        <h1 className="mb-1 text-2xl font-extrabold md:text-3xl">
          {COUNTRIES[country].flag} {type === "prepaid" ? "Prepaid" : type === "postpaid" ? "Postpaid" : "Mobile"} plans in {COUNTRIES[country].label}
        </h1>
        <p className="mb-6 text-slate-600">Filter by price, data and contract, then compare up to 3 plans side by side.</p>
        <ComparisonView key={`${country}-${type}`} plans={plans} initialQuery={sp.q ?? ""} />
      </main>
      <Footer />
    </>
  );
}
