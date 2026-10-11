import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProgrammaticView } from "@/components/ProgrammaticView";
import { COUNTRIES } from "@/lib/currency";
import { getPlans } from "@/lib/plans";
import { MIN_PLANS_FOR_PAGE, MOBILE_FEATURES, featureBySlug, liveIntro, matchFeature } from "@/lib/programmatic";
import { COUNTRY_SLUGS, countryOfSlug, kindPath } from "@/lib/routes";
import { buildDescription, buildKeywords, buildMetadata, buildTitle, fromPrice, planStats } from "@/lib/seo-helpers";

export const revalidate = 3600;

type Props = { params: Promise<{ country: string; feature: string }> };

export function generateStaticParams() {
  return COUNTRY_SLUGS.flatMap((country) => MOBILE_FEATURES.map((f) => ({ country, feature: f.slug })));
}

async function load(p: Props["params"]) {
  const { country: cs, feature: fs } = await p;
  const country = countryOfSlug(cs);
  const feature = featureBySlug(fs);
  if (!country || !feature) return null;
  const plans = matchFeature(await getPlans(country, ["mobile_postpaid", "mobile_prepaid"]), feature);
  return { country, feature, plans };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = await load(params);
  if (!d) return { robots: { index: false } };
  const { country, feature, plans } = d;
  const stats = planStats(plans, country);
  const title = buildTitle({ country, kind: "mobile", qualifier: feature.qualifier });
  return buildMetadata({
    country,
    kind: "mobile",
    path: `${kindPath(country, "mobile")}/${feature.slug}`,
    title,
    description: buildDescription({ country, kind: "mobile", stats, qualifier: feature.qualifier }),
    keywords: buildKeywords({ country, kind: "mobile", qualifier: feature.qualifier, providers: stats.providers }),
    heading: title.split(" | ")[0].replace(/ \(\d{4}\)/, ""),
    from: fromPrice(stats) && `From ${fromPrice(stats)}/mo`,
    // Too few plans is thin content: keep it out of the index (the page itself 404s below the same threshold).
    noindex: plans.length < MIN_PLANS_FOR_PAGE,
  });
}

export default async function MobileFeaturePage({ params }: Props) {
  const d = await load(params);
  if (!d || d.plans.length < MIN_PLANS_FOR_PAGE) notFound();
  const { country, feature, plans } = d;
  const place = COUNTRIES[country].label;
  const title = buildTitle({ country, kind: "mobile", qualifier: feature.qualifier });
  const stats = planStats(plans, country);
  const path = `${kindPath(country, "mobile")}/${feature.slug}`;
  return (
    <ProgrammaticView
      country={country}
      family="mobile"
      path={path}
      parentPath={kindPath(country, "mobile")}
      parentLabel="Mobile plans"
      crumb={`${feature.qualifier} plans`}
      h1={`Best ${feature.qualifier} Mobile Plans in ${place}`}
      intro={liveIntro({ country, plans, what: `mobile plans ${feature.means}` })}
      explainer={feature.explainer}
      plans={plans}
      faqs={feature.faqs}
      socialTitle={title.split(" | ")[0].replace(/ \(\d{4}\)/, "")}
      description={buildDescription({ country, kind: "mobile", stats, qualifier: feature.qualifier })}
    />
  );
}
