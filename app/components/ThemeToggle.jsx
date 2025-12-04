"use client";

import { useEffect, useState } from "react";

const THEME_KEY = "asistencia-theme";

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const stored =
      typeof window !== "undefined" ? localStorage.getItem(THEME_KEY) : null;
    const prefersDark =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = stored || (prefersDark ? "dark" : "light");
    setTheme(initial);
    applyTheme(initial);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="fixed bottom-4 right-4 z-50 bg-white/90 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-600 shadow-lg rounded-full px-4 py-2 text-xs font-semibold flex items-center gap-2 transition hover:-translate-y-[1px] hover:shadow-xl"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Cambiar tema"
    >
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
        {isDark ? "🌙" : "☀️"}
      </span>
      <span className="hidden sm:inline">
        {isDark ? "Modo oscuro" : "Modo claro"}
      </span>
      <span className="sm:hidden">{isDark ? "Oscuro" : "Claro"}</span>
    </button>
  );
}
