"use client";

/** Thin client for the FastAPI backend. */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const TOKEN_KEY = "utabiri_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export async function api<T>(
  path: string,
  opts: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<T> {
  const token = opts.token ?? getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = data?.detail;
    // FastAPI validation errors arrive as a list of {loc, msg}
    const text =
      typeof d === "string"
        ? d
        : Array.isArray(d) && d.length
          ? d
              .map(
                (e: { loc?: (string | number)[]; msg?: string }) =>
                  `${(e.loc ?? []).slice(1).join(".")}: ${e.msg}`,
              )
              .join("; ")
          : `HTTP ${res.status}`;
    throw new Error(text);
  }
  return data as T;
}


export type ApiCommodityPrice = {
  id: number;
  commodity: string;
  classification: string | null;
  grade: string | null;
  market: string;
  county: string;
  wholesale_price: number | null;
  retail_price: number | null;
  unit: string | null;
  supply_volume: number | null;
  price_date: string;
};

export type ApiTrendPoint = {
  date: string;
  avg_wholesale: number | null;
  avg_retail: number | null;
};

export type ApiMacroIndicator = {
  name: string;
  value: number;
  unit: string;
  period: string;
  source: string;
  notes: string | null;
  updated_at: string;
  history: { value: number; unit: string; period: string; created_at: string }[];
};

export type InsightKind = "commentary" | "forecast" | "recommendation";

export type ApiInsight = {
  id: string;
  kind: InsightKind;
  title: string;
  body: string;
  category: string;
  related_commodity: string | null;
  related_indicator: string | null;
  sentiment: "bullish" | "bearish" | "neutral" | null;
  sources: string[];
  generated_by: "ai" | "admin";
  created_at: string;
};

export type CountryComparison = {
  country: string;
  gdp_growth: string;
  inflation: string;
  interest_rate: string;
  debt_to_gdp: string;
  currency_strength: string;
  competitiveness: string;
};

export type SectorImpact = {
  sector: string;
  rating: "winner" | "loser" | "neutral";
  outlook: string;
  risk_level: "low" | "medium" | "high";
  strategy: string;
};

export type IncomeImpact = {
  cost_of_living: string;
  tax_burden: string;
  recommendation: string;
};

export type ApiBriefing = {
  id: string;
  date: string;
  health_score: number;
  previous_score: number | null;
  score_trend: "up" | "down" | "flat";
  executive_summary: string;
  key_drivers: string[];
  country_comparison: CountryComparison[];
  kenya_strengths: string[];
  kenya_weaknesses: string[];
  sector_impacts: SectorImpact[];
  personal_finance: {
    low_income?: IncomeImpact;
    middle_income?: IncomeImpact;
    high_income?: IncomeImpact;
  };
  investment_ideas: {
    short_term?: string[];
    medium_term?: string[];
    long_term?: string[];
    risks?: string[];
  };
  austrian_view: string;
  classical_view: string;
  government_recommendations: string[];
  business_recommendations: string[];
  household_recommendations: string[];
  created_at: string;
};

export type ApiBriefingHistoryItem = {
  date: string;
  health_score: number;
  score_trend: "up" | "down" | "flat";
};

export type ApiBillClause = {
  clause_number: string;
  heading: string;
  plain_english: string;
  who_benefits: string;
  who_loses: string;
  economic_impact: string;
  tax_impact: string;
  inflation_impact: string;
  employment_impact: string;
  investment_impact: string;
  revenue_impact: string;
  long_term_consequences: string;
  hidden_taxes_or_burdens: string;
  loopholes_or_opportunities: string;
};

export type ApiBillSummary = {
  id: string;
  title: string;
  status: "processing" | "done" | "failed";
  created_at: string;
};

export type ApiBillDetail = ApiBillSummary & {
  source_url: string;
  overall_summary: string;
  clauses: ApiBillClause[];
  error: string | null;
};
