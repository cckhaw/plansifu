import type { Metadata } from "next";
import { ComparisonView } from "@/components/ComparisonView";
import { Footer } from "@/components/Footer";
import { PickTabs } from "@/components/PickTabs";
import { COUNTRIES, parseCountry } from "@/lib/currency";
import { buildPicks } from "@/lib/picks";
import { getPlans } from "@/lib/plans";

export const metadata: Metadata = { title: "Compare Home Fibre Broadband" };
export const revalidate = 3600;

export default async function BroadbandPage({ searchParams }: { searchParams: Promise<{ country?: string; q?: string }> }) {
  const sp = await searchParams;
  const country = parseCountry(sp.country);
  const plans = await getPlans(country, ["broadband"]);
  const picks = buildPicks(plans, "broadband");

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 md:pb-16">
        <h1 className="rise mb-1 text-[34px] font-bold leading-[1.1] tracking-[-0.025em] md:text-5xl">Home fibre</h1>
        <p className="rise mb-6 text-[17px] text-label-2" style={{ "--i": 1 } as React.CSSProperties}>
          {COUNTRIES[country].flag} {COUNTRIES[country].label} · compare speeds, prices and freebies from every major provider.
        </p>
        <ComparisonView lead={picks.length > 0 ? <PickTabs compact title="Best for…" groups={picks} /> : undefined} key={country} plans={plans} initialQuery={sp.q ?? ""} />
      </main>
      <Footer />
    </>
  );
}
