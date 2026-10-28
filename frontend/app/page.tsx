"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquareText } from "lucide-react";
import { Funnel, HBar, RetentionGrid, RevenueTrend } from "@/components/charts";
import { KpiStrip } from "@/components/kpi-strip";
import { PageHeader } from "@/components/page-header";
import { Panel, Skeleton } from "@/components/panel";
import { useApp } from "@/components/providers";
import { MapLegend, WorldMap } from "@/components/world-map";
import { api } from "@/lib/api";
import { flag, money, signed } from "@/lib/format";
import { useData } from "@/lib/use-data";

const REGIONS = ["Europe", "North America", "Asia Pacific", "Middle East", "Latin America", "Africa"];

export default function OverviewPage() {
  const { filters } = useApp();
  const router = useRouter();
  const ov = useData(() => api.overview(filters.months, filters.region), [filters.months, filters.region]);
  const coh = useData(() => api.cohorts(filters.region), [filters.region]);
  const d = ov.data;

  const launched = d?.countries.filter((c) => c.launched) ?? [];
  const movers = [...launched].sort((a, b) => (b.growth ?? -999) - (a.growth ?? -999));
  const period = d ? `${d.kpis.period.start} to ${d.kpis.period.end}` : "";

  return (
    <div className="pb-10">
      <PageHeader
        title="Global overview"
        description={d ? `Performance across ${launched.length} markets, ${period}.` : "Loading markets…"}
        live={ov.loading ? undefined : ov.live}
      />

      <div className="space-y-4 px-4 sm:space-y-5 sm:px-6 lg:px-10">
        {/* Hero: the map is the product's signature view */}
        <section className="overflow-hidden rounded-3xl border border-line bg-surface">
          <div className="grid lg:grid-cols-[1fr_300px]">
            <div className="relative p-2 sm:p-4">
              {d ? (
                <WorldMap countries={d.countries} onSelect={(c) => router.push(`/markets?c=${c.code}`)} />
              ) : (
                <Skeleton className="aspect-[16/8.2]" />
              )}
              <div className="px-3 pb-2 sm:px-2">
                <MapLegend />
              </div>
            </div>
            <div className="border-t border-line p-5 lg:border-l lg:border-t-0">
              <h2 className="font-display text-lg font-semibold">Where revenue comes from</h2>
              <ol className="mt-4 space-y-3">
                {launched.slice(0, 6).map((c, i) => (
                  <li key={c.code}>
                    <Link href={`/markets?c=${c.code}`} className="group flex items-center gap-3">
                      <span className="w-4 text-xs text-muted">{i + 1}</span>
                      <span className="text-lg" aria-hidden>{flag(c.code)}</span>
                      <span className="min-w-0 flex-1 truncate text-sm group-hover:underline">{c.name}</span>
                      <span className="text-right">
                        <span className="num block text-sm font-semibold">{money(c.revenue)}</span>
                        <span className="block text-[11px] text-muted">{c.share}% share</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
              <Link
                href="/analyst?q=Which%20markets%20are%20driving%20growth%20and%20which%20are%20slowing%20down%3F"
                className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-ink py-3 text-sm font-medium text-bg"
              >
                <MessageSquareText size={16} />
                Ask the analyst why
              </Link>
            </div>
          </div>
        </section>

        {d ? <KpiStrip kpis={d.kpis} /> : <Skeleton className="h-28" />}

        <div className="grid gap-4 sm:gap-5 xl:grid-cols-3">
          <Panel title="Revenue by region" note="Monthly revenue in USD, stacked by region" className="xl:col-span-2">
            {d ? <RevenueTrend data={d.trend} regions={REGIONS} /> : <Skeleton className="h-64" />}
          </Panel>
          <Panel title="Conversion funnel" note={`Last ${filters.months} months`}>
            {d ? <Funnel steps={d.funnel} /> : <Skeleton className="h-64" />}
          </Panel>
        </div>

        <div className="grid gap-4 sm:gap-5 xl:grid-cols-3">
          <Panel
            title="Customer retention"
            note="Share of each month's new customers who ordered again"
            className="xl:col-span-2"
          >
            {coh.data ? <RetentionGrid cohorts={coh.data} /> : <Skeleton className="h-72" />}
          </Panel>
          <div className="grid gap-4 sm:gap-5">
            <Panel title="Fastest growing" note="Revenue change vs prior period">
              <ul className="space-y-2.5">
                {movers.slice(0, 4).map((c) => (
                  <li key={c.code} className="flex items-center justify-between text-sm">
                    <span>
                      <span aria-hidden>{flag(c.code)}</span> {c.name}
                    </span>
                    <span className="num font-semibold text-teal">{signed(c.growth)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs font-medium text-muted">Slowest</p>
              <ul className="mt-2 space-y-2.5">
                {movers.slice(-2).map((c) => (
                  <li key={c.code} className="flex items-center justify-between text-sm">
                    <span>
                      <span aria-hidden>{flag(c.code)}</span> {c.name}
                    </span>
                    <span className={`num font-semibold ${(c.growth ?? 0) < 0 ? "text-rust" : "text-muted"}`}>
                      {signed(c.growth)}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>

        <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
          <Panel title="Revenue by acquisition channel">
            {d ? <HBar data={d.channels} labelKey="channel" valueKey="revenue" format={(v) => money(v)} /> : <Skeleton className="h-40" />}
          </Panel>
          <Panel title="Revenue by category">
            {d ? (
              <HBar data={d.categories} labelKey="category" valueKey="revenue" format={(v) => money(v)} color="rgb(var(--amber))" />
            ) : (
              <Skeleton className="h-40" />
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
