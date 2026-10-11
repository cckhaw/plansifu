import { absoluteUrl } from "@/lib/seo-helpers";
import { JsonLd } from "./JsonLd";

export interface ProductLdProps {
  /** e.g. "Postpaid plans in Malaysia" */
  name: string;
  description: string;
  /** Path of the page, e.g. /my/postpaid */
  path: string;
  currency: "MYR" | "SGD";
  /** Cheapest and dearest monthly price on the page, and how many plans are listed. */
  low: number;
  high: number;
  count: number;
  /** Social card, used as the product image. */
  image: string;
}

/**
 * Product + AggregateOffer for a comparison page, so a result can show the price range and offer count
 * ("MYR 18.00 - MYR 199.00, 43 offers"). The numbers come straight from the plans listed on the page. We
 * deliberately publish no rating: PlanSifu has no reviews and must not invent any.
 */
export function JsonLdProduct({ name, description, path, currency, low, high, count, image }: ProductLdProps) {
  if (!count || !(low > 0)) return null;
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Product",
        name,
        description,
        url: absoluteUrl(path),
        image,
        brand: { "@type": "Brand", name: "PlanSifu comparison" },
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: currency,
          lowPrice: low.toFixed(2),
          highPrice: high.toFixed(2),
          offerCount: count,
          availability: "https://schema.org/InStock",
        },
      }}
    />
  );
}
