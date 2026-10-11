import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EsimExplorer } from "@/components/EsimExplorer";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { FaqSection } from "@/components/seo/FaqSection";
import { JsonLdProduct } from "@/components/seo/JsonLdProduct";
import { COUNTRIES, formatPrice } from "@/lib/currency";
import { getEsimDestinationCounts, getEsimPlans, getFxRates, toRowView } from "@/lib/esim";
import { destinationByKey, ESIM_DESTINATIONS } from "@/lib/esim-destinations";
import { esimFaqs, esimIntro, shortName, summarize } from "@/lib/esim-seo";
import { MIN_PLANS_FOR_PAGE } from "@/lib/programmatic";
import { COUNTRY_SLUGS, countryOfSlug, homePath, kindPath } from "@/lib/routes";
import { buildDescription, buildKeywords, buildMetadata, buildTitle, ogImageUrl } from "@/lib/seo-helpers";

export const revalidate = 3600;

type Props = { params: Promise<{ country: string; destination: string }> };

export function generateStaticParams() {
  return COUNTRY_SLUGS.flatMap((country) => ESIM_DESTINATIONS.map((d) => ({ country, destination: d.key })));
}

async function load(p: Props["params"]) {
  const { country: cs, destination: ds } = await p;
  const country = countryOfSlug(cs);
  const destination = destinationByKey(ds);
  if (!country || !destination) return null;
  const [plans, { rates, updatedAt }] = await Promise.all([getEsimPlans(destination.key), getFxRates()]);
  const rows = plans.map((pl) => toRowView(pl, country, rates));
  return { country, destination, rows, updatedAt, summary: summarize(rows) };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = await load(params);
  if (!d) return { robots: { index: false } };
  const { country, destination, summary } = d;
  const place = shortName(destination);
  const cur = COUNTRIES[country].currency;
  const from = summary.low !== null ? `From ${formatPrice(round2(summary.low), cur)}` : undefined;
  return buildMetadata({
    country,
    kind: "travel-esim",
    path: `${kindPath(country, "travel-esim")}/${destination.key}`,
    title: buildTitle({ country, kind: "travel-esim", qualifier: place }),
    description: summary.count
      ? `Compare ${summary.count} travel eSIM plans for ${place} from ${summary.brands.slice(0, 3).join(", ")}${summary.brands.length > 3 ? ` and ${summary.brands.length - 3} more` : ""}: price, cost per GB, voice and SMS, phone number and perks, in ${cur}. ${from ? `${from}. ` : ""}Updated weekly.`
      : buildDescription({ country, kind: "travel-esim", stats: { count: 0, providers: [], currency: cur, low: null, high: null }, qualifier: place }),
    keywords: [...buildKeywords({ country, kind: "travel-esim", qualifier: place }), `${place.toLowerCase()} esim`, `${place.toLowerCase()} sim card for tourists`],
    heading: `Best ${place} Travel eSIM Plans`,
    from,
    alternates: { MY: `${kindPath("MY", "travel-esim")}/${destination.key}`, SG: `${kindPath("SG", "travel-esim")}/${destination.key}` },
    // Thin or empty destinations stay out of the index until they have enough plans.
    noindex: summary.count < MIN_PLANS_FOR_PAGE,
  });
}

export default async function TravelEsimDestinationPage({ params }: Props) {
  const d = await load(params);
  if (!d) notFound();
  const { country, destination, rows, updatedAt, summary } = d;
  const place = shortName(destination);
  const cur = COUNTRIES[country].currency;
  const counts = await getEsimDestinationCounts();
  const path = `${kindPath(country, "travel-esim")}/${destination.key}`;
  const faqs = esimFaqs(country, destination, summary);
  const others = ESIM_DESTINATIONS.filter((x) => x.key !== destination.key && (counts[x.key] ?? 0) >= MIN_PLANS_FOR_PAGE);

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 md:pb-16">
        <Breadcrumbs
          crumbs={[
            { name: "PlanSifu", path: "/" },
            { name: COUNTRIES[country].label, path: homePath(country) },
            { name: "Travel eSIM", path: kindPath(country, "travel-esim") },
            { name: place, path },
          ]}
        />
        <header className="mb-8">
          <h1 className="rise mb-3 text-[32px] font-bold leading-[1.1] tracking-[-0.025em] md:text-5xl">
            Best Travel eSIM for {place} {destination.flag}
          </h1>
          <p className="rise max-w-3xl text-[17px] leading-relaxed text-label-2" style={{ "--i": 1 } as React.CSSProperties}>
            {esimIntro(country, destination, summary)}
          </p>
        </header>

        <EsimExplorer country={country} dest={destination.key} rows={rows} counts={counts} />

        <p className="mt-6 px-1 text-xs leading-relaxed text-label-3">
          Prices are converted to {cur} at indicative daily exchange rates{updatedAt ? ` (updated ${new Date(updatedAt).toISOString().slice(0, 10)})` : ""}; you pay in the brand&apos;s checkout currency, so the final amount can differ slightly.
          Cost per GB = price ÷ total data; unlimited plans are compared on price and cost per day. Plan details are collected automatically from each brand&apos;s site every week: confirm before you buy.
        </p>

        {others.length > 0 && (
          <nav aria-labelledby="other-destinations" className="mt-12">
            <h2 id="other-destinations" className="mb-3 px-1 text-[22px] font-bold tracking-tight md:text-[26px]">Other destinations</h2>
            <ul className="flex flex-wrap gap-2">
              {others.map((o) => (
                <li key={o.key}>
                  <Link href={`${kindPath(country, "travel-esim")}/${o.key}`} className="press inline-block rounded-full bg-surface px-3.5 py-1.5 text-[14px] font-medium text-label-2 shadow-card hover:text-label">
                    {o.flag} {shortName(o)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <FaqSection faqs={faqs} />
      </main>
      <Footer />
      {summary.low !== null && summary.high !== null && summary.count > 0 && (
        <JsonLdProduct
          name={`Travel eSIM plans for ${place}`}
          description={`Travel eSIM plans for ${place} compared by price and cost per GB.`}
          path={path}
          currency={cur}
          low={round2(summary.low)}
          high={round2(summary.high)}
          count={summary.count}
          image={ogImageUrl({ title: `Best ${place} Travel eSIM Plans`, country, from: `From ${formatPrice(round2(summary.low), cur)}` })}
        />
      )}
    </>
  );
}
