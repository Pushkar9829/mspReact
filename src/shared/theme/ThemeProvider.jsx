import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * Theme: "light" | "dark" | "system" (persisted in localStorage "msr-theme").
 * The `.dark` class is applied to <html> only while a panel is active (`usePanelTheme()` in the
 * AppShell), so the storefront keeps its light design.
 */
const KEY = "msr-theme";
const ThemeContext = createContext(null);

function readPref() {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" || v === "system" ? v : "system";
  } catch {
    return "system";
  }
}

const media = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readPref);
  const [systemDark, setSystemDark] = useState(() => Boolean(media?.matches));
  const [panelActive, setPanelActive] = useState(false);

  useEffect(() => {
    if (!media) return undefined;
    const onChange = (e) => setSystemDark(e.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  // Sync across tabs.
  useEffect(() => {
    const onStorage = (e) => e.key === KEY && setThemeState(readPref());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const resolved = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", panelActive && resolved === "dark");
    root.classList.toggle("panel", panelActive);
    root.style.colorScheme = panelActive ? resolved : "light";
  }, [panelActive, resolved]);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* private mode */
    }
  }, []);

  const value = useMemo(() => ({ theme, resolved, setTheme, panelActive, setPanelActive }), [theme, resolved, setTheme, panelActive]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

/** Call in a panel layout: enables dark mode / Inter while mounted. */
export function usePanelTheme() {
  const { setPanelActive } = useTheme();
  useEffect(() => {
    setPanelActive(true);
    return () => setPanelActive(false);
  }, [setPanelActive]);
}
