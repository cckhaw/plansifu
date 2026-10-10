"use client";

import { MoonIcon, SunIcon } from "./Icons";

const KEY = "plansifu-theme";

function effectiveTheme(): "light" | "dark" {
  const set = document.documentElement.getAttribute("data-theme");
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Light/dark switch. Starts from the system setting; a manual choice is remembered on this device. */
export function ThemeToggle() {
  const toggle = () => {
    const next = effectiveTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* private mode: the choice just lasts for this visit */
    }
  };
  return (
    <button type="button" onClick={toggle} aria-label="Switch between light and dark mode" title="Light / dark mode" className="press grid size-9 shrink-0 place-items-center rounded-full bg-fill-strong text-label-2 hover:text-label">
      <SunIcon className="theme-sun size-[18px]" />
      <MoonIcon className="theme-moon size-[18px]" />
    </button>
  );
}
