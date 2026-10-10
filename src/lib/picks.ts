import { formatData, formatPrice, formatSpeed } from "@/lib/currency";
import type { PlanWithProvider, Provider } from "@/types/database";

/** A ranked list of plans that win on one criterion ("Best value per GB", "Fastest", ...). */
export interface PickGroup {
  id: string;
  label: string;
  /** One line explaining the ranking. */
  blurb: string;
  items: { plan: PlanWithProvider; stat: string }[];
}

export type PickKind = "postpaid" | "prepaid" | "broadband";

const isUnlimited = (p: PlanWithProvider) => p.data_gb !== null && p.data_gb < 0;
const perGb = (p: PlanWithProvider) => (p.data_gb && p.data_gb > 0 ? p.monthly_price / p.data_gb : null);

/** Best first, but prefer different providers so one telco doesn't fill the whole list. */
function diversify<T extends { plan: PlanWithProvider }>(sorted: T[], n: number): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  for (const x of sorted) {
    if (out.length >= n) break;
    if (!seen.has(x.plan.provider.id)) {
      seen.add(x.plan.provider.id);
      out.push(x);
    }
  }
  for (const x of sorted) {
    if (out.length >= n) break;
    if (!out.includes(x)) out.push(x);
  }
  return out;
}

function group(id: string, label: string, blurb: string, entries: { plan: PlanWithProvider; stat: string; key: number }[], n = 3): PickGroup | null {
  const sorted = [...entries].sort((a, b) => a.key - b.key || a.plan.monthly_price - b.plan.monthly_price);
  const items = diversify(sorted, n).map(({ plan, stat }) => ({ plan, stat }));
  return items.length ? { id, label, blurb, items } : null;
}

/** Plans limited to an age group or similar: fine to list, but never a headline "best" for everyone. */
const RESTRICTED = /\b(seniors?|youths?|students?|silver|pioneer|merdeka|elderly|teens?|kids?|children)\b|16-24|60\+|55\+/i;
/** Above this a "GB" figure is effectively uncapped, which would make price per GB meaningless. */
const MAX_RANKED_GB = 300;

export function buildPicks(allPlans: PlanWithProvider[], kind: PickKind): PickGroup[] {
  const plans = allPlans.filter((p) => !RESTRICTED.test(`${p.title} ${p.features.join(" ")}`));
  const cur = plans[0]?.currency;
  const money = (n: number) => (cur ? formatPrice(Math.round(n * 100) / 100, cur) : String(n));
  const groups: (PickGroup | null)[] = [];

  if (kind === "broadband") {
    const withSpeed = plans.filter((p) => p.speed_mbps);
    groups.push(
      group("fastest", "Fastest", "Highest speed, cheapest first among equals", withSpeed.map((p) => ({ plan: p, stat: formatSpeed(p.speed_mbps), key: -(p.speed_mbps ?? 0) }))),
      group("cheapest", "Cheapest (100Mbps+)", "Lowest monthly price with at least 100Mbps", withSpeed.filter((p) => (p.speed_mbps ?? 0) >= 100).map((p) => ({ plan: p, stat: `${money(p.monthly_price)} / mo`, key: p.monthly_price }))),
      group("value", "Best value per speed", "Lowest price per 100Mbps", withSpeed.map((p) => ({ plan: p, stat: `${money(p.monthly_price / ((p.speed_mbps ?? 100) / 100))} / 100Mbps`, key: p.monthly_price / ((p.speed_mbps ?? 100) / 100) }))),
      group("nocontract", "No contract", "Cheapest with no lock-in", plans.filter((p) => p.contract_months === 0).map((p) => ({ plan: p, stat: "No contract", key: p.monthly_price }))),
    );
    return groups.filter((g): g is PickGroup => g !== null);
  }

  // Mobile (postpaid or prepaid). Prepaid packs are small, so the thresholds are lower.
  const minGb = kind === "postpaid" ? 20 : 5;
  const metered = plans.filter((p) => !isUnlimited(p) && perGb(p) !== null && (p.data_gb ?? 0) <= MAX_RANKED_GB);
  groups.push(
    group("value", "Best value per GB", `Lowest price per GB on plans with ${minGb}GB or more`, metered.filter((p) => (p.data_gb ?? 0) >= minGb).map((p) => ({ plan: p, stat: `${money(perGb(p)!)} / GB`, key: perGb(p)! }))),
    group("cheapest", "Cheapest", `Lowest price with at least ${kind === "postpaid" ? 10 : 3}GB`, plans.filter((p) => isUnlimited(p) || (p.data_gb ?? 0) >= (kind === "postpaid" ? 10 : 3)).map((p) => ({ plan: p, stat: `${money(p.monthly_price)}${kind === "postpaid" ? " / mo" : ""}`, key: p.monthly_price }))),
    group("data", "Most data", "The biggest data allowances", plans.filter((p) => p.data_gb !== null).map((p) => ({ plan: p, stat: formatData(p.data_gb), key: isUnlimited(p) || (p.data_gb ?? 0) > MAX_RANKED_GB ? -1e9 + p.monthly_price : -(p.data_gb ?? 0) }))),
    group("unlimited", "Unlimited data", "Cheapest plans with no data cap", plans.filter(isUnlimited).map((p) => ({ plan: p, stat: "Unlimited", key: p.monthly_price }))),
    group("nocontract", "No contract", "Cheapest with no lock-in", plans.filter((p) => p.contract_months === 0 && (p.data_gb ?? 0) !== 0).map((p) => ({ plan: p, stat: "No contract", key: p.monthly_price }))),
    group("perks", "Most perks", "Plans with the most extras included", plans.filter((p) => p.features.length > 0).map((p) => ({ plan: p, stat: `${p.features.length} perks`, key: -p.features.length }))),
  );
  return groups.filter((g): g is PickGroup => g !== null);
}

/** One slide in the home-page carousel. */
export interface HeroSlide {
  id: string;
  /** "Best for heavy users" */
  tag: string;
  icon: "phone" | "sim" | "wifi" | "plane";
  /** Gradient base colour. */
  color: string;
  brand: string;
  provider: Pick<Provider, "name" | "logo_url">;
  title: string;
  /** Large figure on the right, e.g. "RM0.52 / GB". */
  headline: string;
  sub: string;
  price: string;
  href: string;
  /** Link for the button. Telco plans go through the affiliate redirect. */
  cta: string;
  external: boolean;
}

export function planSlide(opts: { id: string; tag: string; icon: HeroSlide["icon"]; color: string; plan: PlanWithProvider; headline: string; sub: string }): HeroSlide {
  const { plan } = opts;
  return {
    id: opts.id,
    tag: opts.tag,
    icon: opts.icon,
    color: opts.color,
    brand: plan.provider.name,
    provider: plan.provider,
    title: plan.title,
    headline: opts.headline,
    sub: opts.sub,
    price: `${formatPrice(plan.monthly_price, plan.currency)}${plan.category === "mobile_prepaid" ? "" : " / month"}`,
    href: `/api/redirect?plan_id=${encodeURIComponent(plan.id)}`,
    cta: "Get Deal",
    external: true,
  };
}
