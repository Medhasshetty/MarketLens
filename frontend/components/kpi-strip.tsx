import clsx from "clsx";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { int, money, pct, signed } from "@/lib/format";
import type { Kpis } from "@/lib/types";

export function KpiStrip({ kpis }: { kpis: Kpis }) {
  const items = [
    { label: "Revenue", value: money(kpis.revenue.value), change: kpis.revenue.change, lead: true },
    { label: "Orders", value: int(kpis.orders.value), change: kpis.orders.change },
    { label: "Avg order value", value: `$${kpis.aov.value.toFixed(2)}`, change: kpis.aov.change },
    { label: "Repeat orders", value: pct(kpis.repeat_rate.value), change: kpis.repeat_rate.change },
    { label: "Conversion", value: pct(kpis.conversion.value, 2), change: kpis.conversion.change },
    { label: "Customers", value: int(kpis.customers.value), change: kpis.customers.change },
  ];
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3 xl:grid-cols-6">
      {items.map((k) => (
        <div key={k.label} className="bg-surface p-4 sm:p-5">
          <p className="text-xs text-muted sm:text-sm">{k.label}</p>
          <p className={clsx("num mt-1.5 font-semibold", k.lead ? "text-3xl text-amber" : "text-2xl")}>{k.value}</p>
          <Change v={k.change} />
        </div>
      ))}
    </div>
  );
}

export function Change({ v, suffix = "vs prior period" }: { v: number | null; suffix?: string }) {
  if (v == null) return <p className="mt-1 text-xs text-muted">No prior data</p>;
  const up = v >= 0;
  return (
    <p className={clsx("mt-1 flex items-center gap-1 text-xs", up ? "text-teal" : "text-rust")}>
      {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
      <span className="font-medium">{signed(v)}</span>
      <span className="hidden text-muted sm:inline">{suffix}</span>
    </p>
  );
}
