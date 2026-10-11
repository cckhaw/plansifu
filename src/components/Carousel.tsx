"use client";

import { useCallback, useRef, useState } from "react";

/** Scroll-snap carousel state: which slide is showing, and a way to scroll to one. */
export function useSnapCarousel(count: number) {
  const track = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);

  const step = useCallback(() => {
    const el = track.current;
    const first = el?.children[0] as HTMLElement | undefined;
    if (!el || !first) return 0;
    const gap = parseFloat(getComputedStyle(el).columnGap || "0") || 0;
    return first.offsetWidth + gap;
  }, []);

  const goTo = useCallback(
    (i: number) => track.current?.scrollTo({ left: Math.max(0, Math.min(count - 1, i)) * step(), behavior: "smooth" }),
    [count, step],
  );

  const onScroll = useCallback(() => {
    const s = step();
    const el = track.current;
    if (!s || !el) return;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    setIndex(atEnd ? count - 1 : Math.round(el.scrollLeft / s));
  }, [count, step]);

  return { track, index, goTo, onScroll };
}

/** iOS page control: round dots with the current page stretched into a dash. */
export function PageDots({ count, index, onSelect, label }: { count: number; index: number; onSelect: (i: number) => void; label: (i: number) => string }) {
  if (count < 2) return null;
  return (
    <div role="tablist" aria-label="Choose a slide" className="flex items-center justify-center gap-1.5">
      {Array.from({ length: count }, (_, i) => (
        <button key={i} role="tab" aria-selected={i === index} aria-label={label(i)} onClick={() => onSelect(i)} className="grid h-6 place-items-center px-0.5">
          <span className={`block h-2 rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${i === index ? "w-6 bg-label-2" : "w-2 bg-fill-strong"}`} />
        </button>
      ))}
    </div>
  );
}
