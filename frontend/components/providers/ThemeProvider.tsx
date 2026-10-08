"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "theme";
// Native "storage" events only fire in *other* tabs; this lets the tab
// that made the change update its own useSyncExternalStore snapshot too.
const LOCAL_CHANGE_EVENT = "theme-provider:local-change";

function getStoredTheme(): Theme {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "dark" || stored === "light" ? stored : "system";
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getServerTheme(): Theme {
  return "system";
}

function getServerSystemTheme(): ResolvedTheme {
  return "light";
}

function subscribeStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(LOCAL_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(LOCAL_CHANGE_EVENT, onChange);
  };
}

function subscribeSystem(onChange: () => void) {
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // useSyncExternalStore (not effect+setState) because the source of truth
  // — localStorage and the OS colour-scheme media query — lives outside
  // React; this is the API React ships specifically for that.
  const theme = useSyncExternalStore(
    subscribeStorage,
    getStoredTheme,
    getServerTheme
  );
  const systemTheme = useSyncExternalStore(
    subscribeSystem,
    getSystemTheme,
    getServerSystemTheme
  );
  const resolvedTheme: ResolvedTheme = theme === "system" ? systemTheme : theme;

  // The inline script in the root layout already set data-theme correctly
  // for first paint; this just keeps that external DOM attribute in sync
  // with later in-app theme changes.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((next: Theme) => {
    if (next === "system") {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
    window.dispatchEvent(new Event(LOCAL_CHANGE_EVENT));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
