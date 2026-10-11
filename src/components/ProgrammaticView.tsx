import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { FaqSection } from "@/components/seo/FaqSection";
import { JsonLdProduct } from "@/components/seo/JsonLdProduct";
import type { Faq } from "@/components/seo/JsonLdFaq";
import { ProviderLogo } from "@/components/ProviderLogo";
import { COUNTRIES, formatContract, formatData, formatPrice, formatSpeed, formatTalktime } from "@/lib/currency";
import { homePath } from "@/lib/routes";
import { ogImageUrl, planStats } from "@/lib/seo-helpers";
import type { Country, PlanWithProvider } from "@/types/database";

const MATRIX_ROWS = 20;

interface Props {
  country: Country;
  /** "mobile" matrix shows data and calls; "broadband" shows speed. */
  family: "mobile" | "broadband";
  path: string;
  parentPath: string;
  parentLabel: string;
  h1: string;
  /** Breadcrumb label for this page */
  crumb: string;
  intro: string;
  explainer: string[];
  plans: PlanWithProvider[];
  faqs: Faq[];
  socialTitle: string;
  description: string;
}

/** Programmatic landing page: tailored copy, a spec matrix of matching plans, FAQs and structured data. */
export function ProgrammaticView(p: Props) {
  const { country, plans } = p;
  const stats = planStats(plans, country);
  const cur = COUNTRIES[country].currency;
  const shown = plans.slice(0, MATRIX_ROWS);
  const from = stats.low !== null ? `From ${formatPrice(stats.low, cur)}/mo` : undefined;

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 md:pb-16">
        <Breadcrumbs crumbs={[{ name: "PlanSifu", path: "/" }, { name: COUNTRIES[country].label, path: homePath(country) }, { name: p.parentLabel, path: p.parentPath }, { name: p.crumb, path: p.path }]} />
        <header className="mb-8">
          <h1 className="rise mb-3 text-[32px] font-bold leading-[1.1] tracking-[-0.025em] md:text-5xl">{p.h1}</h1>
          <p className="rise max-w-3xl text-[17px] leading-relaxed text-label-2" style={{ "--i": 1 } as React.CSSProperties}>
            {COUNTRIES[country].flag} {p.intro}
          </p>
        </header>

        <section aria-labelledby="matrix-heading">
          <h2 id="matrix-heading" className="mb-3 px-1 text-[22px] font-bold tracking-tight md:text-[26px]">Compare the {plans.length} plans</h2>
          <div className="overflow-x-auto rounded-[22px] bg-surface shadow-card">
            <table className="w-full min-w-[720px] text-left text-[14px]">
              <caption className="sr-only">{p.h1}: price and specs by plan</caption>
              <thead className="text-[11px] font-medium uppercase tracking-wide text-label-3">
                <tr>
                  <th scope="col" className="px-4 py-3">Provider</th>
                  <th scope="col" className="px-3 py-3">Plan</th>
                  {p.family === "mobile" ? <th scope="col" className="px-3 py-3">Type</th> : <th scope="col" className="px-3 py-3">Speed</th>}
                  <th scope="col" className="px-3 py-3">Price / month</th>
                  <th scope="col" className="px-3 py-3">Data</th>
                  {p.family === "mobile" && <th scope="col" className="px-3 py-3">Calls / SMS</th>}
                  <th scope="col" className="px-3 py-3">Contract</th>
                  <th scope="col" className="px-3 py-3"><span className="sr-only">Get deal</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sep">
                {shown.map((pl) => (
                  <tr key={pl.id} className="align-top">
                    <th scope="row" className="px-4 py-3 font-semibold">
                      <span className="flex items-center gap-2"><ProviderLogo provider={pl.provider} size={28} />{pl.provider.name}</span>
                    </th>
                    <td className="px-3 py-3">{pl.title}</td>
                    {p.family === "mobile" ? <td className="px-3 py-3">{pl.category === "mobile_prepaid" ? "Prepaid" : "Postpaid"}</td> : <td className="px-3 py-3 font-semibold tabular-nums">{formatSpeed(pl.speed_mbps)}</td>}
                    <td className="px-3 py-3 font-bold tabular-nums">{formatPrice(pl.monthly_price, pl.currency)}</td>
                    <td className="px-3 py-3 tabular-nums">{formatData(pl.data_gb)}</td>
                    {p.family === "mobile" && <td className="px-3 py-3">{formatTalktime(pl)}</td>}
                    <td className="px-3 py-3">{formatContract(pl.contract_months)}</td>
                    <td className="px-3 py-3">
                      <a href={`/api/redirect?plan_id=${encodeURIComponent(pl.id)}`} target="_blank" rel="sponsored nofollow noopener" className="press whitespace-nowrap rounded-full bg-accent-fill px-3.5 py-1.5 text-[13px] font-semibold text-accent-on-fill hover:bg-accent-fill-hover">Get deal</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {plans.length > MATRIX_ROWS && <p className="mt-2 px-1 text-[13px] text-label-3">Showing the {MATRIX_ROWS} cheapest of {plans.length}.</p>}
          <p className="mt-3 px-1 text-[15px]">
            <Link href={p.parentPath} className="font-medium text-accent hover:underline">See all {p.parentLabel.toLowerCase()} in {COUNTRIES[country].label} with filters →</Link>
          </p>
        </section>

        <section aria-labelledby="guide-heading" className="mt-12 max-w-3xl">
          <h2 id="guide-heading" className="mb-3 px-1 text-[22px] font-bold tracking-tight md:text-[26px]">What to know</h2>
          <div className="space-y-3 px-1 text-[16px] leading-relaxed text-label-2">
            {p.explainer.map((t) => <p key={t}>{t}</p>)}
          </div>
        </section>

        <FaqSection faqs={p.faqs} id="faq" />
        <p className="mt-8 px-1 text-xs leading-relaxed text-label-3">Prices are collected automatically from provider websites each night and may change; confirm details with the provider before you apply.</p>
      </main>
      <Footer />
      {stats.low !== null && stats.high !== null && (
        <JsonLdProduct name={p.h1} description={p.description} path={p.path} currency={stats.currency} low={stats.low} high={stats.high} count={stats.count} image={ogImageUrl({ title: p.socialTitle, country, from })} />
      )}
    </>
  );
}

