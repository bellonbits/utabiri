"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type ApiMarket } from "@/lib/api";
import { fmtKES, useSession } from "@/lib/session";
import { gradientFor } from "@/lib/data";
import { seededSeries } from "@/lib/series";
import { AreaChart, Sparkline } from "@/components/charts";
import { BottomNav } from "@/components/bottom-nav";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import {
  BallIcon,
  GridIcon,
  ListIcon,
  NewsIcon,
  PulseIcon,
  SettingsIcon,
  TrendUpIcon,
} from "@/components/icons";

type PositionDto = {
  market: { id: string; question: string; status: string };
  outcome: string;
  side: "YES" | "NO";
  quantity: number;
  cost_cents: number;
  current_price: number;
  current_value_cents: number;
  unrealized_pnl_cents: number;
  realized_pnl_cents: number;
};

type Tx = {
  id: string;
  type: string;
  amount_cents: number;
  status: string;
  created_at: string;
};

const RANGES = ["1D", "7D", "1M", "1Y", "All"];

const NAV_TILES = [
  { label: "Dashboard", href: "/portfolio", Icon: GridIcon, active: true },
  { label: "Analytics", href: "/leaderboard", Icon: PulseIcon },
  { label: "Markets", href: "/", Icon: BallIcon },
  { label: "Transactions", href: "/wallet", Icon: ListIcon },
  { label: "Settings", href: "/settings", Icon: SettingsIcon },
  { label: "News", href: "/", Icon: NewsIcon },
];

