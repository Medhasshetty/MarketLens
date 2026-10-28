"use client";

import clsx from "clsx";
import { FileText, MessageSquareText, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Panel, Skeleton } from "@/components/panel";
import { api } from "@/lib/api";
import { flag, money } from "@/lib/format";
import { useData } from "@/lib/use-data";
import { DEFAULT_WEIGHTS, FACTORS, loadWeights, PRESETS, saveWeights, type Weights } from "@/lib/weights";

export default function ExpansionPage() {
  const { data, live, loading } = useData(() => api.factors(), []);
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [compare, setCompare] = useState(false);

  useEffect(() => setWeights(loadWeights()), []);
  const update = (w: Weights) => {
    setWeights(w);
    saveWeights(w);
  };

  const total = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
  const ranked = useMemo(() => {
    return (data ?? [])
      .filter((f) => compare || !f.launched)
      .map((f) => {
        const parts = FACTORS.map((x) => ({ ...x, value: (f[x.key] * weights[x.key]) / total }));
        return { ...f, parts, score: parts.reduce((a, p) => a + p.value, 0) };
      })
      .sort((a, b) => b.score - a.score);
  }, [data, weights, total, compare]);

  const top = ranked.find((r) => !r.launched);
  const benchmark = (data ?? []).filter((f) => f.launched);
  const benchScore =
    benchmark.reduce((a, f) => a + FACTORS.reduce((s, x) => s + (f[x.key] * weights[x.key]) / total, 0), 0) /
    Math.max(1, benchmark.length);

  return (
    <div className="pb-10">
      <PageHeader
        title="Expansion opportunities"
        description="Score markets you don't sell in yet. Adjust what matters to your strategy and the ranking updates."
        filters={false}
        live={loading ? undefined : live}
      />

      <div className="grid gap-4 px-4 sm:gap-5 sm:px-6 lg:grid-cols-[340px_1fr] lg:px-10">
        <Panel title="What matters to you" note="Weights are relative and don't need to add up to 100.">
          <div className="scroll-x -mx-1 flex gap-2 px-1 pb-1">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => update(p.weights)}
                className={clsx(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs",
                  JSON.stringify(p.weights) === JSON.stringify(weights) ? "border-ink bg-ink text-bg" : "border-line text-muted hover:text-ink",
                )}
              >
                {p.name}
              </button>
            ))}
          </div>
          <div className="mt-5 space-y-5">
            {FACTORS.map((f) => (
              <label key={f.key} className="block">
                <span className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: f.color }} />
                    {f.label}
                  </span>
                  <span className="num text-muted">{Math.round((weights[f.key] / total) * 100)}%</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={weights[f.key]}
                  onChange={(e) => update({ ...weights, [f.key]: Number(e.target.value) })}
                  className="mt-2 w-full"
                  aria-describedby={`${f.key}-help`}
                />
                <span id={`${f.key}-help`} className="text-xs text-muted">
                  {f.help}
                </span>
              </label>
            ))}
          </div>
          <button onClick={() => update(DEFAULT_WEIGHTS)} className="mt-5 flex items-center gap-2 text-sm text-muted hover:text-ink">
            <RotateCcw size={14} /> Reset to balanced
          </button>
        </Panel>

        <div className="space-y-4 sm:space-y-5">
          {top && (
            <section className="rounded-3xl bg-navy p-5 text-white sm:p-7">
              <p className="text-sm text-white/70">Top recommendation with your weights</p>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="font-display text-3xl font-semibold sm:text-4xl">
                    <span aria-hidden>{flag(top.code)}</span> {top.name}
                  </h2>
                  <p className="mt-1 text-sm text-white/70">
                    Scores <span className="num text-white">{top.score.toFixed(1)}</span> against an average of{" "}
                    <span className="num text-white">{benchScore.toFixed(1)}</span> for markets you already serve.
                  </p>
                </div>
                <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                  <Link
                    href={`/analyst?q=${encodeURIComponent(`Build a market entry plan for ${top.name}: why it ranks highly, risks, which current market it most resembles, and a 90-day pilot with KPIs.`)}`}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber px-4 py-2.5 text-sm font-medium text-navy sm:flex-none"
                  >
                    <MessageSquareText size={16} /> Get entry plan
                  </Link>
                  <Link
                    href="/reports?preset=expansion"
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/30 px-4 py-2.5 text-sm sm:flex-none"
                  >
                    <FileText size={16} /> Export brief
                  </Link>
                </div>
              </div>
            </section>
          )}

          <Panel
            title="Ranking"
            note="Bar segments show how much each factor contributes to the score."
            action={
              <label className="flex shrink-0 items-center gap-2 text-xs text-muted">
                <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} className="h-4 w-4" />
                Include current markets
              </label>
            }
          >
            {!data ? (
              <Skeleton className="h-80" />
            ) : (
              <ol className="space-y-4">
                {ranked.map((r, i) => (
                  <li key={r.code} className={clsx(r.launched && "opacity-60")}>
                    <div className="flex items-baseline gap-3">
                      <span className="num w-5 text-sm text-muted">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        <span aria-hidden>{flag(r.code)}</span> {r.name}
                        {r.launched && <span className="ml-2 text-xs font-normal text-muted">live, {money(r.revenue)}</span>}
                      </span>
                      <span className="num text-lg font-semibold">{r.score.toFixed(1)}</span>
                    </div>
                    <div className="ml-8 mt-1.5 flex h-3 overflow-hidden rounded-full bg-raised" aria-hidden>
                      {r.parts.map((p) => (
                        <span key={p.key} style={{ width: `${p.value}%`, background: p.color }} title={`${p.label}: ${p.value.toFixed(1)}`} />
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
