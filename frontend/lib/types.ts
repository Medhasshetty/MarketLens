export type Metric = { value: number; change: number | null };

export type Kpis = {
  revenue: Metric;
  orders: Metric;
  customers: Metric;
  aov: Metric;
  repeat_rate: Metric;
  conversion: Metric;
  period: { start: string; end: string; months: number };
};

export type Country = {
  code: string;
  name: string;
  region: string;
  currency: string;
  launched: number;
  lat: number;
  lon: number;
  revenue: number;
  orders: number;
  customers: number;
  aov: number | null;
  repeat_rate: number;
  growth: number | null;
  conversion: number | null;
  cart_to_checkout: number | null;
  share: number;
};

export type TrendPoint = { month: string; total: number; [region: string]: number | string };
export type FunnelStep = { step: string; value: number; pct: number };
export type Channel = { channel: string; revenue: number; customers: number; revenue_per_customer: number };
export type Category = { category: string; revenue: number; orders: number };
export type Cohort = { cohort: string; size: number; retention: number[] };

export type Overview = {
  kpis: Kpis;
  trend: TrendPoint[];
  countries: Country[];
  funnel: FunnelStep[];
  channels: Channel[];
  categories: Category[];
};

export type Factor = {
  code: string;
  name: string;
  region: string;
  launched: boolean;
  market_size: number;
  digital_adoption: number;
  search_demand: number;
  affluence: number;
  performance: number | null;
  revenue: number;
  growth: number | null;
};

export type ChartSpec = {
  type: "bar" | "line";
  title: string;
  x_key: string;
  y_keys: string[];
  data: Record<string, string | number>[];
};

export type ChatReply = {
  answer: string;
  queries: { sql: string; purpose: string; rows: number | null }[];
  chart: ChartSpec | null;
  mode: "ai" | "demo" | "offline";
};
