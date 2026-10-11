import Link from "next/link";
import { ComparisonView } from "@/components/ComparisonView";
import { Footer } from "@/components/Footer";
import { PickTabs } from "@/components/PickTabs";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { FaqSection } from "@/components/seo/FaqSection";
import { JsonLdProduct } from "@/components/seo/JsonLdProduct";
import { COUNTRIES, formatPrice } from "@/lib/currency";
import { faqsFor } from "@/lib/faqs";
import { buildPicks } from "@/lib/picks";
import { getPlans } from "@/lib/plans";
import { BROADBAND_SPEEDS, MIN_PLANS_FOR_PAGE, MOBILE_FEATURES, matchFeature, matchSpeed } from "@/lib/programmatic";
import { homePath, kindPath, slugOf } from "@/lib/routes";
import { categorySeo, ogImageUrl, planStats } from "@/lib/seo-helpers";
import type { Country, PlanCategory } from "@/types/database";

export type CategoryKind = "mobile" | "postpaid" | "prepaid" | "broadband";

export const CATEGORY_LABEL: Record<CategoryKind, string> = {
  mobile: "Mobile Plans",
  postpaid: "Mobile Postpaid",
  prepaid: "Mobile Prepaid",
  broadband: "Home Broadband",
};

const CATEGORIES: Record<CategoryKind, PlanCategory[]> = {
  mobile: ["mobile_postpaid", "mobile_prepaid"],
  postpaid: ["mobile_postpaid"],
  prepaid: ["mobile_prepaid"],
  broadband: ["broadband"],
};

const H1: Record<CategoryKind, string> = {
  mobile: "Best Mobile Plans",
  postpaid: "Best Postpaid Plans",
  prepaid: "Best Prepaid Plans",
  broadband: "Best Home Fibre Broadband",
};

export const loadCategory = (country: Country, kind: CategoryKind) => getPlans(country, CATEGORIES[kind]);

export async function categoryMetadataInput(country: Country, kind: CategoryKind) {
  return categorySeo({ country, kind, plans: await loadCategory(country, kind) });
}

/** Category landing page: /my/postpaid, /sg/broadband, ... */
export async function CategoryView({ country, kind }: { country: Country; kind: CategoryKind }) {
  const plans = await loadCategory(country, kind);
  const stats = planStats(plans, country);
  const seo = categorySeo({ country, kind, plans });
  const place = COUNTRIES[country].label;
  const path = kindPath(country, kind);

  const picks = buildPicks(kind === "mobile" ? plans.filter((p) => p.category === "mobile_postpaid") : plans, kind === "prepaid" ? "prepaid" : kind === "broadband" ? "broadband" : "postpaid");

  // Links to the programmatic pages that have enough plans to be worth visiting (also helps crawlers find them).
  const related =
    kind === "broadband"
      ? BROADBAND_SPEEDS.filter((s) => matchSpeed(plans, s).length >= MIN_PLANS_FOR_PAGE).map((s) => ({ href: `${path}/${s.slug}`, label: `${s.label} fibre plans` }))
      : kind === "mobile"
        ? MOBILE_FEATURES.filter((f) => matchFeature(plans, f).length >= MIN_PLANS_FOR_PAGE).map((f) => ({ href: `${path}/${f.slug}`, label: `${f.qualifier} plans` }))
        : [];

  const crumbs = [{ name: "PlanSifu", path: "/" }, { name: place, path: homePath(country) }, { name: CATEGORY_LABEL[kind] }];

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 md:pb-16">
        <Breadcrumbs crumbs={crumbs.map((c, i) => (i === crumbs.length - 1 ? { ...c, path } : c))} />
        <header className="mb-6">
          <h1 className="rise mb-2 text-[34px] font-bold leading-[1.1] tracking-[-0.025em] md:text-5xl">
            {H1[kind]} in {place}
          </h1>
          <p className="rise max-w-3xl text-[17px] leading-relaxed text-label-2" style={{ "--i": 1 } as React.CSSProperties}>
            {COUNTRIES[country].flag} {stats.count
              ? `Compare ${stats.count} ${CATEGORY_LABEL[kind].toLowerCase()} in ${place} from ${stats.providers.slice(0, 4).join(", ")}${stats.providers.length > 4 ? " and more" : ""}${stats.low !== null ? `, from ${formatPrice(stats.low, stats.currency)}${kind === "prepaid" ? "" : " a month"}` : ""}. Use Filters to narrow by price, data and contract, then compare up to 3 side by side.`
              : `We are collecting ${CATEGORY_LABEL[kind].toLowerCase()} for ${place}. Check back after tonight's update.`}
          </p>
          {related.length > 0 && (
            <nav aria-label="Popular searches" className="mt-4 flex flex-wrap gap-2">
              {related.map((r) => (
                <Link key={r.href} href={r.href} className="press rounded-full bg-surface px-3.5 py-1.5 text-[14px] font-medium text-label-2 shadow-card hover:text-label">{r.label}</Link>
              ))}
            </nav>
          )}
        </header>

        <ComparisonView lead={picks.length > 0 ? <PickTabs compact title="Best for…" groups={picks} /> : undefined} key={`${country}-${kind}`} plans={plans} />
        <FaqSection faqs={faqsFor(country, kind)} />
      </main>
      <Footer />
      {stats.low !== null && stats.high !== null && (
        <JsonLdProduct
          name={`${CATEGORY_LABEL[kind]} in ${place}`}
          description={seo.description}
          path={path}
          currency={stats.currency}
          low={stats.low}
          high={stats.high}
          count={stats.count}
          image={ogImageUrl({ title: seo.heading, country, from: seo.from })}
        />
      )}
    </>
  );
}

export { slugOf };
