"use client";

import { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { money, signed } from "@/lib/format";
import type { Country } from "@/lib/types";

import topology from "world-atlas/countries-110m.json";

const GEO = topology as unknown as object;

// ISO 3166 alpha-2 -> numeric ids used by world-atlas
const NUMERIC: Record<string, string> = {
  GB: "826", DE: "276", FR: "250", NL: "528", ES: "724", IT: "380", SE: "752", PL: "616",
  US: "840", CA: "124", MX: "484", BR: "076", AE: "784", SA: "682", IN: "356", SG: "702",
  JP: "392", AU: "036", KR: "410", ID: "360", VN: "704", ZA: "710", NG: "566",
};

type Hover = { c: Country; x: number; y: number } | null;

export function WorldMap({
  countries,
  onSelect,
  height = 420,
}: {
  countries: Country[];
  onSelect?: (c: Country) => void;
  height?: number;
}) {
  const [hover, setHover] = useState<Hover>(null);
  const byNumeric = useMemo(() => {
    const m: Record<string, Country> = {};
    countries.forEach((c) => NUMERIC[c.code] && (m[NUMERIC[c.code]] = c));
    return m;
  }, [countries]);
  const max = Math.max(1, ...countries.map((c) => c.revenue));

  const fillFor = (c?: Country) => {
    if (!c) return "rgb(var(--map-land))";
    if (!c.launched) return "url(#candidate)";
    const t = Math.sqrt(c.revenue / max);
    return `rgb(var(--amber) / ${0.18 + t * 0.62})`;
  };

  return (
    <div className="relative w-full" style={{ aspectRatio: "16 / 8.2", maxHeight: height }}>
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 165 }}
        width={800}
        height={410}
        style={{ width: "100%", height: "100%" }}
      >
        <defs>
          <pattern id="candidate" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="5" height="5" fill="rgb(var(--map-land))" />
            <line x1="0" y1="0" x2="0" y2="5" stroke="rgb(var(--teal))" strokeWidth="2.2" />
          </pattern>
          <radialGradient id="light">
            <stop offset="0%" stopColor="rgb(var(--amber))" stopOpacity="0.9" />
            <stop offset="100%" stopColor="rgb(var(--amber))" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ZoomableGroup center={[10, 12]} zoom={1} minZoom={1} maxZoom={5}>
          <Geographies geography={GEO}>
            {({ geographies }: { geographies: any[] }) =>
              geographies.map((geo) => {
                const c = byNumeric[geo.id];
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={(e: React.MouseEvent) => c && setHover({ c, x: e.clientX, y: e.clientY })}
                    onMouseMove={(e: React.MouseEvent) => c && setHover({ c, x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => c && onSelect?.(c)}
                    style={{
                      default: { fill: fillFor(c), stroke: "rgb(var(--bg))", strokeWidth: 0.5, outline: "none" },
                      hover: {
                        fill: c ? (c.launched ? "rgb(var(--amber))" : "rgb(var(--teal) / .6)") : "rgb(var(--map-land))",
                        stroke: "rgb(var(--bg))",
                        strokeWidth: 0.5,
                        outline: "none",
                        cursor: c ? "pointer" : "default",
                      },
                      pressed: { fill: "rgb(var(--amber))", outline: "none" },
                    }}
                  />
                );
              })
            }
          </Geographies>
          {countries
            .filter((c) => c.launched && c.revenue > 0)
            .map((c) => {
              const r = 3 + Math.sqrt(c.revenue / max) * 14;
              return (
                <Marker key={c.code} coordinates={[c.lon, c.lat]}>
                  <circle r={r * 1.9} fill="url(#light)" className="market-glow" pointerEvents="none" />
                  <circle r={2.2} fill="rgb(var(--ink))" pointerEvents="none" />
                </Marker>
              );
            })}
        </ZoomableGroup>
      </ComposableMap>

      {hover && (
        <div
          className="pointer-events-none fixed z-50 hidden rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm shadow-lg sm:block"
          style={{ left: hover.x + 14, top: hover.y + 14 }}
        >
          <p className="font-medium">{hover.c.name}</p>
          {hover.c.launched ? (
            <p className="mt-0.5 text-muted">
              <span className="num text-ink">{money(hover.c.revenue)}</span> revenue, {signed(hover.c.growth)} growth
            </p>
          ) : (
            <p className="mt-0.5 text-teal">Not launched yet: expansion candidate</p>
          )}
        </div>
      )}
    </div>
  );
}

export function MapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
      <span className="flex items-center gap-2">
        <span className="h-2.5 w-16 rounded-full" style={{ background: "linear-gradient(90deg, rgb(var(--amber)/.2), rgb(var(--amber)/.85))" }} />
        Revenue
      </span>
      <span className="flex items-center gap-2">
        <svg width="14" height="14" aria-hidden>
          <rect width="14" height="14" rx="3" fill="url(#candidate-legend)" />
          <defs>
            <pattern id="candidate-legend" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="4" height="4" fill="rgb(var(--map-land))" />
              <line x1="0" y1="0" x2="0" y2="4" stroke="rgb(var(--teal))" strokeWidth="2" />
            </pattern>
          </defs>
        </svg>
        Expansion candidate
      </span>
    </div>
  );
}
