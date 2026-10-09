import type { Country } from "@/types/database";

const BADGES = ["✔ Independent comparison", "✔ Updated every night", "✔ Free to use", "✔ 100% local telcos"];

export function Hero({ country }: { country: Country }) {
  return (
    <section className="bg-sifu-navy text-white">
      <div className="mx-auto max-w-4xl px-4 py-14 text-center md:py-20">
        <h1 className="text-3xl font-extrabold leading-tight md:text-5xl">
          Master Your Mobile &amp; Fibre Savings with <span className="text-sifu-gold">PlanSifu</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-300 md:text-lg">
          Compare all telco and broadband subscription deals across Malaysia &amp; Singapore
        </p>

        <form action="/mobile" method="get" role="search" className="mx-auto mt-8 flex max-w-xl overflow-hidden rounded-xl bg-white shadow-lg">
          <input type="hidden" name="country" value={country} />
          <input name="q" type="search" aria-label="Search plans" placeholder="Search a plan or provider, e.g. Maxis, 5G, unlimited…" className="min-w-0 flex-1 px-4 py-3.5 text-sm text-sifu-navy outline-none" />
          <button className="bg-sifu-gold px-6 font-bold hover:bg-sifu-gold-dark">Search</button>
        </form>

        <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-300">
          {BADGES.map((b) => <li key={b}>{b}</li>)}
        </ul>
      </div>
    </section>
  );
}
