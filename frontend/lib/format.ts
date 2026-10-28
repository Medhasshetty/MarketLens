export const money = (v: number | null | undefined, compact = true) => {
  if (v == null) return "–";
  if (!compact) return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (Math.abs(v) >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
};

export const pct = (v: number | null | undefined, digits = 1) => (v == null ? "–" : `${v.toFixed(digits)}%`);

export const signed = (v: number | null | undefined) =>
  v == null ? "–" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)}%`;

export const int = (v: number | null | undefined) => (v == null ? "–" : v.toLocaleString("en-US"));

export const monthLabel = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleString("en-US", { month: "short", year: "2-digit" });
};

export const flag = (code: string) =>
  code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));

export const REGION_COLORS: Record<string, string> = {
  Europe: "rgb(var(--teal))",
  "North America": "rgb(var(--amber))",
  "Asia Pacific": "#7C8CE0",
  "Middle East": "rgb(var(--rust))",
  "Latin America": "#B48BC8",
  Africa: "#8FA3B8",
};
