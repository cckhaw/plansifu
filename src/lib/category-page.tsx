import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryView, categoryMetadataInput, type CategoryKind } from "@/components/CategoryView";
import { countryOfSlug } from "@/lib/routes";
import { buildMetadata } from "@/lib/seo-helpers";

type Props = { params: Promise<{ country: string }> };

/** The three exports every /[country]/<category> page needs, so each page file stays tiny. */
export function categoryPage(kind: CategoryKind) {
  return {
    async generateMetadata({ params }: Props): Promise<Metadata> {
      const country = countryOfSlug((await params).country);
      if (!country) return {};
      return buildMetadata(await categoryMetadataInput(country, kind));
    },
    async Page({ params }: Props) {
      const country = countryOfSlug((await params).country);
      if (!country) notFound();
      return <CategoryView country={country} kind={kind} />;
    },
  };
}
