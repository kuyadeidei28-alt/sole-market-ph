"use client";

import { useEffect, useState } from "react";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("sole-market-theme");
    const initial = saved === "dark";
    setDark(initial);
    document.documentElement.dataset.theme = initial ? "dark" : "light";
    setReady(true);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    window.localStorage.setItem("sole-market-theme", next ? "dark" : "light");
  }

  return <>
    {children}
    <button
      type="button"
      className="theme-switch"
      onClick={toggleTheme}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      suppressHydrationWarning
    >
      <span aria-hidden="true">{dark ? "☀" : "☾"}</span>
      <span className="theme-switch-label">{dark ? "Light mode" : "Dark mode"}</span>
    </button>
  </>;
}
