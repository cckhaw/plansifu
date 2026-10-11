import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProgrammaticView } from "@/components/ProgrammaticView";
import { COUNTRIES } from "@/lib/currency";
import { getPlans } from "@/lib/plans";
import { BROADBAND_SPEEDS, MIN_PLANS_FOR_PAGE, liveIntro, matchSpeed, speedBySlug } from "@/lib/programmatic";
import { COUNTRY_SLUGS, countryOfSlug, kindPath } from "@/lib/routes";
import { buildDescription, buildKeywords, buildMetadata, buildTitle, fromPrice, planStats } from "@/lib/seo-helpers";

export const revalidate = 3600;

type Props = { params: Promise<{ country: string; speed: string }> };

export function generateStaticParams() {
  return COUNTRY_SLUGS.flatMap((country) => BROADBAND_SPEEDS.map((s) => ({ country, speed: s.slug })));
}

async function load(p: Props["params"]) {
  const { country: cs, speed: ss } = await p;
  const country = countryOfSlug(cs);
  const speed = speedBySlug(ss);
  if (!country || !speed) return null;
  const plans = matchSpeed(await getPlans(country, ["broadband"]), speed);
  return { country, speed, plans };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = await load(params);
  if (!d) return { robots: { index: false } };
  const { country, speed, plans } = d;
  const stats = planStats(plans, country);
  const title = buildTitle({ country, kind: "broadband", qualifier: speed.label });
  return buildMetadata({
    country,
    kind: "broadband",
    path: `${kindPath(country, "broadband")}/${speed.slug}`,
    title,
    description: buildDescription({ country, kind: "broadband", stats, qualifier: speed.label }),
    keywords: buildKeywords({ country, kind: "broadband", qualifier: speed.label, providers: stats.providers }),
    heading: title.split(" | ")[0].replace(/ \(\d{4}\)/, ""),
    from: fromPrice(stats) && `From ${fromPrice(stats)}/mo`,
    noindex: plans.length < MIN_PLANS_FOR_PAGE,
  });
}

export default async function BroadbandSpeedPage({ params }: Props) {
  const d = await load(params);
  if (!d || d.plans.length < MIN_PLANS_FOR_PAGE) notFound();
  const { country, speed, plans } = d;
  const place = COUNTRIES[country].label;
  const title = buildTitle({ country, kind: "broadband", qualifier: speed.label });
  const stats = planStats(plans, country);
  const path = `${kindPath(country, "broadband")}/${speed.slug}`;
  return (
    <ProgrammaticView
      country={country}
      family="broadband"
      path={path}
      parentPath={kindPath(country, "broadband")}
      parentLabel="Home fibre broadband"
      crumb={`${speed.label} fibre`}
      h1={`Best ${speed.label} Home Fibre Broadband in ${place}`}
      intro={liveIntro({ country, plans, what: `home fibre plans of ${speed.label} or faster` })}
      explainer={speed.explainer}
      plans={plans}
      faqs={speed.faqs}
      socialTitle={title.split(" | ")[0].replace(/ \(\d{4}\)/, "")}
      description={buildDescription({ country, kind: "broadband", stats, qualifier: speed.label })}
    />
  );
}
