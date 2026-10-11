import Link from "next/link";
import type { Country } from "@/types/database";
import { COUNTRIES } from "@/lib/currency";
import { kindPath } from "@/lib/routes";
import { SearchIcon } from "./Icons";

export function Hero({ country }: { country: Country }) {
  return (
    <section className="relative mx-auto max-w-4xl px-4 pb-6 pt-10 text-center md:pt-20">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-10 -z-10 h-[420px]" style={{ background: "radial-gradient(60% 60% at 50% 0%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 70%)" }} />
      <p className="rise mb-3 inline-flex items-center gap-1.5 rounded-full bg-tint px-3 py-1 text-[13px] font-semibold text-accent">
        <span aria-hidden>{COUNTRIES[country].flag}</span> {COUNTRIES[country].label} · prices in {COUNTRIES[country].currency}
      </p>
      <h1 className="rise text-[38px] font-bold leading-[1.05] tracking-[-0.03em] md:text-[72px]">
        Find the plan that<br className="hidden md:block" /> <span className="text-accent">actually fits.</span>
      </h1>
      <p className="rise mx-auto mt-4 max-w-xl text-[17px] leading-snug text-label-2 md:text-xl" style={{ "--i": 1 } as React.CSSProperties}>
        Compare postpaid, prepaid, home fibre broadband and travel eSIM deals in {COUNTRIES[country].label}, updated every night.
      </p>

      <form action={kindPath(country, "mobile")} method="get" role="search" className="rise mx-auto mt-8 max-w-xl" style={{ "--i": 2 } as React.CSSProperties}>
        <label className="flex items-center gap-2 rounded-[14px] bg-fill-strong px-3.5 py-3 transition-shadow focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_40%,transparent)]">
          <SearchIcon className="size-5 shrink-0 text-label-3" />
          <input name="q" type="search" aria-label="Search plans" placeholder="Search a plan or provider" className="min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-label-3" />
        </label>
      </form>
      <nav aria-label="Browse by type" className="rise mt-4 flex flex-wrap justify-center gap-2" style={{ "--i": 3 } as React.CSSProperties}>
        {(["postpaid", "prepaid", "broadband", "travel-esim"] as const).map((k) => (
          <Link key={k} href={kindPath(country, k)} className="press rounded-full bg-surface px-3.5 py-1.5 text-[14px] font-medium text-label-2 shadow-card hover:text-label">
            {k === "travel-esim" ? "Travel eSIM" : k === "broadband" ? "Home fibre" : k[0].toUpperCase() + k.slice(1)}
          </Link>
        ))}
      </nav>
    </section>
  );
}
