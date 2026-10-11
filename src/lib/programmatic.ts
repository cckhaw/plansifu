import { formatData, formatPrice, formatSpeed } from "@/lib/currency";
import type { Faq } from "@/components/seo/JsonLdFaq";
import { COUNTRIES } from "@/lib/currency";
import type { Country, PlanWithProvider } from "@/types/database";

/** A programmatic landing page needs at least this many matching plans, or it is thin content and returns 404. */
export const MIN_PLANS_FOR_PAGE = 3;

export interface FeatureDef {
  slug: string;
  /** "Unlimited Data" in "Best Unlimited Data Mobile Plans in Singapore" */
  qualifier: string;
  /** What the filter means, in a few words ("with no monthly data cap"). */
  means: string;
  match: (p: PlanWithProvider) => boolean;
  /** Why people search for this, and what to check. Unique per page, hedged where terms vary. */
  explainer: string[];
  faqs: Faq[];
}

const text = (p: PlanWithProvider) => `${p.title} ${p.features.join(" ")} ${p.promotion_badge ?? ""}`;

export const MOBILE_FEATURES: FeatureDef[] = [
  {
    slug: "unlimited-data",
    qualifier: "Unlimited Data",
    means: "with no monthly data cap",
    match: (p) => p.data_gb !== null && p.data_gb < 0,
    explainer: [
      "Unlimited-data plans remove the monthly cap, which suits heavy video streamers, people who use their phone as a hotspot, and households with no home broadband.",
      "Before you pick one, check for a fair-use threshold or speed throttling after a certain amount of data, and whether tethering and roaming are included. Those terms differ by provider and are on the provider's plan page.",
    ],
    faqs: [
      { q: "Is unlimited data really unlimited?", a: "Usually it means no hard monthly cap, but many providers apply a fair-use policy or slow your speed after heavy use, and hotspot or roaming data can be limited separately. Read the provider's fair-use terms before you sign." },
      { q: "Do I need unlimited data?", a: "If you stream video on mobile data every day or tether a laptop, probably. Most people who use Wi-Fi at home and work use well under 100GB a month, and a large capped plan costs less." },
    ],
  },
  {
    slug: "5g",
    qualifier: "5G",
    means: "that mention 5G",
    match: (p) => /5g/i.test(text(p)),
    explainer: [
      "These plans mention 5G in their name or perks. 5G speeds depend on your phone, your location and the network's coverage, so a 5G plan is only as fast as the signal where you actually use it.",
      "Check that your phone supports 5G and the provider's bands, and look at the data allowance as well as the price: some 5G plans have lower caps than 4G ones.",
    ],
    faqs: [
      { q: "Do I need a 5G phone for a 5G plan?", a: "To use 5G speeds, yes: your phone must support 5G and the bands the provider uses. A 5G plan still works on a 4G phone, but at 4G speeds." },
      { q: "Is 5G always faster than 4G?", a: "Not always. Real speeds depend on coverage, congestion and your handset, so check the provider's coverage map for the places you use your phone most." },
    ],
  },
  {
    slug: "no-contract",
    qualifier: "No-Contract",
    means: "with no lock-in contract",
    match: (p) => p.contract_months === 0,
    explainer: [
      "No-contract plans have no minimum commitment, so you can switch provider or cancel whenever your needs change. They are usually SIM-only, so there is no subsidised phone, but you also avoid early-termination fees.",
      "They are a good fit if you change phones often, are only in the country for a while, or simply want to move to whichever provider has the best price next month.",
    ],
    faqs: [
      { q: "Are no-contract plans more expensive?", a: "Not necessarily. SIM-only plans without a device often cost the same as or less than contract plans; what you give up is a subsidised phone." },
      { q: "Can I cancel a no-contract plan any time?", a: "Normally yes, but billing cycles and notice periods still apply, so confirm the cancellation terms with the provider." },
    ],
  },
  {
    slug: "esim",
    qualifier: "eSIM",
    means: "that mention eSIM",
    match: (p) => /e-?sim/i.test(text(p)),
    explainer: [
      "An eSIM is a SIM built into your phone, so you can activate a plan without waiting for or inserting a physical card. It also lets you keep a second line on the same phone.",
      "These plans mention eSIM in their name or perks. Many other providers also support eSIM without saying so on the plan page, so check with the provider if your preferred plan is not listed here.",
    ],
    faqs: [
      { q: "Which phones support eSIM?", a: "Most recent iPhones and many recent Android phones support eSIM. The phone must also be network-unlocked. Check your phone's settings under SIM or Mobile data for an 'Add eSIM' option." },
      { q: "Can I switch my number to an eSIM?", a: "Usually yes: your provider can move your existing number to an eSIM, often from its app or a store. Ask the provider about the steps and any fee." },
    ],
  },
  {
    slug: "big-data",
    qualifier: "100GB+",
    means: "with 100GB or more of data a month",
    match: (p) => p.data_gb !== null && p.data_gb >= 100,
    explainer: [
      "Plans with 100GB or more suit heavy mobile users, families sharing one line's hotspot, and people who rely on mobile data instead of home broadband.",
      "Compare price per GB rather than the monthly price alone: a bigger plan often costs less per GB, but only pays off if you will actually use the data.",
    ],
    faqs: [
      { q: "How much data do I actually need?", a: "Streaming video uses roughly 1GB an hour in standard definition and more in HD. Most people on Wi-Fi at home and work stay well under 100GB; if you rely on mobile data all day, 100GB or more is a sensible range." },
    ],
  },
];

