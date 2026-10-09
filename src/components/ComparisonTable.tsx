"use client";

import { useEffect } from "react";
import { formatContract, formatData, formatPrice, formatSpeed, formatTalktime } from "@/lib/currency";
import type { PlanWithProvider } from "@/types/database";
import { ProviderLogo } from "./ProviderLogo";

export function ComparisonTable({ plans, onClose }: { plans: PlanWithProvider[]; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rows: { label: string; render: (p: PlanWithProvider) => React.ReactNode }[] = [
    { label: "Monthly price", render: (p) => <strong className="text-lg text-sifu-gold">{formatPrice(p.monthly_price, p.currency)}</strong> },
    { label: "Data", render: (p) => formatData(p.data_gb) },
    { label: "Speed", render: (p) => formatSpeed(p.speed_mbps) },
    { label: "Calls / SMS", render: (p) => formatTalktime(p) },
    { label: "Contract", render: (p) => formatContract(p.contract_months) },
    { label: "Perks", render: (p) => (p.features.length ? p.features.join(", ") : "—") },
    { label: "Promo", render: (p) => p.promotion_badge ?? "—" },
  ];

  return (
    <div role="dialog" aria-modal="true" aria-label="Compare plans" className="fixed inset-0 z-50 flex items-center justify-center bg-sifu-navy/70 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Side-by-side comparison</h2>
          <button onClick={onClose} className="rounded-lg px-3 py-1 text-sm font-semibold hover:bg-slate-100" aria-label="Close">✕ Close</button>
        </div>
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-32 p-2" />
              {plans.map((p) => (
                <th key={p.id} className="p-2 text-left align-top">
                  <div className="flex items-center gap-2">
                    <ProviderLogo provider={p.provider} size={32} />
                    <div>
                      <div className="text-xs font-medium text-slate-500">{p.provider.name}</div>
                      <div className="font-bold">{p.title}</div>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-slate-100">
                <th scope="row" className="p-2 text-left font-medium text-slate-500">{r.label}</th>
                {plans.map((p) => <td key={p.id} className="p-2 align-top">{r.render(p)}</td>)}
              </tr>
            ))}
            <tr className="border-t border-slate-100">
              <td />
              {plans.map((p) => (
                <td key={p.id} className="p-2">
                  <a href={`/api/redirect?plan_id=${encodeURIComponent(p.id)}`} target="_blank" rel="sponsored nofollow noopener" className="block rounded-xl bg-sifu-gold px-3 py-2 text-center font-bold text-white hover:bg-sifu-gold-dark">
                    Apply Now
                  </a>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
