import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { ChevronIcon } from "@/components/Icons";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { FaqSection } from "@/components/seo/FaqSection";
import { COUNTRIES, formatPrice } from "@/lib/currency";
import { getEsimPlans, getFxRates, toRowView } from "@/lib/esim";
import { ESIM_DESTINATIONS } from "@/lib/esim-destinations";
import { shortName, summarize } from "@/lib/esim-seo";
import { faqsFor } from "@/lib/faqs";
import { MIN_PLANS_FOR_PAGE } from "@/lib/programmatic";
import { countryOfSlug, homePath, kindPath } from "@/lib/routes";
import { buildKeywords, buildMetadata, buildTitle } from "@/lib/seo-helpers";

export const revalidate = 3600;

type Props = { params: Promise<{ country: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const country = countryOfSlug((await params).country);
  if (!country) return {};
  return buildMetadata({
    country,
    kind: "travel-esim",
    path: kindPath(country, "travel-esim"),
    title: buildTitle({ country, kind: "travel-esim" }),
    description: `Compare travel eSIM plans by destination: Japan, South Korea, Thailand, Europe, Asia, worldwide and more. Price, cost per GB, voice, SMS and phone number from 20+ brands, shown in ${COUNTRIES[country].currency}.`,
    keywords: buildKeywords({ country, kind: "travel-esim" }),
    heading: "Best Travel eSIM Plans",
    alternates: { MY: kindPath("MY", "travel-esim"), SG: kindPath("SG", "travel-esim") },
  });
}

/** Travel eSIM index: every destination with its live plan count and starting price. Each links to its own page. */
export default async function TravelEsimIndex({ params }: Props) {
  const country = countryOfSlug((await params).country);
  if (!country) notFound();
  const cur = COUNTRIES[country].currency;
  const { rates } = await getFxRates();
  const cards = await Promise.all(
    ESIM_DESTINATIONS.map(async (d) => {
      const s = summarize((await getEsimPlans(d.key)).map((p) => toRowView(p, country, rates)));
      return { d, s };
    }),
  );
  const live = cards.filter((c) => c.s.count >= MIN_PLANS_FOR_PAGE);
  const groups = [
    { title: "Popular countries", list: live.filter((c) => c.d.type === "country") },
    { title: "Multi-country and worldwide", list: live.filter((c) => c.d.type !== "country") },
  ].filter((g) => g.list.length);

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 md:pb-16">
        <Breadcrumbs crumbs={[{ name: "PlanSifu", path: "/" }, { name: COUNTRIES[country].label, path: homePath(country) }, { name: "Travel eSIM", path: kindPath(country, "travel-esim") }]} />
        <header className="mb-8">
          <h1 className="rise mb-3 text-[32px] font-bold leading-[1.1] tracking-[-0.025em] md:text-5xl">Best Travel eSIM Plans ✈️</h1>
          <p className="rise max-w-3xl text-[17px] leading-relaxed text-label-2" style={{ "--i": 1 } as React.CSSProperties}>
            Pick where you are going to compare eSIM brands by price, cost per GB, voice and SMS, phone number and perks, converted to {cur} for {COUNTRIES[country].label} travellers. Prices are collected from each brand every week.
          </p>
        </header>

        {groups.map((g) => (
          <section key={g.title} aria-labelledby={`g-${g.title.length}`} className="mb-10">
            <h2 id={`g-${g.title.length}`} className="mb-3 px-1 text-[22px] font-bold tracking-tight md:text-[26px]">{g.title}</h2>
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {g.list.map(({ d, s }, i) => (
                <li key={d.key} className="rise" style={{ "--i": i } as React.CSSProperties}>
                  <Link href={`${kindPath(country, "travel-esim")}/${d.key}`} className="press lift flex h-full flex-col gap-3 rounded-[22px] bg-surface p-4 shadow-card">
                    <span className="text-[34px] leading-none" aria-hidden>{d.flag}</span>
                    <span>
                      <span className="block text-[17px] font-semibold tracking-tight">{shortName(d)}</span>
                      <span className="block text-[13px] text-label-2">{s.count} plans · {s.brands.length} brands</span>
                      {s.low !== null && <span className="mt-1 block text-[14px] font-semibold text-accent">From {formatPrice(Math.round(s.low * 100) / 100, cur)}</span>}
                    </span>
                    <span className="mt-auto inline-flex items-center gap-0.5 text-[14px] font-medium text-accent">Compare <ChevronIcon className="size-3.5" /></span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {!groups.length && <p className="rounded-[22px] bg-surface p-10 text-center text-label-2 shadow-card">Travel eSIM plans appear here after the next weekly update.</p>}

        <FaqSection faqs={faqsFor(country, "travel-esim")} />
      </main>
      <Footer />
    </>
  );
}
