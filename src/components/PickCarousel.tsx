"use client";

import Link from "next/link";
import type { PickGroup } from "@/lib/picks";
import { formatPrice } from "@/lib/currency";
import { PageDots, useSnapCarousel } from "./Carousel";
import { ChevronIcon } from "./Icons";
import { ProviderLogo } from "./ProviderLogo";

/**
 * "Best for ..." picks. One swipeable card per goal listing its top plans, with an iOS page control
 * underneath, so the whole block stays about one card tall on a phone.
 */
export function PickCarousel({ title, groups, seeAllHref, seeAllLabel = "See all", compact }: { title: string; groups: PickGroup[]; seeAllHref?: string; seeAllLabel?: string; /** Narrower container (next to the filter sidebar): fewer cards per row. */ compact?: boolean }) {
  const { track, index, goTo, onScroll } = useSnapCarousel(groups.length);
  if (!groups.length) return null;
  const width = compact ? "w-[86%] sm:w-[60%] md:w-[calc((100%-1rem)/2)]" : "w-[86%] sm:w-[60%] md:w-[calc((100%-2rem)/3)]";

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

      <ul ref={track} onScroll={onScroll} aria-roledescription="carousel" className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:gap-4" style={{ scrollPaddingInline: "1rem" }}>
        {groups.map((g, gi) => (
          <li key={g.id} aria-roledescription="slide" aria-label={`${gi + 1} of ${groups.length}: ${g.label}`} className={`${width} shrink-0 snap-start`}>
            <div className="flex h-full flex-col rounded-[22px] bg-surface p-4 shadow-card">
              <h3 className="text-[17px] font-bold tracking-tight">{g.label}</h3>
              <p className="mb-2 line-clamp-2 min-h-[2.6em] text-[13px] leading-snug text-label-2">{g.blurb}</p>
              <ol className="divide-y divide-sep">
                {g.items.map((it, i) => (
                  <li key={it.plan.id}>
                    <a href={`/api/redirect?plan_id=${encodeURIComponent(it.plan.id)}`} target="_blank" rel="sponsored nofollow noopener" className="press -mx-2 flex items-center gap-3 rounded-[14px] px-2 py-2.5 hover:bg-fill">
                      <span className={`grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${i === 0 ? "bg-accent-fill text-accent-on-fill" : "bg-fill-strong text-label-2"}`}>{i + 1}</span>
                      <ProviderLogo provider={it.plan.provider} size={36} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] text-label-2">{it.plan.provider.name}</span>
                        <span className="block truncate text-[15px] font-semibold tracking-tight">{it.plan.title}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-[15px] font-bold tabular-nums">{formatPrice(it.plan.monthly_price, it.plan.currency)}</span>
                        <span className="block text-[12px] font-medium tabular-nums text-accent">{it.stat}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-2">
        <PageDots count={groups.length} index={index} onSelect={goTo} label={(i) => `Show ${groups[i].label}`} />
      </div>
    </section>
  );
}
