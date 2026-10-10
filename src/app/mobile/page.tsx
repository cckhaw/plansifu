import type { Metadata } from "next";
import { ComparisonView } from "@/components/ComparisonView";
import { Footer } from "@/components/Footer";
import { PickTabs } from "@/components/PickTabs";
import { COUNTRIES, parseCountry } from "@/lib/currency";
import { buildPicks } from "@/lib/picks";
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
  const plans = await getPlans(country, categories);
  const picks = type === "prepaid" ? buildPicks(plans, "prepaid") : buildPicks(plans.filter((p) => p.category === "mobile_postpaid"), "postpaid");

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 md:pb-16">
        <h1 className="rise mb-1 text-[34px] font-bold leading-[1.1] tracking-[-0.025em] md:text-5xl">
          {type === "prepaid" ? "Prepaid" : type === "postpaid" ? "Postpaid" : "Mobile"} plans
        </h1>
        <p className="rise mb-6 text-[17px] text-label-2" style={{ "--i": 1 } as React.CSSProperties}>
          {COUNTRIES[country].flag} {COUNTRIES[country].label} · use Filters to narrow by price, data and contract, then compare up to 3 side by side.
        </p>
        <ComparisonView lead={picks.length > 0 ? <PickTabs compact title="Best for…" groups={picks} /> : undefined} key={`${country}-${type}`} plans={plans} initialQuery={sp.q ?? ""} />
      </main>
      <Footer />
    </>
  );
}
