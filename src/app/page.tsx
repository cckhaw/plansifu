import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { ChevronIcon, PhoneIcon, PlaneIcon, SimIcon, WifiIcon } from "@/components/Icons";
import { PlanCard } from "@/components/PlanCard";
import { parseCountry } from "@/lib/currency";
import { getPlans } from "@/lib/plans";

export const revalidate = 3600;

const TILES = [
  { href: "/mobile?type=postpaid", title: "Postpaid", blurb: "Monthly plans", Icon: PhoneIcon, color: "#0A84FF" },
  { href: "/mobile?type=prepaid", title: "Prepaid", blurb: "No contract", Icon: SimIcon, color: "#30B755" },
  { href: "/broadband", title: "Broadband", blurb: "Home fibre", Icon: WifiIcon, color: "#BF5AF2" },
  { href: "/travel-esim", title: "Travel eSIM", blurb: "By destination", Icon: PlaneIcon, color: "#FF9F0A" },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ country?: string }> }) {
  const country = parseCountry((await searchParams).country);
  const [mobile, broadband] = await Promise.all([getPlans(country, ["mobile_postpaid"]), getPlans(country, ["broadband"])]);

  const sections = [
    { title: "Top postpaid deals", plans: mobile.slice(0, 3), href: `/mobile?type=postpaid&country=${country}` },
    { title: "Top home fibre deals", plans: broadband.slice(0, 3), href: `/broadband?country=${country}` },
  ];

  return (
    <>
      <Hero country={country} />
      <main className="mx-auto max-w-7xl space-y-12 px-4 pb-28 pt-6 md:pb-16">
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {TILES.map((t, i) => (
            <li key={t.href} className="rise" style={{ "--i": i + 3 } as React.CSSProperties}>
              <Link href={`${t.href}${t.href.includes("?") ? "&" : "?"}country=${country}`} className="press lift flex h-full flex-col gap-6 rounded-[22px] bg-surface p-4 shadow-card">
                <span className="grid size-11 place-items-center rounded-[12px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]" style={{ background: `linear-gradient(160deg, ${t.color}, color-mix(in srgb, ${t.color} 78%, black))` }}>
                  <t.Icon className="size-6" />
                </span>
                <span>
                  <span className="block text-[17px] font-semibold tracking-tight">{t.title}</span>
                  <span className="block text-[13px] text-label-2">{t.blurb}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {sections.map((s) => (
          <section key={s.title}>
            <div className="mb-3 flex items-end justify-between px-1">
              <h2 className="text-[26px] font-bold tracking-tight">{s.title}</h2>
              <Link href={s.href} className="press inline-flex items-center gap-0.5 text-[15px] font-medium text-accent">See all <ChevronIcon className="size-4" /></Link>
            </div>
            {s.plans.length ? (
              <div className="grid gap-4 md:grid-cols-3">{s.plans.map((p, i) => <PlanCard key={p.id} plan={p} index={i} />)}</div>
            ) : (
              <p className="px-1 text-label-2">No plans available yet — check back soon.</p>
            )}
          </section>
        ))}
      </main>
      <Footer />
    </>
  );
}
