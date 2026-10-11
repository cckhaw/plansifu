import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { ChevronIcon } from "@/components/Icons";
import { FaqSection } from "@/components/seo/FaqSection";
import { COUNTRIES, formatPrice } from "@/lib/currency";
import { faqsFor } from "@/lib/faqs";
import { getPlans } from "@/lib/plans";
import { homePath } from "@/lib/routes";
import { buildMetadata, planStats } from "@/lib/seo-helpers";
import type { Country } from "@/types/database";

export const revalidate = 3600;

export function generateMetadata(): Metadata {
  return {
    ...buildMetadata({
      country: "MY",
      kind: "mobile",
      path: "/",
      title: `Compare Telco & Broadband Plans in Malaysia & Singapore (${new Date().getFullYear()}) | PlanSifu 师傅`,
      description: "Compare postpaid, prepaid, home fibre broadband and travel eSIM plans in Malaysia and Singapore. Prices from every major telco, updated every night.",
      keywords: ["compare telco plans malaysia singapore", "best postpaid plan", "best fibre broadband", "travel esim comparison"],
      heading: "Compare Telco & Broadband Plans in Malaysia & Singapore",
    }),
  };
}

/** Site hub: pick a country. Each country has its own prices, so each gets its own pages. */
export default async function HubPage() {
  const countries = await Promise.all(
    (["MY", "SG"] as Country[]).map(async (c) => {
      const plans = await getPlans(c, ["mobile_postpaid", "mobile_prepaid", "broadband"]);
      return { c, stats: planStats(plans, c) };
    }),
  );
  return (
    <>
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-12 md:pb-16 md:pt-20">
        <header className="text-center">
          <h1 className="rise text-[38px] font-bold leading-[1.05] tracking-[-0.03em] md:text-[60px]">
            Compare telco plans in <span className="text-accent">Malaysia</span> &amp; <span className="text-accent">Singapore</span>
          </h1>
          <p className="rise mx-auto mt-4 max-w-2xl text-[17px] leading-snug text-label-2 md:text-xl" style={{ "--i": 1 } as React.CSSProperties}>
            Postpaid, prepaid, home fibre broadband and travel eSIMs side by side, with prices collected from every major provider each night.
          </p>
        </header>

        <section aria-labelledby="pick-country" className="mt-10">
          <h2 id="pick-country" className="sr-only">Choose your country</h2>
          <ul className="grid gap-4 md:grid-cols-2">
            {countries.map(({ c, stats }, i) => (
              <li key={c} className="rise" style={{ "--i": i + 2 } as React.CSSProperties}>
                <Link href={homePath(c)} className="press lift flex h-full flex-col gap-4 rounded-[28px] bg-surface p-7 shadow-card">
                  <span className="text-[56px] leading-none" aria-hidden>{COUNTRIES[c].flag}</span>
                  <span>
                    <span className="block text-[28px] font-bold tracking-tight">{COUNTRIES[c].label}</span>
                    <span className="mt-1 block text-[15px] text-label-2">
                      {stats.count ? `${stats.count} plans from ${stats.providers.length} providers` : "Plans coming soon"}
                      {stats.low !== null && ` · from ${formatPrice(stats.low, stats.currency)} a month`} · prices in {COUNTRIES[c].currency}
                    </span>
                  </span>
                  <span className="mt-auto inline-flex items-center gap-1 text-[16px] font-semibold text-accent">Compare plans <ChevronIcon className="size-4" /></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="how" className="mt-14">
          <h2 id="how" className="mb-4 px-1 text-[22px] font-bold tracking-tight md:text-[26px]">How PlanSifu works</h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {[
              ["Collected nightly", "We read each provider's public plan pages every night and flag anything that looks wrong before it reaches you."],
              ["Ranked by the numbers", "Best-for lists are built automatically from price, data, speed and contract terms, not from who pays us."],
              ["Compare and apply", "Filter, compare up to three plans side by side, then go straight to the provider to apply."],
            ].map(([t, d]) => (
              <li key={t} className="rounded-[22px] bg-surface p-5 shadow-card">
                <h3 className="text-[17px] font-semibold tracking-tight">{t}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-label-2">{d}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 px-1 text-[15px]"><Link href="/about" className="font-medium text-accent hover:underline">More about PlanSifu →</Link></p>
        </section>

        <FaqSection faqs={faqsFor("MY", "mobile").slice(0, 4)} />
      </main>
      <Footer />
    </>
  );
}
