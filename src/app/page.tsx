import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { PlanCard } from "@/components/PlanCard";
import { parseCountry } from "@/lib/currency";
import { getPlans } from "@/lib/plans";

export const revalidate = 3600;

export default async function Home({ searchParams }: { searchParams: Promise<{ country?: string }> }) {
  const country = parseCountry((await searchParams).country);
  const [mobile, broadband] = await Promise.all([getPlans(country, ["mobile_postpaid"]), getPlans(country, ["broadband"])]);

  const sections = [
    { title: "Top mobile postpaid deals", plans: mobile.slice(0, 3), href: `/mobile?type=postpaid&country=${country}` },
    { title: "Top home fibre deals", plans: broadband.slice(0, 3), href: `/broadband?country=${country}` },
  ];

  return (
    <>
      <Header country={country} active="home" pathname="/" />
      <Hero country={country} />
      <main className="mx-auto max-w-7xl space-y-12 px-4 py-12">
        {sections.map((s) => (
          <section key={s.title}>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="text-2xl font-extrabold">{s.title}</h2>
              <Link href={s.href} className="text-sm font-bold text-sifu-gold hover:underline">See all →</Link>
            </div>
            {s.plans.length ? (
              <div className="grid gap-4 md:grid-cols-3">{s.plans.map((p) => <PlanCard key={p.id} plan={p} />)}</div>
            ) : (
              <p className="text-slate-500">No plans available yet — check back soon.</p>
            )}
          </section>
        ))}
      </main>
      <Footer />
    </>
  );
}
