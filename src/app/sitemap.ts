import type { MetadataRoute } from "next";
import { ESIM_DESTINATIONS } from "@/lib/esim-destinations";
import { getEsimDestinationCounts } from "@/lib/esim";
import { getPlans } from "@/lib/plans";
import { BROADBAND_SPEEDS, MIN_PLANS_FOR_PAGE, MOBILE_FEATURES, matchFeature, matchSpeed } from "@/lib/programmatic";
import { KINDS, kindPath } from "@/lib/routes";
import { absoluteUrl } from "@/lib/seo-helpers";
import type { Country } from "@/types/database";

export const revalidate = 3600;

/**
 * Everything worth indexing: the hub, About, both country homes, every category page, the programmatic pages that
 * have enough plans, and Travel eSIM destinations that have data. Thin pages are left out (they return 404 anyway).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/about"), lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  const esimCounts = await getEsimDestinationCounts();
  for (const country of ["MY", "SG"] as Country[]) {
    const slug = country.toLowerCase();
    entries.push({ url: absoluteUrl(`/${slug}`), lastModified: now, changeFrequency: "daily", priority: 0.9 });
    for (const kind of KINDS) {
      entries.push({ url: absoluteUrl(kindPath(country, kind)), lastModified: now, changeFrequency: "daily", priority: kind === "mobile" ? 0.7 : 0.9 });
    }

    const mobile = await getPlans(country, ["mobile_postpaid", "mobile_prepaid"]);
    for (const f of MOBILE_FEATURES) {
      if (matchFeature(mobile, f).length >= MIN_PLANS_FOR_PAGE) entries.push({ url: absoluteUrl(`${kindPath(country, "mobile")}/${f.slug}`), lastModified: now, changeFrequency: "daily", priority: 0.7 });
    }
    const broadband = await getPlans(country, ["broadband"]);
    for (const s of BROADBAND_SPEEDS) {
      if (matchSpeed(broadband, s).length >= MIN_PLANS_FOR_PAGE) entries.push({ url: absoluteUrl(`${kindPath(country, "broadband")}/${s.slug}`), lastModified: now, changeFrequency: "daily", priority: 0.7 });
    }
    for (const d of ESIM_DESTINATIONS) {
      // The default destination is the base URL (already listed above), so only the others carry ?dest=.
      if (d.key !== ESIM_DESTINATIONS[0].key && (esimCounts[d.key] ?? 0) >= MIN_PLANS_FOR_PAGE) entries.push({ url: absoluteUrl(`${kindPath(country, "travel-esim")}?dest=${d.key}`), lastModified: now, changeFrequency: "weekly", priority: 0.6 });
    }
  }
  return entries;
}
