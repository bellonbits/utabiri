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

/**
 * Demo session: until the auth pages are wired, trading uses the seeded
 * demo account (KES 100,000 starting balance).
 */
export async function ensureLogin(): Promise<string> {
  const existing = getToken();
  if (existing) return existing;
  const r = await api<{ access_token: string }>("/auth/login", {
    method: "POST",
    body: { email: "demo@utabiri.co.ke", password: "demo1234" },
    token: null,
  });
  localStorage.setItem(TOKEN_KEY, r.access_token);
  return r.access_token;
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
  status: string;
  volume_cents: number;
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
