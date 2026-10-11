import { absoluteUrl } from "@/lib/seo-helpers";
import { JsonLd } from "./JsonLd";

export interface Crumb {
  name: string;
  /** Path, e.g. /my/postpaid. The last crumb (the current page) may omit it. */
  path?: string;
}

/** BreadcrumbList, e.g. PlanSifu > Malaysia > Mobile Postpaid. */
export function JsonLdBreadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((c, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: c.name,
          ...(c.path ? { item: absoluteUrl(c.path) } : {}),
        })),
      }}
    />
  );
}
