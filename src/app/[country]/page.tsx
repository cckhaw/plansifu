import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomeView } from "@/components/HomeView";
import { COUNTRIES } from "@/lib/currency";
import { getPlans } from "@/lib/plans";
import { countryOfSlug, homePath } from "@/lib/routes";
import { buildMetadata, fromPrice, planStats } from "@/lib/seo-helpers";

export const revalidate = 3600;

type Props = { params: Promise<{ country: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const country = countryOfSlug((await params).country);
  if (!country) return {};
  const place = COUNTRIES[country].label;
  const plans = await getPlans(country, ["mobile_postpaid", "mobile_prepaid", "broadband"]);
  const stats = planStats(plans, country);
  const from = fromPrice(stats);
  return buildMetadata({
    country,
    kind: "mobile",
    path: homePath(country),
    title: `Compare Telco, Fibre Broadband & Travel eSIM Plans in ${place} (${new Date().getFullYear()}) | PlanSifu 师傅`,
    description: `Compare ${stats.count || "all"} postpaid, prepaid and home fibre broadband plans in ${place} from ${stats.providers.slice(0, 4).join(", ") || "every major telco"}${from ? `, from ${from} a month` : ""}, plus travel eSIMs. Prices updated every night.`,
    keywords: [`compare telco plans ${place.toLowerCase()}`, `best mobile plan ${place.toLowerCase()}`, `best fibre broadband ${place.toLowerCase()}`, `travel esim ${place.toLowerCase()}`],
    heading: `Compare Telco & Broadband Plans in ${place}`,
    from: from && `From ${from}/mo`,
    alternates: { MY: "/my", SG: "/sg" },
  });
}

export default async function CountryHome({ params }: Props) {
  const country = countryOfSlug((await params).country);
  if (!country) notFound();
  return <HomeView country={country} />;
}
