import Link from "next/link";
import { FaqSection } from "@/components/seo/FaqSection";
import { faqsFor } from "@/lib/faqs";
import { kindPath } from "@/lib/routes";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { HeroCarousel } from "@/components/HeroCarousel";
import { PhoneIcon, PlaneIcon, SimIcon, WifiIcon } from "@/components/Icons";
import { PickTabs } from "@/components/PickTabs";
import { COUNTRIES, formatData, formatPrice, formatSpeed } from "@/lib/currency";
import { filterAndSort, getEsimPlans, getFxRates, toRowView } from "@/lib/esim";
import { buildPicks, planSlide, type HeroSlide, type PickGroup } from "@/lib/picks";
import { getPlans } from "@/lib/plans";
import type { Country } from "@/types/database";

const TILES = [
  { kind: "postpaid", title: "Postpaid", blurb: "Monthly plans", Icon: PhoneIcon, color: "#0A84FF" },
  { kind: "prepaid", title: "Prepaid", blurb: "No contract", Icon: SimIcon, color: "#30B755" },
  { kind: "broadband", title: "Broadband", blurb: "Home fibre", Icon: WifiIcon, color: "#BF5AF2" },
  { kind: "travel-esim", title: "Travel eSIM", blurb: "By destination", Icon: PlaneIcon, color: "#FF9F0A" },
] as const;

/** Colours are deliberately deep so white text stays readable on every slide. */
const COLORS = { blue: "#0a64d8", purple: "#8a43c2", green: "#1f8a3b", orange: "#c2410c", indigo: "#4745c7", teal: "#0e7480", pink: "#c8123f" };

const first = (groups: PickGroup[], id: string) => groups.find((g) => g.id === id)?.items[0];

async function esimSlide(country: Country): Promise<HeroSlide | null> {
  const [plans, { rates }] = await Promise.all([getEsimPlans("japan"), getFxRates()]);
  const { rows } = filterAndSort(plans.map((p) => toRowView(p, country, rates)), { all: false, voice: false, number: false, minGb: 0, brand: null }, "gb");
  const best = rows.find((r) => r.perGb !== null && r.price !== null);
  if (!best || best.perGb === null || best.price === null) return null;
  const currency = COUNTRIES[country].currency;
  const p = best.plan;
  return {
    id: "esim-japan",
    tag: "Best for Japan trips",
    icon: "plane",
    color: COLORS.pink,
    brand: p.provider.name,
    provider: p.provider,
    title: p.title,
    headline: `${formatPrice(Math.round(best.perGb * 100) / 100, currency)} / GB`,
    sub: `Cheapest travel eSIM per GB for Japan: ${formatData(p.data_gb)} for ${p.validity_days ?? "?"} days.`,
    price: formatPrice(Math.round(best.price * 100) / 100, currency),
    href: `${kindPath(country, "travel-esim")}?dest=japan`,
    cta: "Compare travel eSIMs",
    external: false,
  };
}

export async function HomeView({ country }: { country: Country }) {
  const [postpaid, prepaid, broadband, esim] = await Promise.all([
    getPlans(country, ["mobile_postpaid"]),
    getPlans(country, ["mobile_prepaid"]),
    getPlans(country, ["broadband"]),
    esimSlide(country),
  ]);
  const post = buildPicks(postpaid, "postpaid");
  const pre = buildPicks(prepaid, "prepaid");
  const bb = buildPicks(broadband, "broadband");

  const slides: HeroSlide[] = [];
  const add = (s: HeroSlide | null | undefined) => s && slides.push(s);
  const v = first(post, "value");
  if (v) add(planSlide({ id: "post-value", tag: "Best value postpaid", icon: "phone", color: COLORS.blue, plan: v.plan, headline: v.stat, sub: `${formatData(v.plan.data_gb)} of data: the lowest price per GB on a postpaid plan.` }));
  const u = first(post, "unlimited");
  if (u) add(planSlide({ id: "post-unlimited", tag: "Best for heavy users", icon: "phone", color: COLORS.purple, plan: u.plan, headline: "Unlimited data", sub: "The cheapest postpaid plan with no data cap, for streaming and tethering." }));
  const c = first(post, "cheapest");
  if (c) add(planSlide({ id: "post-cheap", tag: "Best on a budget", icon: "phone", color: COLORS.green, plan: c.plan, headline: `${c.stat}`, sub: `The lowest-priced postpaid plan that still gives you ${formatData(c.plan.data_gb)}.` }));
  const pv = first(pre, "value");
  if (pv) add(planSlide({ id: "pre-value", tag: "Best prepaid value", icon: "sim", color: COLORS.orange, plan: pv.plan, headline: pv.stat, sub: `${formatData(pv.plan.data_gb)} with no contract: the lowest price per GB on prepaid.` }));
  const f = first(bb, "fastest");
  if (f) add(planSlide({ id: "bb-fast", tag: "Fastest home fibre", icon: "wifi", color: COLORS.indigo, plan: f.plan, headline: formatSpeed(f.plan.speed_mbps), sub: "The quickest home fibre plan on the market, for big households and gamers." }));
  const bv = first(bb, "value");
  if (bv) add(planSlide({ id: "bb-value", tag: "Best value fibre", icon: "wifi", color: COLORS.teal, plan: bv.plan, headline: bv.stat, sub: `${formatSpeed(bv.plan.speed_mbps)} for the lowest price per 100Mbps.` }));
  add(esim);

  return (
    <>
      <Hero country={country} />
      <main className="mx-auto max-w-7xl space-y-12 px-4 pb-28 pt-4 md:pb-16">
        {slides.length > 0 && (
          <div>
            <h2 className="mb-3 px-1 text-[26px] font-bold tracking-tight">Best plans for you in {COUNTRIES[country].label}</h2>
            <HeroCarousel slides={slides} />
          </div>
        )}

        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {TILES.map((t, i) => (
            <li key={t.kind} className="rise" style={{ "--i": i + 3 } as React.CSSProperties}>
              <Link href={kindPath(country, t.kind)} className="press lift flex h-full flex-col gap-6 rounded-[22px] bg-surface p-4 shadow-card">
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

        {post.length > 0 && <PickTabs title="Postpaid, by what matters to you" groups={post} seeAllHref={kindPath(country, "postpaid")} />}
        {pre.length > 0 && <PickTabs title="Prepaid, by what matters to you" groups={pre} seeAllHref={kindPath(country, "prepaid")} />}
        {bb.length > 0 && <PickTabs title="Home fibre, by what matters to you" groups={bb} seeAllHref={kindPath(country, "broadband")} />}
        {post.length + pre.length + bb.length === 0 && <p className="px-1 text-label-2">No plans available yet — check back soon.</p>}

        <p className="px-1 text-xs leading-relaxed text-label-3">
          Picks are ranked automatically from live prices and specs (for example, price per GB), not by who pays us. Always confirm details with the provider.
        </p>
        <FaqSection faqs={faqsFor(country, "mobile")} />
      </main>
      <Footer />
    </>
  );
}
