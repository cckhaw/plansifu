"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { HeroSlide } from "@/lib/picks";
import { PageDots } from "./Carousel";
import { ChevronIcon, PhoneIcon, PlaneIcon, SimIcon, WifiIcon } from "./Icons";
import { ProviderLogo } from "./ProviderLogo";

const ICONS = { phone: PhoneIcon, sim: SimIcon, wifi: WifiIcon, plane: PlaneIcon };
const AUTOPLAY_MS = 6000;

/**
 * "Best for ..." carousel. Native scroll-snap (so touch swipe and trackpads feel right), a page control
 * like iOS, arrows on larger screens, and a gentle autoplay that stops on any interaction.
 */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const track = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const slideStep = useCallback(() => {
    const el = track.current;
    const first = el?.children[0] as HTMLElement | undefined;
    if (!el || !first) return 0;
    const gap = parseFloat(getComputedStyle(el).columnGap || "0") || 0;
    return first.offsetWidth + gap;
  }, []);

  const goTo = useCallback(
    (i: number) => {
      const el = track.current;
      if (!el) return;
      const clamped = Math.max(0, Math.min(slides.length - 1, i));
      el.scrollTo({ left: clamped * slideStep(), behavior: "smooth" });
    },
    [slides.length, slideStep],
  );

  const onScroll = () => {
    const step = slideStep();
    if (step) setIndex(Math.round((track.current?.scrollLeft ?? 0) / step));
  };

  useEffect(() => {
    if (paused || slides.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      const el = track.current;
      if (!el) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
      if (atEnd) el.scrollTo({ left: 0, behavior: "smooth" });
      else goTo(Math.round(el.scrollLeft / slideStep()) + 1);
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [paused, slides.length, goTo, slideStep]);

  if (!slides.length) return null;

  return (
    <section aria-roledescription="carousel" aria-label="Best plans for different needs" className="relative" onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)} onTouchStart={() => setPaused(true)} onFocus={() => setPaused(true)}>
      <ul ref={track} onScroll={onScroll} className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-1 md:gap-4" style={{ scrollPaddingInline: "1rem" }}>
        {slides.map((s, i) => {
          const Icon = ICONS[s.icon];
          return (
            <li key={s.id} aria-roledescription="slide" aria-label={`${i + 1} of ${slides.length}`} className="rise w-[86%] shrink-0 snap-start sm:w-[58%] md:w-[calc((100%-2rem)/3)]" style={{ "--i": Math.min(i, 4) } as React.CSSProperties}>
              <article
                className="lift relative flex h-full min-h-[300px] flex-col justify-between overflow-hidden rounded-[28px] p-5 text-white shadow-card"
                style={{ background: `radial-gradient(120% 90% at 100% 0%, color-mix(in srgb, ${s.color} 60%, white) 0%, transparent 55%), linear-gradient(155deg, ${s.color}, color-mix(in srgb, ${s.color} 62%, black))` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wide backdrop-blur-md">
                    <Icon className="size-4" />
                    {s.tag}
                  </span>
                </div>

                <div className="my-4">
                  <p className="text-[40px] font-bold leading-none tracking-[-0.03em] tabular-nums">{s.headline}</p>
                  <p className="mt-2 text-[15px] leading-snug text-white/85">{s.sub}</p>
                </div>

                <div>
                  <div className="mb-3 flex items-center gap-3">
                    <ProviderLogo provider={s.provider} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] text-white/80">{s.brand}</p>
                      <p className="truncate text-[16px] font-semibold tracking-tight">{s.title}</p>
                    </div>
                    <p className="shrink-0 text-right text-[15px] font-semibold tabular-nums">{s.price}</p>
                  </div>
                  {s.external ? (
                    <a href={s.href} target="_blank" rel="sponsored nofollow noopener" className="press block rounded-full bg-white px-4 py-3 text-center text-[16px] font-semibold text-[#1c1c1e]">
                      {s.cta}
                    </a>
                  ) : (
                    <Link href={s.href} className="press block rounded-full bg-white px-4 py-3 text-center text-[16px] font-semibold text-[#1c1c1e]">
                      {s.cta}
                    </Link>
                  )}
                </div>
              </article>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex items-center justify-center gap-3">
        <button onClick={() => goTo(index - 1)} aria-label="Previous" disabled={index <= 0} className="press hidden size-8 place-items-center rounded-full bg-fill-strong text-label-2 disabled:opacity-30 md:grid">
          <ChevronIcon className="size-4 rotate-180" />
        </button>
        <PageDots count={slides.length} index={index} onSelect={goTo} label={(i) => `Show ${slides[i].tag}`} />
        <button onClick={() => goTo(index + 1)} aria-label="Next" disabled={index >= slides.length - 1} className="press hidden size-8 place-items-center rounded-full bg-fill-strong text-label-2 disabled:opacity-30 md:grid">
          <ChevronIcon className="size-4" />
        </button>
      </div>
    </section>
  );
}
