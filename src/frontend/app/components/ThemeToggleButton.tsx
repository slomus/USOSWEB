"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeToggleButton() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`
        w-56 flex items-center gap-2 px-4 py-2 rounded-full
        bg-[var(--color-accent)] text-[#dfd4ca] hover:text-[var(--color-text-secondary)] font-medium
        transition-colors duration-300
        shadow-md hover:bg-[var(--color-bg)]
        focus:outline-none
        relative overflow-hidden
      `}
      aria-label="Zmień motyw"
    >
      <span
        className={`
          flex items-center justify-center w-6 h-6 rounded-full
          bg-white/10 text-yellow-300
          transition-transform duration-500
          ${isDark ? "translate-x-0 rotate-0" : "translate-x-4 rotate-180"}
        `}
      >
        {isDark ? (
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
            <path
              d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"
              fill="currentColor"
            />
          </svg>
        ) : (
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="5" fill="currentColor" />
            <g stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </g>
          </svg>
        )}
      </span>
      <span className="ml-5">
        {isDark ? "Tryb jasny" : "Tryb ciemny"}
      </span>
    </button>
  );
}
