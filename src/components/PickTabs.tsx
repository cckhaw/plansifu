"use client";

import Link from "next/link";
import { useState } from "react";
import type { PickGroup } from "@/lib/picks";
import { ChevronIcon } from "./Icons";
import { PlanCard } from "./PlanCard";

/** "Best for ..." groups as a row of chips; picking one swaps in its top plans. */
export function PickTabs({ title, groups, seeAllHref, seeAllLabel = "See all" }: { title: string; groups: PickGroup[]; seeAllHref?: string; seeAllLabel?: string }) {
  const [id, setId] = useState(groups[0]?.id);
  const active = groups.find((g) => g.id === id) ?? groups[0];
  if (!active) return null;

  return (
    <section aria-label={title}>
      <div className="mb-3 flex items-end justify-between px-1">
        <h2 className="text-[22px] font-bold tracking-tight md:text-[26px]">{title}</h2>
        {seeAllHref && (
          <Link href={seeAllHref} className="press inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[15px] font-medium text-accent">
            {seeAllLabel} <ChevronIcon className="size-4" />
          </Link>
        )}
      </div>

      <div role="tablist" aria-label={`${title}: pick a goal`} className="no-scrollbar -mx-4 mb-1 flex gap-2 overflow-x-auto px-4 py-1">
        {groups.map((g) => (
          <button key={g.id} role="tab" aria-selected={g.id === active.id} onClick={() => setId(g.id)} className={`press shrink-0 rounded-full px-4 py-2 text-[15px] font-semibold transition-colors ${g.id === active.id ? "bg-label text-bg" : "bg-surface text-label-2 shadow-card hover:text-label"}`}>
            {g.label}
          </button>
        ))}
      </div>
      <p className="mb-4 px-1 text-[14px] text-label-2">{active.blurb}</p>

      <div key={active.id} className="grid gap-4 md:grid-cols-3">
        {active.items.map((it, i) => (
          <PlanCard key={it.plan.id} plan={it.plan} index={i} callout={it.stat} rank={i + 1} />
        ))}
      </div>
    </section>
  );
}
