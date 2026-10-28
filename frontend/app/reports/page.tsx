"use client";

import clsx from "clsx";
import { Check, Download, FileSpreadsheet, FileText, Loader2, Presentation } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { useApp } from "@/components/providers";
import { api } from "@/lib/api";
import { loadWeights } from "@/lib/weights";

type Format = "pptx" | "docx" | "pdf";

const FORMATS: { id: Format; label: string; note: string; icon: typeof FileText }[] = [
  { id: "pptx", label: "PowerPoint", note: "Slides for meetings", icon: Presentation },
  { id: "docx", label: "Word", note: "Editable document", icon: FileText },
  { id: "pdf", label: "PDF", note: "Ready to share", icon: FileSpreadsheet },
];

const SECTIONS = [
  { id: "summary", label: "Executive summary", note: "Headline results and key insights, written by the AI analyst" },
  { id: "kpis", label: "Key metrics", note: "Revenue, orders, AOV, repeat orders, conversion, customers" },
  { id: "trend", label: "Revenue trend", note: "Monthly revenue stacked by region" },
  { id: "markets", label: "Market performance", note: "Top markets with growth, repeat rate and conversion" },
  { id: "retention", label: "Customer retention", note: "Cohort retention heatmap" },
  { id: "funnel", label: "Conversion funnel", note: "Sessions to purchase, with drop-off" },
  { id: "expansion", label: "Expansion opportunities", note: "Candidate markets scored with your weights" },
  { id: "recommendations", label: "Recommendations", note: "Three actions with the metric to watch" },
];

const PRESETS: Record<string, { title: string; sections: string[] }> = {
  full: { title: "Global Market Performance Review", sections: SECTIONS.map((s) => s.id) },
  expansion: { title: "International Expansion Brief", sections: ["summary", "markets", "expansion", "recommendations"] },
  monthly: { title: "Monthly Business Review", sections: ["summary", "kpis", "trend", "funnel", "recommendations"] },
};

type Generated = { name: string; url: string; format: Format; at: string };

export default function ReportsPage() {
  return (
    <Suspense>
      <Reports />
    </Suspense>
  );
}

function Reports() {
  const { filters } = useApp();
  const params = useSearchParams();
  const [format, setFormat] = useState<Format>("pptx");
  const [title, setTitle] = useState(PRESETS.full.title);
  const [sections, setSections] = useState<string[]>(PRESETS.full.sections);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Generated[]>([]);

  useEffect(() => {
    const p = PRESETS[params.get("preset") || ""];
    if (p) {
      setTitle(p.title);
      setSections(p.sections);
    }
  }, [params]);

  const applyPreset = (key: string) => {
    setTitle(PRESETS[key].title);
    setSections(PRESETS[key].sections);
  };
  const toggle = (id: string) =>
    setSections((s) => (s.includes(id) ? s.filter((x) => x !== id) : SECTIONS.map((x) => x.id).filter((x) => s.includes(x) || x === id)));

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const { blob, filename } = await api.report({
        format,
        title: title.trim() || "Market Report",
        months: filters.months,
        region: filters.region,
        sections,
        weights: loadWeights(),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      setHistory((h) => [{ name: filename, url, format, at: new Date().toLocaleTimeString() }, ...h].slice(0, 6));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const unit = format === "pptx" ? "slides" : "pages";
  const estimate = format === "pptx" ? sections.length + 1 : Math.max(1, Math.ceil(sections.length / 2));

  return (
    <div className="pb-10">
      <PageHeader title="Reports" description="Build a polished report from your current filters and download it in one click." />

      <div className="grid gap-4 px-4 sm:gap-5 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-10">
        <div className="space-y-4 sm:space-y-5">
          <Panel title="Format">
            <div className="grid grid-cols-3 gap-2 sm:gap-3" role="radiogroup" aria-label="Report format">
              {FORMATS.map(({ id, label, note, icon: Icon }) => (
                <button
                  key={id}
                  role="radio"
                  aria-checked={format === id}
                  onClick={() => setFormat(id)}
                  className={clsx(
                    "rounded-2xl border p-3 text-left transition-colors sm:p-4",
                    format === id ? "border-amber bg-amber/10" : "border-line hover:border-muted",
                  )}
                >
                  <Icon size={22} className={format === id ? "text-amber" : "text-muted"} />
                  <p className="mt-2 text-sm font-medium">{label}</p>
                  <p className="hidden text-xs text-muted sm:block">{note}</p>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Content">
            <label className="block text-sm font-medium" htmlFor="title">
              Report title
            </label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              className="mt-2 w-full rounded-xl border border-line bg-bg px-4 py-3 text-sm"
            />
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="self-center text-sm text-muted">Start from:</span>
              {Object.entries({ full: "Full review", monthly: "Monthly review", expansion: "Expansion brief" }).map(([k, v]) => (
                <button key={k} onClick={() => applyPreset(k)} className="rounded-full border border-line px-3 py-1.5 text-xs hover:border-ink">
                  {v}
                </button>
              ))}
            </div>
            <ul className="mt-5 divide-y divide-line">
              {SECTIONS.map((s) => {
                const on = sections.includes(s.id);
                return (
                  <li key={s.id}>
                    <button onClick={() => toggle(s.id)} role="checkbox" aria-checked={on} className="flex w-full items-start gap-3 py-3 text-left">
                      <span
                        className={clsx(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                          on ? "border-teal bg-teal text-white" : "border-line",
                        )}
                      >
                        {on && <Check size={14} />}
                      </span>
                      <span>
                        <span className="block text-sm font-medium">{s.label}</span>
                        <span className="block text-xs text-muted">{s.note}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>

        <div className="space-y-4 sm:space-y-5 lg:sticky lg:top-6 lg:self-start">
          <Panel title="Ready to export">
            <dl className="space-y-2 text-sm">
              <Row label="Format" value={FORMATS.find((f) => f.id === format)!.label} />
              <Row label="Period" value={`Last ${filters.months} months`} />
              <Row label="Region" value={filters.region === "All" ? "All regions" : filters.region} />
              <Row label="Length" value={`About ${estimate} ${unit}`} />
            </dl>
            <p className="mt-3 text-xs text-muted">Change period and region from the filters on any dashboard page.</p>

            <ol className="mt-5 space-y-1.5 border-l-2 border-amber pl-4 text-sm">
              {sections.length ? (
                sections.map((id) => <li key={id}>{SECTIONS.find((s) => s.id === id)?.label}</li>)
              ) : (
                <li className="text-muted">Select at least one section to include.</li>
              )}
            </ol>

            <button
              onClick={generate}
              disabled={busy || sections.length === 0}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-amber py-3.5 font-medium text-navy disabled:opacity-40"
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              {busy ? "Generating report…" : `Download ${FORMATS.find((f) => f.id === format)!.label}`}
            </button>
            {error && <p className="mt-3 rounded-xl bg-rust/10 p-3 text-sm text-rust">{error}</p>}
            {!api.hasBackend && !error && (
              <p className="mt-3 text-xs text-muted">Report export needs the MarketLens API running. See the README to start it.</p>
            )}
          </Panel>

          {history.length > 0 && (
            <Panel title="Downloaded this session">
              <ul className="space-y-2">
                {history.map((h) => (
                  <li key={h.url}>
                    <a href={h.url} download={h.name} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3 text-sm hover:border-ink">
                      <span className="min-w-0 truncate">{h.name}</span>
                      <span className="shrink-0 text-xs text-muted">{h.at}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