export interface SpeedDef {
  slug: string;
  mbps: number;
  /** "1Gbps" */
  label: string;
  explainer: string[];
  faqs: Faq[];
}

export const BROADBAND_SPEEDS: SpeedDef[] = [
  { slug: "100mbps", mbps: 100, label: "100Mbps", explainer: ["100Mbps is a sensible entry point for a small household: enough for HD video calls and streaming on a few devices at the same time.", "Because plans here are 'at least' this speed, you will also see faster plans. Sort by price to find the cheapest way in."], faqs: [{ q: "Is 100Mbps enough?", a: "For one to three people streaming, browsing and video calling, yes. Larger households, 4K streaming on several screens at once, and frequent big downloads benefit from 300Mbps or more." }] },
  { slug: "300mbps", mbps: 300, label: "300Mbps", explainer: ["300Mbps suits most families: several people streaming and working from home at once with room to spare.", "These listings include 300Mbps and faster plans, so you can see whether stepping up in speed costs much more."], faqs: [{ q: "Is 300Mbps fast enough for working from home?", a: "Yes. Video calls need only a few Mbps each, so 300Mbps comfortably covers a household of workers and streamers; upload speed and Wi-Fi quality matter more than the headline figure." }] },
  { slug: "500mbps", mbps: 500, label: "500Mbps", explainer: ["500Mbps is the middle of today's fibre range: plenty for big households, gamers and anyone moving large files.", "Listings include 500Mbps and faster plans. The price gap to 1Gbps is often small, so compare both."], faqs: [{ q: "Is 500Mbps worth it over 300Mbps?", a: "It helps when many devices are busy at once or you download large files often. For typical streaming and browsing you may not notice a difference, so compare the price gap." }] },
  { slug: "1gbps", mbps: 1000, label: "1Gbps", explainer: ["1Gbps fibre is now common and often priced close to slower tiers, which makes it a popular upgrade.", "To get close to 1Gbps on your own devices you need a router and cabling that support it: a Wi-Fi 6 router and a wired connection for the fastest devices."], faqs: [{ q: "Will I actually get 1Gbps?", a: "Over a wired connection with a suitable router you can get close to it. Over Wi-Fi, speeds depend on your router, distance and walls, and are usually lower." }, { q: "Do I need special equipment for 1Gbps?", a: "Your devices and router need gigabit ports (and ideally Wi-Fi 6). Most providers supply a compatible router, but check what is included with the plan." }] },
  { slug: "2gbps", mbps: 2000, label: "2Gbps", explainer: ["2Gbps plans target power users: home offices, creators moving big files, and busy households with many always-on devices.", "To use more than 1Gbps you need a router with a 2.5Gbps (or faster) port and devices that support it; otherwise a 1Gbps plan will feel the same."], faqs: [{ q: "Is 2Gbps overkill?", a: "For most homes, yes. It only matters if you have devices with 2.5Gbps ports or many simultaneous heavy users. Check the price gap over 1Gbps before paying extra." }] },
  { slug: "10gbps", mbps: 10000, label: "10Gbps", explainer: ["10Gbps is the top of the consumer range, aimed at enthusiasts and home labs.", "You need 10Gbps-capable networking equipment and devices to benefit from it, and plans at this speed are limited to certain areas."], faqs: [{ q: "Who needs 10Gbps?", a: "Mostly enthusiasts with 10Gbps hardware, home servers or very large file workflows. For nearly everyone, 1Gbps or less is plenty." }] },
];

export const featureBySlug = (slug: string) => MOBILE_FEATURES.find((f) => f.slug === slug);
export const speedBySlug = (slug: string) => BROADBAND_SPEEDS.find((s) => s.slug === slug);

/** The plans for a landing page, cheapest first. */
export function matchFeature(plans: PlanWithProvider[], f: FeatureDef) {
  return plans.filter(f.match).sort((a, b) => a.monthly_price - b.monthly_price);
}
export function matchSpeed(plans: PlanWithProvider[], s: SpeedDef) {
  return plans.filter((p) => (p.speed_mbps ?? 0) >= s.mbps).sort((a, b) => a.monthly_price - b.monthly_price || (b.speed_mbps ?? 0) - (a.speed_mbps ?? 0));
}

/** An intro paragraph built from the live plans, so it is specific and always true. */
export function liveIntro(opts: { country: Country; plans: PlanWithProvider[]; what: string }): string {
  const { country, plans, what } = opts;
  const cur = COUNTRIES[country].currency;
  const cheapest = plans[0];
  const prices = plans.map((p) => p.monthly_price);
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const providers = new Set(plans.map((p) => p.provider.name)).size;
  const range = lo === hi ? formatPrice(lo, cur) : `${formatPrice(lo, cur)} to ${formatPrice(hi, cur)} a month`;
  return `PlanSifu currently lists ${plans.length} ${what} from ${providers} provider${providers === 1 ? "" : "s"} in ${COUNTRIES[country].label}, priced from ${range}. The cheapest is ${cheapest.title} from ${cheapest.provider.name} at ${formatPrice(cheapest.monthly_price, cur)}${cheapest.speed_mbps ? ` (${formatSpeed(cheapest.speed_mbps)})` : cheapest.data_gb !== null ? ` (${formatData(cheapest.data_gb)})` : ""}.`;
}
