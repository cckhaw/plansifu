import Link from "next/link";
import { COUNTRIES } from "@/lib/currency";
import { kindPath } from "@/lib/routes";
import type { Country } from "@/types/database";

const LINKS = [
  ["postpaid", "Postpaid plans"],
  ["prepaid", "Prepaid plans"],
  ["broadband", "Home fibre broadband"],
  ["travel-esim", "Travel eSIM"],
] as const;

/** Sitewide links: gives crawlers (and people) a path to every category page from every page. */
export function Footer() {
  return (
    <footer className="mx-auto mt-12 max-w-7xl px-4 pb-32 text-xs leading-relaxed text-label-3 md:pb-12">
      <nav aria-label="Footer" className="mb-8 grid gap-6 text-[14px] sm:grid-cols-3">
        {(["MY", "SG"] as Country[]).map((c) => (
          <div key={c}>
            <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-label-2">{COUNTRIES[c].flag} {COUNTRIES[c].label}</h2>
            <ul className="space-y-1.5">
              {LINKS.map(([k, label]) => (
                <li key={k}><Link href={kindPath(c, k)} className="text-label-2 hover:text-label hover:underline">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-label-2">PlanSifu</h2>
          <ul className="space-y-1.5">
            <li><Link href="/about" className="text-label-2 hover:text-label hover:underline">About &amp; how we rank</Link></li>
            <li><Link href="/" className="text-label-2 hover:text-label hover:underline">Choose country</Link></li>
          </ul>
        </div>
      </nav>
      <div className="mx-auto max-w-2xl text-center">
        <p>
          PlanSifu may earn a commission when you apply through our links, at no cost to you. Prices are collected
          automatically and may change; always confirm with the provider.
        </p>
        <p className="mt-2">© {new Date().getFullYear()} PlanSifu 师傅</p>
      </div>
    </footer>
  );
}