export default function PortfolioPage() {
  const user = useSession();
  const [positions, setPositions] = useState<PositionDto[] | null>(null);
  const [wallet, setWallet] = useState<{ balance_cents: number } | null>(null);
  const [markets, setMarkets] = useState<ApiMarket[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [range, setRange] = useState("1M");

  useEffect(() => {
    api<{ items: ApiMarket[] }>("/markets", { token: null })
      .then((r) => setMarkets(r.items))
      .catch(() => {});
    if (!user) return;
    api<{ items: PositionDto[] }>("/positions")
      .then((r) => setPositions(r.items))
      .catch(() => setPositions([]));
    api<{ balance_cents: number }>("/wallet").then(setWallet).catch(() => {});
    api<{ items: Tx[] }>("/wallet/transactions")
      .then((r) => setTxs(r.items.filter((t) => t.type.startsWith("trade") || t.type === "payout").slice(0, 6)))
      .catch(() => {});
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-dvh">
        <Navbar />
        <main className="mx-auto max-w-md px-4 pt-20 text-center">
          <p className="text-sm text-mut">
            Please{" "}
            <Link href="/login" className="font-semibold text-accent-2 hover:underline">
              log in
            </Link>{" "}
            to view your portfolio.
          </p>
        </main>
        <Footer />
      <BottomNav />
      </div>
    );
  }

  const items = positions ?? [];
  const totalValue = items.reduce((s, p) => s + p.current_value_cents, 0);
  const totalCost = items.reduce((s, p) => s + p.cost_cents, 0);
  const unrealized = totalValue - totalCost;
  const realized = items.reduce((s, p) => s + p.realized_pnl_cents, 0);
  const cash = wallet?.balance_cents ?? 0;
  const netWorth = cash + totalValue;
  const perf = totalCost ? (unrealized / totalCost) * 100 : 0;

  const yesValue = items
    .filter((p) => p.side === "YES")
    .reduce((s, p) => s + p.current_value_cents, 0);
  const yesPct = totalValue ? Math.round((yesValue / totalValue) * 100) : 0;

  const popular = markets.slice(0, 4);
  const valueSeries = seededSeries(`pv:${user.id}:${range}`, 70, 90).map(
    (p) => (netWorth || 100000) * (0.85 + p / 400),
  );

  return (
    <div className="min-h-dvh">
      <Navbar />
      <main className="mx-auto max-w-screen-2xl px-4 pb-24 pt-4 md:pb-8">
        <div className="grid gap-4 lg:grid-cols-[230px_minmax(0,1fr)_300px]">
          {/* ---------- left sidebar ---------- */}
          <aside className="hidden flex-col gap-3 lg:flex">
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-3">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-sm font-extrabold uppercase text-white ${gradientFor(user.display_name)}`}
              >
                {user.display_name.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{user.display_name}</p>
                <p className="text-xs text-mut">{fmtKES(netWorth)}</p>
              </div>
              <Link href="/settings" className="text-mut hover:text-white">
                <SettingsIcon width={16} height={16} />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {NAV_TILES.map(({ label, href, Icon, active }) => (
                <Link
                  key={label}
                  href={href}
                  className={`flex flex-col items-center gap-2 rounded-2xl border p-5 text-xs font-semibold transition ${
                    active
                      ? "border-white bg-white text-ink"
                      : "border-line bg-panel text-mut hover:text-white"
                  }`}
                >
                  <Icon width={20} height={20} />
                  {label}
                </Link>
              ))}
            </div>

            <div className="rounded-2xl border border-line bg-panel p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold">Ending Soon</h3>
                <Link href="/" className="text-xs font-semibold text-mut hover:text-white">
                  View all
                </Link>
              </div>
              <ul className="divide-y divide-line/60">
                {markets.slice(0, 4).map((m) => (
                  <li key={m.id} className="py-2">
                    <Link href={`/markets/${m.id}`} className="block hover:text-accent-2">
                      <p className="truncate text-xs font-semibold">{m.question}</p>
                      <p className="text-[11px] text-mut-2">
                        {m.category} · {Math.round((m.outcomes[0]?.price_yes ?? 0.5) * 100)}% yes
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* ---------- main column ---------- */}
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-extrabold tracking-tight">Dashboard</h1>
              <span className="text-xs font-semibold uppercase tracking-wider text-mut-2">
                Portfolio
              </span>
            </div>

            {/* most popular this week */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-base font-bold">Most popular this week</h2>
                <Link href="/" className="text-xs font-semibold text-mut hover:text-white">
                  View all
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {popular.map((m) => {
                  const yes = m.outcomes[0]?.price_yes ?? 0.5;
                  const up = yes >= 0.5;
                  return (
                    <Link
                      key={m.id}
                      href={`/markets/${m.id}`}
                      className="rounded-2xl border border-line bg-panel p-3 transition hover:border-accent/50"
                    >
                      <p className="truncate text-xs font-bold">{m.question}</p>
                      <p className="text-[11px] text-mut-2">{m.category}</p>
                      <div className="my-2">
                        <Sparkline
                          points={seededSeries(`pop:${m.id}`, yes * 100, 30)}
                          up={up}
                        />
                      </div>
                      <p className="text-sm font-extrabold">
                        {Math.round(yes * 100)}%{" "}
                        <span className={`text-[11px] ${up ? "text-up" : "text-down"}`}>
                          yes
                        </span>
                      </p>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* stat cards */}
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["Cash Available", fmtKES(cash), "text-white"],
                  [
                    "Unrealized P&L",
                    `${unrealized >= 0 ? "+" : ""}${fmtKES(unrealized)}`,
                    unrealized >= 0 ? "text-up" : "text-down",
                  ],
                  [
                    "Realized P&L",
                    `${realized >= 0 ? "+" : ""}${fmtKES(realized)}`,
                    realized >= 0 ? "text-up" : "text-down",
                  ],
                  [
                    "Performance",
                    `${perf >= 0 ? "+" : ""}${perf.toFixed(1)}%`,
                    perf >= 0 ? "text-up" : "text-down",
                  ],
                ] as const
              ).map(([label, value, cls]) => (
                <div key={label} className="rounded-2xl border border-line bg-panel p-4">
                  <p className="text-xs font-semibold text-mut">{label}</p>
                  <p className={`mt-1.5 text-2xl font-extrabold tracking-tight ${cls}`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {/* value over time */}
            <section className="rounded-2xl border border-line bg-panel p-4">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold">Portfolio Value Over Time</h2>
                  <p className={`text-xl font-extrabold ${unrealized >= 0 ? "text-up" : "text-down"}`}>
                    {unrealized >= 0 ? "+" : ""}
                    {fmtKES(unrealized)}
                  </p>
                </div>
                <div className="flex rounded-lg border border-line bg-panel-2 p-0.5">
                  {RANGES.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      className={`rounded-md px-3 py-1 text-xs font-bold transition ${
                        range === r ? "bg-white text-ink" : "text-mut hover:text-white"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <AreaChart
                points={valueSeries}
                labels={["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"]}
              />
            </section>

            {/* open positions table */}
            <section className="rounded-2xl border border-line bg-panel p-4">
              <h2 className="mb-3 text-base font-bold">Open Positions</h2>
              {items.length === 0 ? (
                <p className="text-sm text-mut">
                  No open positions —{" "}
                  <Link href="/" className="font-semibold text-accent-2 hover:underline">
                    browse markets
                  </Link>
                  .
                </p>
              ) : (
                <ul className="divide-y divide-line/60">
                  {items.map((p, i) => (
                    <li key={i} className="flex items-center gap-3 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-bold ${
                          p.side === "YES" ? "bg-up/15 text-up" : "bg-down/15 text-down"
                        }`}
                      >
                        {p.side}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/markets/${p.market.id}`}
                          className="block truncate text-sm font-semibold hover:text-accent-2"
                        >
                          {p.market.question}
                        </Link>
                        <p className="text-xs text-mut-2">
                          {p.quantity.toFixed(1)} shares @ {p.current_price.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{fmtKES(p.current_value_cents)}</p>
                        <p
                          className={`text-xs font-bold ${
                            p.unrealized_pnl_cents >= 0 ? "text-up" : "text-down"
                          }`}
                        >
                          {p.unrealized_pnl_cents >= 0 ? "+" : ""}
                          {fmtKES(p.unrealized_pnl_cents)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* ---------- right rail ---------- */}
          <aside className="hidden flex-col gap-4 lg:flex">
            <div className="rounded-2xl border border-line bg-panel p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">My Portfolio</h2>
                <Link
                  href="/wallet"
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-ink transition hover:brightness-90"
                >
                  + Deposit
                </Link>
              </div>
              <p className="mt-3 text-3xl font-extrabold tracking-tight">
                {fmtKES(netWorth)}
              </p>
              <p className={`text-sm font-bold ${perf >= 0 ? "text-up" : "text-down"}`}>
                {perf >= 0 ? "▲" : "▼"} {Math.abs(perf).toFixed(1)}% on open positions
              </p>

              <p className="mt-5 text-xs font-semibold text-mut">Allocation</p>
              <div className="mt-2 flex h-2.5 gap-1 overflow-hidden rounded-full">
                <span className="bg-up" style={{ width: `${yesPct}%` }} />
                <span className="bg-down" style={{ width: `${100 - yesPct}%` }} />
              </div>
              <div className="mt-3 space-y-1.5 text-sm">
                <p className="flex justify-between">
                  <span className="flex items-center gap-2 text-mut">
                    <span className="h-2 w-2 rounded-full bg-up" /> YES positions {yesPct}%
                  </span>
                  <span className="font-semibold">{fmtKES(yesValue)}</span>
                </p>
                <p className="flex justify-between">
                  <span className="flex items-center gap-2 text-mut">
                    <span className="h-2 w-2 rounded-full bg-down" /> NO positions {100 - yesPct}%
                  </span>
                  <span className="font-semibold">{fmtKES(totalValue - yesValue)}</span>
                </p>
              </div>
              <Link
                href="/wallet"
                className="mt-4 block rounded-xl border border-line py-2.5 text-center text-sm font-bold transition hover:bg-panel-2"
              >
                Manage Wallet
              </Link>
            </div>

            <div className="rounded-2xl border border-line bg-panel p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-base font-bold">Recent Actions</h2>
                <Link href="/wallet" className="text-xs font-semibold text-mut hover:text-white">
                  View all
                </Link>
              </div>
              {txs.length === 0 ? (
                <p className="text-sm text-mut">No trades yet.</p>
              ) : (
                <ul className="divide-y divide-line/60">
                  {txs.map((t) => {
                    const isBuy = t.type === "trade_buy";
                    const label = isBuy ? "Bought" : t.type === "payout" ? "Payout" : "Sold";
                    return (
                      <li key={t.id} className="flex items-center gap-3 py-2.5">
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                            isBuy ? "bg-down/10 text-down" : "bg-up/10 text-up"
                          }`}
                        >
                          <TrendUpIcon width={14} height={14} className={isBuy ? "rotate-180" : ""} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold">{label}</p>
                          <p className="text-xs text-mut-2">
                            {new Date(t.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`text-sm font-bold ${
                            t.amount_cents >= 0 ? "text-up" : "text-down"
                          }`}
                        >
                          {t.amount_cents >= 0 ? "+" : ""}
                          {fmtKES(t.amount_cents)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
