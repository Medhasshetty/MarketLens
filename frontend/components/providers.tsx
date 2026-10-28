"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Filters = { months: number; region: string };
type Ctx = {
  filters: Filters;
  setFilters: (f: Partial<Filters>) => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
};

const AppContext = createContext<Ctx | null>(null);

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [filters, setF] = useState<Filters>({ months: 12, region: "All" });
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setF(read("ml-filters", { months: 12, region: "All" }));
    const stored = read<"light" | "dark" | null>("ml-theme", null);
    const system = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(stored ?? system);
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme, ready]);

  const setFilters = useCallback((f: Partial<Filters>) => {
    setF((prev) => {
      const next = { ...prev, ...f };
      try {
        localStorage.setItem("ml-filters", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("ml-theme", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  return <AppContext.Provider value={{ filters, setFilters, theme, toggleTheme }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <Providers>");
  return ctx;
}
