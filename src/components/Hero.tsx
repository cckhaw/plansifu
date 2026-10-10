import type { Country } from "@/types/database";
import { SearchIcon } from "./Icons";

export function Hero({ country }: { country: Country }) {
  return (
    <section className="mx-auto max-w-4xl px-4 pb-4 pt-10 text-center md:pt-16">
      <h1 className="rise text-[38px] font-bold leading-[1.05] tracking-[-0.03em] md:text-[64px]">
        Find the plan that<br className="hidden md:block" /> <span className="text-accent">actually fits.</span>
      </h1>
      <p className="rise mx-auto mt-4 max-w-xl text-[17px] leading-snug text-label-2 md:text-xl" style={{ "--i": 1 } as React.CSSProperties}>
        Compare mobile, fibre broadband and travel eSIM deals across Malaysia &amp; Singapore — updated every night.
      </p>

      <form action="/mobile" method="get" role="search" className="rise mx-auto mt-8 max-w-xl" style={{ "--i": 2 } as React.CSSProperties}>
        <input type="hidden" name="country" value={country} />
        <label className="flex items-center gap-2 rounded-[14px] bg-fill-strong px-3.5 py-3 transition-shadow focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_40%,transparent)]">
          <SearchIcon className="size-5 shrink-0 text-label-3" />
          <input name="q" type="search" aria-label="Search plans" placeholder="Search a plan or provider" className="min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-label-3" />
        </label>
      </form>
    </section>
  );
}
