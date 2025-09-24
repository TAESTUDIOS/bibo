// components/ThemeClient.tsx
// Applies the Tailwind dark class to <html> based on Zustand theme and persists it.

"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

export default function ThemeClient() {
  const { theme, setTheme, loadSettings } = useAppStore();

  // On mount, set initial theme from localStorage to avoid FOUC,
  // then load server settings (Neon) to override if available.
  useEffect(() => {
    try {
      const stored = localStorage.getItem("psa_theme");
      if (stored === "light" || stored === "dark") setTheme(stored);
    } catch {}
    // Also fetch saved settings from the server
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply theme to <html> and persist
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    try {
      localStorage.setItem("psa_theme", theme);
    } catch {}
  }, [theme]);

  return null; // no UI
}
