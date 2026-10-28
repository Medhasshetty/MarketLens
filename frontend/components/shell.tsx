"use client";

import clsx from "clsx";
import { FileText, Globe2, Map as MapIcon, MessageSquareText, Moon, Rocket, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "./providers";

const NAV = [
  { href: "/", label: "Overview", icon: Globe2 },
  { href: "/markets", label: "Markets", icon: MapIcon },
  { href: "/expansion", label: "Expansion", icon: Rocket },
  { href: "/analyst", label: "AI analyst", icon: MessageSquareText },
  { href: "/reports", label: "Reports", icon: FileText },
];

function Logo() {
  return (
    <span className="flex items-center gap-2">
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <circle cx="16" cy="16" r="13" fill="none" stroke="rgb(var(--ink))" strokeWidth="2" />
        <ellipse cx="16" cy="16" rx="6" ry="13" fill="none" stroke="rgb(var(--ink))" strokeWidth="1.4" opacity=".5" />
        <path d="M3 16h26" stroke="rgb(var(--ink))" strokeWidth="1.4" opacity=".5" />
        <circle cx="21" cy="11" r="3.2" fill="rgb(var(--amber))" />
      </svg>
      <span className="font-display text-lg font-semibold tracking-tight">MarketLens</span>
    </span>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { theme, toggleTheme } = useApp();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <div className="min-h-dvh lg:flex">
      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
        <Link href="/" className="px-2">
          <Logo />
        </Link>
        <nav className="mt-10 flex flex-col gap-1" aria-label="Main">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active(href) ? "bg-ink text-bg font-medium" : "text-muted hover:bg-raised hover:text-ink",
              )}
            >
              <Icon size={18} strokeWidth={1.8} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-3 px-2">
          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-lg px-1 py-2 text-sm text-muted hover:text-ink"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <p className="text-xs leading-relaxed text-muted">Demo data for a D2C beauty brand in 18 countries.</p>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="pt-safe sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Logo />
          <button onClick={toggleTheme} aria-label="Switch colour theme" className="rounded-full p-2 text-muted">
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      <main className="min-w-0 flex-1 pb-24 lg:pb-0">{children}</main>

      {/* Mobile tab bar */}
      <nav
        aria-label="Main"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
      >
        <div className="grid grid-cols-5">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex flex-col items-center gap-1 py-2.5 text-[11px]",
                active(href) ? "text-ink font-medium" : "text-muted",
              )}
            >
              <span className={clsx("rounded-full px-4 py-1", active(href) && "bg-amber/20")}>
                <Icon size={20} strokeWidth={active(href) ? 2.2 : 1.8} />
              </span>
              {label === "AI analyst" ? "Analyst" : label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
