import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { buildMetadata } from "@/lib/seo-helpers";

export function generateMetadata(): Metadata {
  return buildMetadata({
    country: "MY",
    kind: "mobile",
    path: "/about",
    title: "About PlanSifu 师傅: How We Compare Telco Plans",
    description: "PlanSifu compares postpaid, prepaid, home fibre broadband and travel eSIM plans in Malaysia and Singapore. How we collect prices, rank plans and earn money.",
    keywords: ["about plansifu", "how plansifu works"],
    heading: "About PlanSifu",
  });
}

export default function AboutPage() {
  return (
    <>
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-6 md:pb-16">
        <Breadcrumbs crumbs={[{ name: "PlanSifu", path: "/" }, { name: "About", path: "/about" }]} />
        <h1 className="mb-4 text-[34px] font-bold leading-[1.1] tracking-[-0.025em] md:text-5xl">About PlanSifu 师傅</h1>
        <div className="space-y-6 text-[17px] leading-relaxed text-label-2">
          <p>PlanSifu (师傅, “master” or “expert”) helps people in Malaysia and Singapore choose a mobile plan, home fibre broadband or a travel eSIM without reading a dozen provider websites.</p>

          <section aria-labelledby="data">
            <h2 id="data" className="mb-2 text-[22px] font-bold tracking-tight text-label">Where the prices come from</h2>
            <p>Every night our system reads each provider&apos;s public plan pages and records the price, data, speed, contract and perks it finds. A run that looks wrong (a page that failed, or prices that jumped unexpectedly) is flagged for review, and a failed page never wipes out the plans we already have. Provider prices can change at any time, so always confirm on the provider&apos;s own site before you apply.</p>
          </section>

          <section aria-labelledby="rank">
            <h2 id="rank" className="mb-2 text-[22px] font-bold tracking-tight text-label">How we rank &ldquo;best&rdquo;</h2>
            <p>The “best for” lists are generated automatically from the numbers: price per GB, price per 100Mbps, the cheapest plan with a useful amount of data, unlimited data, contract length and perks. Plans limited to an age group are left out of the headline picks. Nobody can pay to move up a list.</p>
          </section>

          <section aria-labelledby="money">
            <h2 id="money" className="mb-2 text-[22px] font-bold tracking-tight text-label">How we make money</h2>
            <p>When you apply through a “Get Deal” link we may earn a commission from the provider, at no extra cost to you. That does not change the ranking or the prices we show.</p>
          </section>

          <section aria-labelledby="esim">
            <h2 id="esim" className="mb-2 text-[22px] font-bold tracking-tight text-label">Travel eSIM</h2>
            <p>Travel eSIM prices are collected weekly from each brand and converted into Malaysian ringgit or Singapore dollars at indicative daily exchange rates. You pay in the brand&apos;s own checkout currency, so the final amount can differ slightly.</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
