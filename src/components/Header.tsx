import Link from "next/link";
import { COUNTRIES } from "@/lib/currency";
import type { Country } from "@/types/database";

export type NavKey = "home" | "postpaid" | "prepaid" | "broadband";

const TABS: { key: Exclude<NavKey, "home">; label: string; path: string }[] = [
  { key: "postpaid", label: "Mobile Postpaid", path: "/mobile?type=postpaid" },
  { key: "prepaid", label: "Prepaid", path: "/mobile?type=prepaid" },
  { key: "broadband", label: "Home Fibre Broadband", path: "/broadband" },
];

function withCountry(path: string, country: Country) {
  return `${path}${path.includes("?") ? "&" : "?"}country=${country}`;
}

export function Header({ country, active, pathname }: { country: Country; active: NavKey; pathname: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href={withCountry("/", country)} className="flex items-center gap-2">
          <span className="text-xl font-extrabold tracking-tight text-sifu-navy">Plan<span className="text-sifu-gold">Sifu</span></span>
          <span className="rounded-full bg-sifu-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Beta</span>
        </Link>

        <nav aria-label="Categories" className="order-3 -mx-4 flex w-[calc(100%+2rem)] gap-1 overflow-x-auto px-4 md:order-none md:mx-0 md:w-auto md:px-0">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={withCountry(t.path, country)}
              aria-current={active === t.key ? "page" : undefined}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${active === t.key ? "bg-sifu-navy text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex rounded-full border border-slate-200 p-0.5 text-sm font-semibold" role="group" aria-label="Country">
          {(Object.keys(COUNTRIES) as Country[]).map((c) => (
            <Link
              key={c}
              href={`${pathname}${pathname.includes("?") ? "&" : "?"}country=${c}`}
              aria-current={country === c ? "true" : undefined}
              className={`rounded-full px-3 py-1 ${country === c ? "bg-sifu-gold text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {COUNTRIES[c].flag} {COUNTRIES[c].currency}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
