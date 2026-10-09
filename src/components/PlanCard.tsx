import { formatContract, formatData, formatPrice, formatSpeed, formatTalktime } from "@/lib/currency";
import type { PlanWithProvider } from "@/types/database";
import { DealBadge } from "./DealBadge";
import { ProviderLogo } from "./ProviderLogo";

interface Props {
  plan: PlanWithProvider;
  /** Omit to hide the compare checkbox. */
  compare?: { selected: boolean; disabled: boolean; onToggle: () => void };
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-sm font-bold">{value}</dd>
    </div>
  );
}

export function PlanCard({ plan, compare }: Props) {
  const isBroadband = plan.category === "broadband";
  return (
    <article className={`flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${compare?.selected ? "border-sifu-gold ring-2 ring-sifu-gold/30" : "border-slate-200"}`}>
      <header className="flex items-center gap-3">
        <ProviderLogo provider={plan.provider} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-500">{plan.provider.name}</p>
          <h3 className="truncate font-bold">{plan.title}</h3>
        </div>
        {compare && (
          <label className={`flex items-center gap-1.5 text-xs font-medium ${compare.disabled && !compare.selected ? "opacity-40" : "cursor-pointer"}`}>
            <input
              type="checkbox"
              className="size-4 accent-sifu-gold"
              checked={compare.selected}
              disabled={compare.disabled && !compare.selected}
              onChange={compare.onToggle}
            />
            Compare
          </label>
        )}
      </header>

      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-extrabold text-sifu-gold">{formatPrice(plan.monthly_price, plan.currency)}</span>
        <span className="text-sm text-slate-500">/ month</span>
        <span className="ml-auto rounded-full bg-sifu-navy px-2 py-0.5 text-[11px] font-bold text-white">{plan.currency}</span>
      </div>

      <dl className="grid grid-cols-2 gap-2">
        {isBroadband ? <Spec label="Speed" value={formatSpeed(plan.speed_mbps)} /> : <Spec label="Data" value={formatData(plan.data_gb)} />}
        {isBroadband ? <Spec label="Data" value={plan.data_gb === null ? "Unlimited" : formatData(plan.data_gb)} /> : <Spec label="Calls / SMS" value={formatTalktime(plan)} />}
        <Spec label="Contract" value={formatContract(plan.contract_months)} />
        <Spec label="Type" value={plan.category === "mobile_prepaid" ? "Prepaid" : plan.category === "mobile_postpaid" ? "Postpaid" : "Home fibre"} />
      </dl>

      {plan.promotion_badge && <DealBadge text={plan.promotion_badge} />}

      {plan.features.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {plan.features.map((f) => (
            <li key={f} className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-600">✓ {f}</li>
          ))}
        </ul>
      )}

      <a
        href={`/api/redirect?plan_id=${encodeURIComponent(plan.id)}`}
        rel="sponsored nofollow noopener"
        target="_blank"
        className="mt-auto rounded-xl bg-sifu-gold px-4 py-3 text-center font-bold text-white transition hover:bg-sifu-gold-dark"
      >
        Get Deal →
      </a>
    </article>
  );
}
