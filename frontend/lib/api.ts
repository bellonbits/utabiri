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
    throw new Error(
      typeof data?.detail === "string" ? data.detail : `HTTP ${res.status}`,
    );
  }
  return data as T;
}


export type ApiOutcome = {
  id: string;
  label: string;
  price_yes: number;
  price_no: number;
};

export type ApiMarket = {
  id: string;
  question: string;
  category: string;
  kind: "binary" | "multi" | "matchup";
  image: string;
  status: string;
  end_date: string;
  volume_cents: number;
  is_new?: boolean;
  outcomes: ApiOutcome[];
};

export type BuyResult = {
  trade_id: string;
  shares: number;
  avg_price: number;
  price_yes_after: number;
  fee_cents: number;
  new_balance_cents: number;
};

export type SellResult = {
  trade_id: string;
  proceeds_cents: number;
  fee_cents: number;
  price_yes_after: number;
  new_balance_cents: number;
  realized_pnl_cents: number;
};
