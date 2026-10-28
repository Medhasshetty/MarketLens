"use client";

import clsx from "clsx";
import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "./providers";

const PERIODS = [
  { value: 3, label: "3 months" },
  { value: 6, label: "6 months" },
  { value: 12, label: "12 months" },
];

export function PageHeader({
  title,
  description,
  filters = true,
  live,
  actions,
}: {
  title: string;
  description?: string;
  filters?: boolean;
  live?: boolean;
  actions?: React.ReactNode;
}) {
  const [sheet, setSheet] = useState(false);
  return (
    <div className="flex flex-col gap-4 px-4 pb-2 pt-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-10 lg:pt-10">
      <div className="min-w-0">
        <h1 className="font-display text-[1.75rem] font-semibold leading-tight tracking-tight sm:text-4xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-xl text-sm text-muted sm:text-base">{description}</p>}
        {live !== undefined && (
          <p className="mt-2 flex items-center gap-2 text-xs text-muted">
            <span className={clsx("h-2 w-2 rounded-full", live ? "bg-teal" : "bg-amber")} />
            {live ? "Live data from the MarketLens API" : "Showing demo snapshot"}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {filters && (
          <>
            <div className="hidden lg:block">
              <FilterControls />
            </div>
            <button
              onClick={() => setSheet(true)}
              className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm lg:hidden"
            >
              <SlidersHorizontal size={16} />
              <FilterSummary />
            </button>
          </>
        )}
      </div>
      {sheet && <FilterSheet onClose={() => setSheet(false)} />}
    </div>
  );
}

function FilterSummary() {
  const { filters } = useApp();
  return (
    <span>
      {filters.region === "All" ? "All regions" : filters.region}, {filters.months}m
    </span>
  );
}

function useRegions() {
  const [regions, setRegions] = useState<string[]>([]);
  useEffect(() => {
    api.regions().then((r) => setRegions(r.data));
  }, []);
  return regions;
}

function FilterControls() {
  const { filters, setFilters } = useApp();
  const regions = useRegions();
  return (
    <div className="flex items-center gap-2">
      <div className="flex rounded-full border border-line bg-surface p-1" role="group" aria-label="Period">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setFilters({ months: p.value })}
            aria-pressed={filters.months === p.value}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm transition-colors",
              filters.months === p.value ? "bg-ink text-bg" : "text-muted hover:text-ink",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <select
        aria-label="Region"
        value={filters.region}
        onChange={(e) => setFilters({ region: e.target.value })}
        className="rounded-full border border-line bg-surface px-4 py-2 text-sm"
      >
        <option value="All">All regions</option>
        {regions.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>
    </div>
  );
}

function FilterSheet({ onClose }: { onClose: () => void }) {
  const { filters, setFilters } = useApp();
  const regions = useRegions();
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
      <button className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Close filters" />
      <div className="pb-safe absolute inset-x-0 bottom-0 rounded-t-3xl bg-surface px-5 pt-3">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line" />
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Filters</h2>
          <button onClick={onClose} aria-label="Close" className="p-2 text-muted">
            <X size={20} />
          </button>
        </div>
        <p className="mt-4 text-sm font-medium">Period</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setFilters({ months: p.value })}
              className={clsx(
                "rounded-xl border py-3 text-sm",
                filters.months === p.value ? "border-ink bg-ink text-bg" : "border-line",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="mt-5 text-sm font-medium">Region</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {["All", ...regions].map((r) => (
            <button
              key={r}
              onClick={() => setFilters({ region: r })}
              className={clsx(
                "rounded-xl border px-3 py-3 text-left text-sm",
                filters.region === r ? "border-ink bg-ink text-bg" : "border-line",
              )}
            >
              {r === "All" ? "All regions" : r}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="my-5 w-full rounded-xl bg-amber py-3.5 font-medium text-navy">
          Show results
        </button>
      </div>
    </div>
  );
}
