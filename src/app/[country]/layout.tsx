import { COUNTRY_SLUGS } from "@/lib/routes";

/** Only /my and /sg exist; anything else under /[country] is a 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return COUNTRY_SLUGS.map((country) => ({ country }));
}

export default function CountryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
