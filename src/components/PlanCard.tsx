import { formatContract, formatData, formatPrice, formatSpeed, formatTalktime } from "@/lib/currency";
import type { PlanWithProvider } from "@/types/database";
import { DealBadge } from "./DealBadge";
import { CheckIcon } from "./Icons";
import { ProviderLogo } from "./ProviderLogo";

interface Props {
  plan: PlanWithProvider;
  /** Omit to hide the compare control. */
  compare?: { selected: boolean; disabled: boolean; onToggle: () => void };
  /** Position in the list, for the staggered entrance. */
  index?: number;
  /** The figure this plan won on, e.g. "RM0.52 / GB". */
  callout?: string;
  /** 1-based rank inside a "best for" group. */
  rank?: number;
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-fill px-2.5 py-2">
      <dt className="text-[11px] font-medium text-label-3">{label}</dt>
      <dd className="truncate text-[14px] font-semibold tracking-tight">{value}</dd>
    </div>
  );
}

export function PlanCard({ plan, compare, index = 0, callout, rank }: Props) {
  const isBroadband = plan.category === "broadband";
  return (
    <article
      className={`rise lift flex flex-col gap-3.5 rounded-[22px] bg-surface p-4 md:gap-4 md:p-5 shadow-card ${compare?.selected ? "ring-2 ring-accent-fill" : ""}`}
      style={{ "--i": index } as React.CSSProperties}
    >
      {callout && (
        <div className="-mb-1 flex items-center gap-2">
          {rank === 1 && <span className="rounded-full bg-accent-fill px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-accent-on-fill">Top pick</span>}
          <span className="rounded-full bg-tint px-2.5 py-1 text-[13px] font-semibold tabular-nums text-accent">{callout}</span>
        </div>
      )}
      <header className="flex items-center gap-3">
        <ProviderLogo provider={plan.provider} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-label-2">{plan.provider.name} · {plan.category === "mobile_prepaid" ? "Prepaid" : plan.category === "mobile_postpaid" ? "Postpaid" : "Home fibre"}</p>
          <h3 className="truncate text-[17px] font-semibold tracking-tight">{plan.title}</h3>
        </div>
        {compare && (
          <button
            type="button"
            role="checkbox"
            aria-checked={compare.selected}
            aria-label={`Compare ${plan.title}`}
            disabled={compare.disabled && !compare.selected}
            onClick={compare.onToggle}
            className={`press grid size-7 shrink-0 place-items-center rounded-full border-2 transition-colors disabled:opacity-30 ${compare.selected ? "border-accent-fill bg-accent-fill text-accent-on-fill" : "border-label-3/50 text-transparent"}`}
          >
            <CheckIcon className="size-4" />
          </button>
        )}
      </header>

      <div className="flex items-baseline gap-1.5">
        <span className="text-[34px] font-bold leading-none tracking-tight tabular-nums">{formatPrice(plan.monthly_price, plan.currency)}</span>
        <span className="text-[15px] text-label-2">/ month</span>
      </div>

      <dl className="grid grid-cols-3 gap-2">
        {isBroadband ? <Spec label="Speed" value={formatSpeed(plan.speed_mbps)} /> : <Spec label="Data" value={formatData(plan.data_gb)} />}
        {isBroadband ? <Spec label="Data" value={plan.data_gb === null ? "Unlimited" : formatData(plan.data_gb)} /> : <Spec label="Calls / SMS" value={formatTalktime(plan)} />}
        <Spec label="Contract" value={formatContract(plan.contract_months)} />
      </dl>

      {plan.promotion_badge && <DealBadge text={plan.promotion_badge} />}

      {plan.features.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {plan.features.map((f) => (
            <li key={f} className="rounded-full bg-fill px-2.5 py-1 text-xs font-medium text-label-2">{f}</li>
          ))}
        </ul>
      )}

      <a
        href={`/api/redirect?plan_id=${encodeURIComponent(plan.id)}`}
        rel="sponsored nofollow noopener"
        target="_blank"
        className="press mt-auto rounded-full bg-accent-fill px-4 py-3 text-center text-[16px] font-semibold text-accent-on-fill hover:bg-accent-fill-hover"
      >
        Get Deal
      </a>
    </article>
  );
}
