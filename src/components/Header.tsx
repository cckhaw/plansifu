"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { COUNTRIES } from "@/lib/currency";
import { countryOfSlug, homePath, kindPath, slugOf, type Kind } from "@/lib/routes";
import type { Country } from "@/types/database";
import { HomeIcon, PhoneIcon, PlaneIcon, SimIcon, WifiIcon } from "./Icons";
import { ThemeToggle } from "./ThemeToggle";

type NavKey = "home" | "postpaid" | "prepaid" | "broadband" | "esim";

const TABS: { key: NavKey; label: string; short: string; kind: Kind | null; Icon: (p: { className?: string }) => React.ReactElement }[] = [
  { key: "home", label: "Home", short: "Home", kind: null, Icon: HomeIcon },
  { key: "postpaid", label: "Postpaid", short: "Postpaid", kind: "postpaid", Icon: PhoneIcon },
  { key: "prepaid", label: "Prepaid", short: "Prepaid", kind: "prepaid", Icon: SimIcon },
  { key: "broadband", label: "Broadband", short: "Fibre", kind: "broadband", Icon: WifiIcon },
  { key: "esim", label: "Travel eSIM", short: "eSIM", kind: "travel-esim", Icon: PlaneIcon },
];

/** Country and active tab come from the URL: /my/postpaid, /sg/broadband/1gbps, ... */
function parsePath(pathname: string): { country: Country; active: NavKey | null } {
  const [seg, kind] = pathname.split("/").filter(Boolean);
  const country = countryOfSlug(seg) ?? "MY";
  if (!pathname.split("/").filter(Boolean).length) return { country, active: "home" };
  if (!countryOfSlug(seg)) return { country, active: null };
  if (!kind) return { country, active: "home" };
  if (kind === "postpaid" || kind === "mobile") return { country, active: "postpaid" };
  if (kind === "prepaid") return { country, active: "prepaid" };
  if (kind === "broadband") return { country, active: "broadband" };
  if (kind === "travel-esim") return { country, active: "esim" };
  return { country, active: null };
}

const tabHref = (t: (typeof TABS)[number], c: Country) => (t.kind ? kindPath(c, t.kind) : homePath(c));

/** iOS segmented control: equal-width segments with a thumb that slides between them. */
function Segmented({ count, index, children, label, className = "" }: { count: number; index: number; children: React.ReactNode; label: string; className?: string }) {
  return (
    <div role="group" aria-label={label} className={`relative grid rounded-full bg-fill-strong p-0.5 text-[13px] font-semibold ${className}`} style={{ gridTemplateColumns: `repeat(${count}, 1fr)` }}>
      {index >= 0 && (
        <span
          aria-hidden
          className="absolute inset-y-0.5 left-0.5 rounded-full bg-surface shadow-[0_3px_8px_rgba(0,0,0,0.12),0_0_0_0.5px_rgba(0,0,0,0.04)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ width: `calc((100% - 4px) / ${count})`, transform: `translateX(${index * 100}%)` }}
        />
      )}
      {children}
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const params = useSearchParams();
  const { country, active } = parsePath(pathname);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (pathname.startsWith("/crawl-report")) return null;

  /** Same page in the other country: swap the /my or /sg segment and keep the query (e.g. the eSIM destination). */
  const countryHref = (c: Country) => {
    const parts = pathname.split("/").filter(Boolean);
    const rest = countryOfSlug(parts[0]) ? parts.slice(1) : [];
    const q = params.toString();
    return `/${[slugOf(c), ...rest].join("/")}${q ? `?${q}` : ""}`;
  };
  const activeIndex = TABS.findIndex((t) => t.key === active);
  const desktopTabs = TABS.filter((t) => t.key !== "home");
  const desktopIndex = desktopTabs.findIndex((t) => t.key === active);

  return (
    <>
      <header className={`header-bar material sticky top-0 z-40 border-b transition-colors duration-300 ${scrolled ? "border-sep" : "border-transparent"}`}>
        <div className="mx-auto flex h-16 md:h-20 max-w-7xl items-center gap-4 px-4">
          {/* The logo scales with the bar: 48px tall on phones, 64px from md up; the bar is light in dark mode so the navy artwork stays legible. */}
          <Link href={homePath(country)} className="press flex shrink-0 items-center" aria-label="PlanSifu home">
            <Image src="/logo.png" alt="PlanSifu 师傅" width={800} height={343} priority sizes="(min-width: 768px) 150px, 112px" className="h-12 w-auto md:h-16" />
          </Link>

          <nav aria-label="Categories" className="mx-auto hidden md:block">
            <Segmented count={desktopTabs.length} index={desktopIndex} label="Categories" className="w-[27rem]">
              {desktopTabs.map((t) => (
                <Link key={t.key} href={tabHref(t, country)} aria-current={active === t.key ? "page" : undefined} className={`press relative z-10 rounded-full px-3 py-1.5 text-center transition-colors ${active === t.key ? "text-label" : "text-label-2 hover:text-label"}`}>
                  {t.label}
                </Link>
              ))}
            </Segmented>
          </nav>

          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <Segmented count={2} index={country === "MY" ? 0 : 1} label="Country" className="w-[7.5rem]">
              {(Object.keys(COUNTRIES) as Country[]).map((c) => (
                <Link key={c} href={countryHref(c)} scroll={false} aria-label={`${COUNTRIES[c].label} (${COUNTRIES[c].currency})`} title={`${COUNTRIES[c].label} · prices in ${COUNTRIES[c].currency}`} aria-current={country === c ? "true" : undefined} className={`press relative z-10 whitespace-nowrap rounded-full px-2 py-1.5 text-center transition-colors ${country === c ? "text-label" : "text-label-2 hover:text-label"}`}>
                  {COUNTRIES[c].flag} {c}
                </Link>
              ))}
            </Segmented>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Mobile: iOS-style tab bar */}
      <nav aria-label="Categories" className="material fixed inset-x-0 bottom-0 z-40 border-t border-sep pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {TABS.map((t, i) => {
            const on = i === activeIndex;
            return (
              <li key={t.key}>
                <Link href={tabHref(t, country)} aria-current={on ? "page" : undefined} className={`press flex flex-col items-center gap-0.5 pb-1.5 pt-2 text-[10px] font-medium transition-colors ${on ? "text-accent" : "text-label-3"}`}>
                  <t.Icon className={`size-6 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${on ? "scale-110" : ""}`} />
                  {t.short}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
