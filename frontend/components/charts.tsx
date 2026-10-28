"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { money, monthLabel, REGION_COLORS } from "@/lib/format";
import type { ChartSpec, Cohort, FunnelStep, TrendPoint } from "@/lib/types";

const axis = { stroke: "rgb(var(--muted))", fontSize: 11, tickLine: false, axisLine: false } as const;

function TipBox({ active, payload, label, fmt }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium">{label}</p>
      {payload
        .slice()
        .reverse()
        .map((p: any) => (
          <p key={p.dataKey} className="flex items-center gap-2 text-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
            {p.name}: <span className="num text-ink">{fmt ? fmt(p.value) : p.value}</span>
          </p>
        ))}
    </div>
  );
}

export function RevenueTrend({ data, regions }: { data: TrendPoint[]; regions: string[] }) {
  const rows = data.map((d) => ({ ...d, label: monthLabel(d.month) }));
  const present = regions.filter((r) => data.some((d) => Number(d[r] || 0) > 0));
  return (
    <div className="h-64 sm:h-72">
      <ResponsiveContainer>
        <AreaChart data={rows} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="rgb(var(--line))" strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={24} />
          <YAxis {...axis} tickFormatter={(v) => money(v)} width={56} />
          <Tooltip content={<TipBox fmt={(v: number) => money(v)} />} />
          {present.map((r) => (
            <Area
              key={r}
              type="monotone"
              dataKey={r}
              name={r}
              stackId="1"
              stroke={REGION_COLORS[r]}
              fill={REGION_COLORS[r]}
              fillOpacity={0.55}
              strokeWidth={1.5}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
        {present.map((r) => (
          <span key={r} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: REGION_COLORS[r] }} />
            {r}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Funnel({ steps }: { steps: FunnelStep[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => {
        const prev = steps[i - 1];
        const stepRate = prev ? (s.value / prev.value) * 100 : null;
        return (
          <li key={s.step}>
            <div className="flex items-baseline justify-between text-sm">
              <span>{s.step}</span>
              <span className="num font-semibold">{s.value.toLocaleString("en-US")}</span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-raised">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(2, Math.sqrt(s.pct / 100) * 100)}%`,
                  background: i === steps.length - 1 ? "rgb(var(--amber))" : "rgb(var(--teal))",
                }}
              />
            </div>
            {stepRate != null && (
              <p className="mt-1 text-xs text-muted">
                {stepRate.toFixed(1)}% continue from the previous step
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function RetentionGrid({ cohorts }: { cohorts: Cohort[] }) {
  const max = Math.max(1, ...cohorts.flatMap((c) => c.retention.slice(1)));
  const periods = cohorts[0]?.retention.length ?? 0;
  return (
    <div className="scroll-x">
      <table className="w-full min-w-[520px] border-separate border-spacing-1 text-xs">
        <thead>
          <tr className="text-muted">
            <th className="text-left font-normal">Cohort</th>
            <th className="text-right font-normal">New</th>
            {Array.from({ length: periods - 1 }, (_, i) => (
              <th key={i} className="font-normal">
                Month {i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((c) => (
            <tr key={c.cohort}>
              <td className="whitespace-nowrap pr-2 text-muted">{monthLabel(c.cohort)}</td>
              <td className="num pr-2 text-right">{c.size.toLocaleString("en-US")}</td>
              {c.retention.slice(1).map((v, i) => (
                <td
                  key={i}
                  className="num rounded-md py-2 text-center"
                  style={{
                    background: `rgb(var(--teal) / ${0.08 + (v / max) * 0.8})`,
                    color: v / max > 0.55 ? "white" : "rgb(var(--ink))",
                  }}
                >
                  {v.toFixed(0)}%
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function HBar({
  data,
  labelKey,
  valueKey,
  format = (v: number) => v.toLocaleString("en-US"),
  color = "rgb(var(--teal))",
}: {
  data: Record<string, any>[];
  labelKey: string;
  valueKey: string;
  format?: (v: number) => string;
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d[valueKey]));
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d[labelKey]} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[9rem_1fr_auto]">
          <span className="truncate text-muted">{d[labelKey]}</span>
          <span className="h-2 overflow-hidden rounded-full bg-raised">
            <span className="block h-full rounded-full" style={{ width: `${(d[valueKey] / max) * 100}%`, background: color }} />
          </span>
          <span className="num w-16 text-right font-medium">{format(d[valueKey])}</span>
        </li>
      ))}
    </ul>
  );
}

const SERIES = ["rgb(var(--amber))", "rgb(var(--teal))", "rgb(var(--rust))", "#7C8CE0"];

export function SpecChart({ spec }: { spec: ChartSpec }) {
  const Chart = spec.type === "line" ? LineChart : BarChart;
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{spec.title}</p>
      <div className="h-56">
        <ResponsiveContainer>
          <Chart data={spec.data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
            <CartesianGrid stroke="rgb(var(--line))" strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey={spec.x_key} {...axis} interval={0} angle={spec.data.length > 8 ? -35 : 0} textAnchor={spec.data.length > 8 ? "end" : "middle"} height={spec.data.length > 8 ? 50 : 24} />
            <YAxis {...axis} width={52} tickFormatter={(v) => (Math.abs(v) >= 1000 ? money(v).replace("$", "") : v)} />
            <Tooltip content={<TipBox />} cursor={{ fill: "rgb(var(--raised))" }} />
            {spec.y_keys.map((k, i) =>
              spec.type === "line" ? (
                <Line key={k} dataKey={k} name={k} stroke={SERIES[i % 4]} strokeWidth={2} dot={false} />
              ) : (
                <Bar key={k} dataKey={k} name={k} fill={SERIES[i % 4]} radius={[4, 4, 0, 0]} />
              ),
            )}
          </Chart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
