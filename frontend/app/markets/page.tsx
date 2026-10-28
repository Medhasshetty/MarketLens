"use client";

import clsx from "clsx";
import { ArrowDown, ArrowUp, MessageSquareText, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Change } from "@/components/kpi-strip";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/panel";
import { useApp } from "@/components/providers";
import { api } from "@/lib/api";
import { flag, int, money, pct, signed } from "@/lib/format";
import type { Country } from "@/lib/types";
import { useData } from "@/lib/use-data";

type SortKey = "revenue" | "growth" | "aov" | "repeat_rate" | "conversion";
const COLS: { key: SortKey; label: string }[] = [
  { key: "revenue", label: "Revenue" },
  { key: "growth", label: "Growth" },
  { key: "aov", label: "AOV" },
  { key: "repeat_rate", label: "Repeat orders" },
  { key: "conversion", label: "Conversion" },
];

export default function MarketsPage() {
  return (
    <Suspense>
      <Markets />
    </Suspense>
  );
}

function Markets() {
  const { filters } = useApp();
  const params = useSearchParams();
  const router = useRouter();
  const { data, live, loading } = useData(() => api.overview(filters.months, filters.region), [filters.months, filters.region]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "revenue", dir: -1 });
  const [showCandidates, setShowCandidates] = useState(false);

  const rows = useMemo(() => {
    const list = (data?.countries ?? []).filter(
      (c) => (showCandidates || c.launched) && c.name.toLowerCase().includes(q.toLowerCase()),
    );
    return list.sort((a, b) => ((a[sort.key] ?? -1e9) - (b[sort.key] ?? -1e9)) * sort.dir);
  }, [data, q, sort, showCandidates]);

  const selected = data?.countries.find((c) => c.code === params.get("c")) ?? null;
  const select = (c: Country | null) => router.replace(c ? `/markets?c=${c.code}` : "/markets", { scroll: false });
  const toggleSort = (key: SortKey) => setSort((s) => ({ key, dir: s.key === key ? ((s.dir * -1) as 1 | -1) : -1 }));
  const avg = data?.kpis;

  return (
    <div className="pb-10">
      <PageHeader title="Markets" description="Compare every market on the same metrics. Select one for detail." live={loading ? undefined : live} />

      <div className="px-4 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1 sm:max-w-sm">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search markets"
              className="w-full rounded-full border border-line bg-surface py-2.5 pl-10 pr-4 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={showCandidates} onChange={(e) => setShowCandidates(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--teal))]" />
            Show markets we haven't launched in
          </label>
        </div>

        {/* Mobile sort chips */}
        <div className="scroll-x -mx-4 mt-4 flex gap-2 px-4 lg:hidden">
          {COLS.map((c) => (
            <button
              key={c.key}
              onClick={() => toggleSort(c.key)}
              className={clsx(
                "flex shrink-0 items-center gap-1 rounded-full border px-3.5 py-1.5 text-xs",
                sort.key === c.key ? "border-ink bg-ink text-bg" : "border-line text-muted",
              )}
            >
              {c.label}
              {sort.key === c.key && (sort.dir === -1 ? <ArrowDown size={12} /> : <ArrowUp size={12} />)}
            </button>
          ))}
        </div>

        {loading && !data ? (
          <Skeleton className="mt-4 h-96" />
        ) : (
          <>
            {/* Desktop table */}
            <div className="mt-5 hidden overflow-hidden rounded-2xl border border-line bg-surface lg:block">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-raised text-left text-muted">
                  <tr>
                    <th className="px-5 py-3 font-medium">Market</th>
                    {COLS.map((c) => (
                      <th key={c.key} className="px-4 py-3 text-right font-medium">
                        <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 hover:text-ink" aria-label={`Sort by ${c.label}`}>
                          {c.label}
                          {sort.key === c.key && (sort.dir === -1 ? <ArrowDown size={13} /> : <ArrowUp size={13} />)}
                        </button>
                      </th>
                    ))}
                    <th className="px-5 py-3 text-right font-medium">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr
                      key={c.code}
                      onClick={() => select(c)}
                      className={clsx(
                        "cursor-pointer border-b border-line/60 last:border-0 hover:bg-raised",
                        selected?.code === c.code && "bg-amber/10",
                      )}
                    >
                      <td className="px-5 py-3.5">
                        <span className="mr-2" aria-hidden>{flag(c.code)}</span>
                        <span className="font-medium">{c.name}</span>
                        <span className="ml-2 text-xs text-muted">{c.region}</span>
                        {!c.launched && <span className="ml-2 rounded-full bg-teal/15 px-2 py-0.5 text-xs text-teal">Candidate</span>}
                      </td>
                      <td className="num px-4 text-right font-semibold">{c.launched ? money(c.revenue) : "–"}</td>
                      <td className={clsx("num px-4 text-right", (c.growth ?? 0) >= 0 ? "text-teal" : "text-rust")}>{signed(c.growth)}</td>
                      <td className="num px-4 text-right">{c.aov ? `$${c.aov.toFixed(2)}` : "–"}</td>
                      <td className="num px-4 text-right">{c.launched ? pct(c.repeat_rate) : "–"}</td>
                      <td className="num px-4 text-right">{pct(c.conversion, 2)}</td>
                      <td className="px-5">
                        <div className="ml-auto flex w-24 items-center gap-2">
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-raised">
                            <span className="block h-full bg-amber" style={{ width: `${Math.min(100, c.share * 3)}%` }} />
                          </span>
                          <span className="num w-9 text-right text-xs text-muted">{c.share}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <ul className="mt-4 space-y-2.5 lg:hidden">
              {rows.map((c) => (
                <li key={c.code}>
                  <button onClick={() => select(c)} className="w-full rounded-2xl border border-line bg-surface p-4 text-left active:bg-raised">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl" aria-hidden>{flag(c.code)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{c.name}</p>
                        <p className="text-xs text-muted">{c.launched ? c.region : "Not launched"}</p>
                      </div>
                      <div className="text-right">
                        <p className="num text-lg font-semibold">{c.launched ? money(c.revenue) : "–"}</p>
                        <p className={clsx("num text-xs", (c.growth ?? 0) >= 0 ? "text-teal" : "text-rust")}>{signed(c.growth)}</p>
                      </div>
                    </div>
                    {c.launched ? (
                      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-xs">
                        <Stat label="AOV" value={c.aov ? `$${c.aov.toFixed(0)}` : "–"} />
                        <Stat label="Repeat" value={pct(c.repeat_rate)} />
                        <Stat label="Conversion" value={pct(c.conversion, 2)} />
                      </div>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
            {rows.length === 0 && (
              <p className="mt-10 text-center text-sm text-muted">No markets match “{q}”. Try another name or clear the search.</p>
            )}
          </>
        )}
      </div>

      {selected && avg && <MarketDetail c={selected} avgConversion={avg.conversion.value} avgAov={avg.aov.value} onClose={() => select(null)} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted">{label}</p>
      <p className="num mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}

function MarketDetail({ c, avgConversion, avgAov, onClose }: { c: Country; avgConversion: number; avgAov: number; onClose: () => void }) {
  const convGap = c.conversion != null ? ((c.conversion - avgConversion) / avgConversion) * 100 : null;
  const aovGap = c.aov != null ? ((c.aov - avgAov) / avgAov) * 100 : null;
  const question = c.launched
    ? `Give me a full performance diagnosis of ${c.name}: growth drivers, retention, conversion vs other markets, and what to do next.`
    : `Should we launch in ${c.name}? Compare it with our current markets and suggest an entry plan.`;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`${c.name} details`}>
      <button className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Close details" />
      <aside className="pb-safe absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-surface p-5 sm:p-6 lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-[420px] lg:rounded-none lg:rounded-l-3xl">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line lg:hidden" />
        <div className="flex items-start justify-between">
          <div>
            <p className="text-4xl" aria-hidden>{flag(c.code)}</p>
            <h2 className="mt-2 font-display text-2xl font-semibold">{c.name}</h2>
            <p className="text-sm text-muted">
              {c.region}, sells in {c.currency}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-muted hover:bg-raised">
            <X size={20} />
          </button>
        </div>

        {c.launched ? (
          <>
            <div className="mt-6 rounded-2xl bg-raised p-4">
              <p className="text-sm text-muted">Revenue</p>
              <p className="num text-3xl font-semibold text-amber">{money(c.revenue, false)}</p>
              <Change v={c.growth} />
              <p className="mt-1 text-xs text-muted">{c.share}% of total revenue</p>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Detail label="Orders" value={int(c.orders)} />
              <Detail label="Customers" value={int(c.customers)} />
              <Detail label="Avg order value" value={c.aov ? `$${c.aov.toFixed(2)}` : "–"} note={aovGap != null ? `${signed(aovGap)} vs average` : undefined} />
              <Detail label="Repeat orders" value={pct(c.repeat_rate)} />
              <Detail label="Conversion" value={pct(c.conversion, 2)} note={convGap != null ? `${signed(convGap)} vs average` : undefined} />
              <Detail label="Carts reaching checkout" value={pct(c.cart_to_checkout)} />
            </dl>
          </>
        ) : (
          <p className="mt-6 rounded-2xl bg-teal/10 p-4 text-sm leading-relaxed">
            You don't sell in {c.name} yet. See how it scores against other candidates on the Expansion page, or ask the analyst for an entry plan.
          </p>
        )}

        <div className="mt-6 grid gap-2">
          <Link href={`/analyst?q=${encodeURIComponent(question)}`} className="flex items-center justify-center gap-2 rounded-xl bg-ink py-3 text-sm font-medium text-bg">
            <MessageSquareText size={16} />
            {c.launched ? `Diagnose ${c.name}` : `Ask about launching in ${c.name}`}
          </Link>
          {!c.launched && (
            <Link href="/expansion" className="rounded-xl border border-line py-3 text-center text-sm">
              Compare expansion candidates
            </Link>
          )}
        </div>
      </aside>
    </div>
  );
}

function Detail({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-line p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="num mt-1 text-lg font-semibold">{value}</dd>
      {note && <dd className="text-[11px] text-muted">{note}</dd>}
    </div>
  );
}
