"use client";

import { useEffect } from "react";
import { formatContract, formatData, formatPrice, formatSpeed, formatTalktime } from "@/lib/currency";
import type { PlanWithProvider } from "@/types/database";
import { CloseIcon } from "./Icons";
import { ProviderLogo } from "./ProviderLogo";

/** Side-by-side comparison: a bottom sheet on phones, a centred card on larger screens. */
export function ComparisonTable({ plans, onClose }: { plans: PlanWithProvider[]; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const rows: { label: string; render: (p: PlanWithProvider) => React.ReactNode }[] = [
    { label: "Monthly price", render: (p) => <strong className="text-[20px] font-bold tracking-tight tabular-nums">{formatPrice(p.monthly_price, p.currency)}</strong> },
    { label: "Data", render: (p) => formatData(p.data_gb) },
    { label: "Speed", render: (p) => formatSpeed(p.speed_mbps) },
    { label: "Calls / SMS", render: (p) => formatTalktime(p) },
    { label: "Contract", render: (p) => formatContract(p.contract_months) },
    { label: "Perks", render: (p) => (p.features.length ? p.features.join(", ") : "—") },
    { label: "Promo", render: (p) => p.promotion_badge ?? "—" },
  ];

  return (
    <div role="dialog" aria-modal="true" aria-label="Compare plans" className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
      <div className="fade-in absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="sheet md:pop relative max-h-[92vh] w-full max-w-4xl overflow-auto rounded-t-[28px] bg-surface p-5 shadow-2xl md:rounded-[28px] md:p-7">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-fill-strong md:hidden" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[24px] font-bold tracking-tight">Compare</h2>
          <button onClick={onClose} className="press grid size-8 place-items-center rounded-full bg-fill-strong text-label-2" aria-label="Close"><CloseIcon className="size-4" /></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-[15px]">
            <thead>
              <tr>
                <th className="w-28 p-2" />
                {plans.map((p) => (
                  <th key={p.id} className="p-2 text-left align-top">
                    <div className="flex items-center gap-2.5">
                      <ProviderLogo provider={p.provider} size={36} />
                      <div>
                        <div className="text-[12px] font-medium text-label-2">{p.provider.name}</div>
                        <div className="font-semibold tracking-tight">{p.title}</div>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-t border-sep">
                  <th scope="row" className="p-2.5 text-left text-[13px] font-medium text-label-3">{r.label}</th>
                  {plans.map((p) => <td key={p.id} className="p-2.5 align-top">{r.render(p)}</td>)}
                </tr>
              ))}
              <tr className="border-t border-sep">
                <td />
                {plans.map((p) => (
                  <td key={p.id} className="p-2.5">
                    <a href={`/api/redirect?plan_id=${encodeURIComponent(p.id)}`} target="_blank" rel="sponsored nofollow noopener" className="press block rounded-full bg-accent-fill px-3 py-2.5 text-center text-[15px] font-semibold text-accent-on-fill hover:bg-accent-fill-hover">
                      Apply Now
                    </a>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
