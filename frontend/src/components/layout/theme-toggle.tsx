"use client";

import { MoonIcon, SunIcon } from "@/components/icons";
import { setTheme, useTheme, withThemeSweep } from "@/lib";
import type { MouseEvent } from "react";

export default function ThemeToggle() {
  const isDark = useTheme() === "dark";

  function toggle(event: MouseEvent<HTMLButtonElement>) {
    const { left, top, width, height } =
      event.currentTarget.getBoundingClientRect();
    const origin = { x: left + width / 2, y: top + height / 2 };

    withThemeSweep(() => setTheme(isDark ? "light" : "dark"), origin, !isDark);
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={toggle}
      className="v-band-focus -m-1 -mt-0.5 p-1 text-white"
    >
      <span className="sr-only">Dark mode</span>
      <MoonIcon className="size-5 sm:size-6.5 dark:hidden" />
      <SunIcon className="hidden size-5 sm:size-6.5 dark:block" />
    </button>
  );
}
