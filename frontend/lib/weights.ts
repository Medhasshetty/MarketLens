export type Weights = { market_size: number; digital_adoption: number; search_demand: number; affluence: number };

export const DEFAULT_WEIGHTS: Weights = { market_size: 35, digital_adoption: 25, search_demand: 25, affluence: 15 };

export const FACTORS: { key: keyof Weights; label: string; help: string; color: string }[] = [
  { key: "market_size", label: "Market size", help: "Population × GDP per capita (World Bank)", color: "rgb(var(--amber))" },
  { key: "digital_adoption", label: "Digital adoption", help: "Share of people using the internet", color: "rgb(var(--teal))" },
  { key: "search_demand", label: "Search demand", help: "Category search interest (Google Trends)", color: "#7C8CE0" },
  { key: "affluence", label: "Affluence", help: "GDP per capita, a proxy for premium spend", color: "rgb(var(--rust))" },
];

export const PRESETS: { name: string; weights: Weights }[] = [
  { name: "Balanced", weights: DEFAULT_WEIGHTS },
  { name: "Fast traction", weights: { market_size: 15, digital_adoption: 35, search_demand: 40, affluence: 10 } },
  { name: "Premium positioning", weights: { market_size: 20, digital_adoption: 20, search_demand: 15, affluence: 45 } },
  { name: "Scale", weights: { market_size: 60, digital_adoption: 15, search_demand: 20, affluence: 5 } },
];

export function loadWeights(): Weights {
  try {
    const v = localStorage.getItem("ml-weights");
    return v ? { ...DEFAULT_WEIGHTS, ...JSON.parse(v) } : DEFAULT_WEIGHTS;
  } catch {
    return DEFAULT_WEIGHTS;
  }
}

export function saveWeights(w: Weights) {
  try {
    localStorage.setItem("ml-weights", JSON.stringify(w));
  } catch {}
}
