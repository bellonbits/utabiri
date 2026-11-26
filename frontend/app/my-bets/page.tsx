"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { CheckCircleIcon, ClockIcon, XCircleIcon } from "@/components/icons";
import { api } from "@/lib/api";

interface BetLegData {
  id: string;
  match_title: string;
  market_name: string;
  outcome_name: string;
  odds: number;
  status: string;
}

interface BetData {
  id: string;
  bet_type: string;
  stake: number;
  total_odds: number;
  bonus_rate: number;
  potential_payout: number;
  status: string;
  cashout_quote: number | null;
  currency: string;
  placed_at: string;
  legs: BetLegData[];
}

export default function MyBetsPage() {
  const [activeTab, setActiveTab] = useState<"open" | "settled">("open");
  const [bets, setBets] = useState<BetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [cashingOutId, setCashingOutId] = useState<string | null>(null);

  const fetchBets = (status: string) => {
    setLoading(true);
    api<{ items: BetData[] }>(`/bets/my?status=${status}`)
      .then((res) => setBets(res.items || []))
      .catch(() => setBets([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBets(activeTab);
  }, [activeTab]);

  const handleCashout = async (betId: string) => {
    setCashingOutId(betId);
    try {
      await api(`/bets/${betId}/cashout`, { method: "POST" });
      fetchBets(activeTab);
    } catch {}
    setCashingOutId(null);
  };

  return (
    <div className="min-h-screen bg-ink flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-screen-lg mx-auto w-full px-4 py-6 pb-24 md:pb-12">
        <div className="border-b border-line pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900">
              My Bets
            </h1>
            <p className="text-xs text-mut mt-0.5">
              Review open tickets, early cashout offers, and settled wagers.
            </p>
          </div>
          <Link
            href="/sports"
            className="text-xs font-bold text-accent-2 hover:underline"
          >
            ← Back to Sportsbook
          </Link>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-4 border-b border-line my-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab("open")}
            className={`pb-2.5 transition border-b-2 ${
              activeTab === "open"
                ? "border-accent text-accent-2 font-black"
                : "border-transparent text-mut hover:text-slate-900"
            }`}
          >
            Open Bets
          </button>
          <button
            onClick={() => setActiveTab("settled")}
            className={`pb-2.5 transition border-b-2 ${
              activeTab === "settled"
                ? "border-accent text-accent-2 font-black"
                : "border-transparent text-mut hover:text-slate-900"
            }`}
          >
            Settled History
          </button>
        </div>

        {/* Bets Listing as Table Rows (NOT CARDS) */}
        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-mut">
            Loading your bets…
          </div>
        ) : bets.length === 0 ? (
          <div className="p-12 text-center text-xs text-mut border border-dashed border-line">
            No {activeTab} bets found.
          </div>
        ) : (
          <div className="divide-y divide-line border border-line bg-panel">
            {bets.map((b) => (
              <div key={b.id} className="p-4 space-y-3">
                {/* Bet Summary Strip */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-line/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">#{b.id.slice(0, 8)}</span>
                    <span className="rounded bg-panel-2 border border-line px-2 py-0.5 font-bold uppercase text-[10px]">
                      {b.bet_type}
                    </span>
                    <span className="text-mut text-[11px]">
                      {new Date(b.placed_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-mut">
                      Stake: <strong className="text-slate-900">{b.stake} Coins</strong>
                    </span>
                    <span className="text-mut">
                      Total Odds: <strong className="text-slate-900">{b.total_odds.toFixed(2)}</strong>
                    </span>
                    <span className="font-black text-accent-2">
                      Return: {b.potential_payout.toLocaleString()} Coins
                    </span>
                  </div>
                </div>

                {/* Bet Legs Table */}
                <table className="w-full text-left text-xs border border-line/60">
                  <thead className="bg-panel-2/60 text-mut font-semibold border-b border-line/60">
                    <tr>
                      <th className="p-2">Match</th>
                      <th className="p-2">Market</th>
                      <th className="p-2">Selection</th>
                      <th className="p-2">Odds</th>
                      <th className="p-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {b.legs.map((lg) => (
                      <tr key={lg.id} className="hover:bg-panel-2/40">
                        <td className="p-2 font-bold text-slate-900">{lg.match_title}</td>
                        <td className="p-2 text-mut">{lg.market_name}</td>
                        <td className="p-2 font-black text-slate-800">{lg.outcome_name}</td>
                        <td className="p-2 font-mono font-bold text-accent-2">{lg.odds.toFixed(2)}</td>
                        <td className="p-2 text-right">
                          {lg.status === "won" ? (
                            <span className="text-up font-bold inline-flex items-center gap-1">
                              <CheckCircleIcon width={12} height={12} /> Won
                            </span>
                          ) : lg.status === "lost" ? (
                            <span className="text-down font-bold inline-flex items-center gap-1">
                              <XCircleIcon width={12} height={12} /> Lost
                            </span>
                          ) : (
                            <span className="text-mut font-semibold inline-flex items-center gap-1">
                              <ClockIcon width={12} height={12} /> Open
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Cashout Offer Action */}
                {b.status === "open" && b.cashout_quote && (
                  <div className="flex items-center justify-between bg-panel-2/60 p-2.5 rounded border border-line">
                    <span className="text-xs text-mut font-medium">
                      Cash out now before matches finish
                    </span>
                    <button
                      onClick={() => handleCashout(b.id)}
                      disabled={cashingOutId === b.id}
                      className="rounded bg-amber-500 hover:bg-amber-400 px-4 py-1.5 text-xs font-black text-slate-950 transition"
                    >
                      {cashingOutId === b.id
                        ? "Cashing Out…"
                        : `Cashout for ${b.cashout_quote.toFixed(0)} Coins`}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
