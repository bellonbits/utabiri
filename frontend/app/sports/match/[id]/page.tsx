"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { BetslipPanel } from "@/components/sportsbook/betslip-panel";
import { MobileBetslipTrigger } from "@/components/sportsbook/mobile-betslip-trigger";
import { SportsSidebar } from "@/components/sportsbook/sports-sidebar";
import { ChevronDownIcon, ChevronRightIcon, ChevronUpIcon, LockIcon } from "@/components/icons";
import { api } from "@/lib/api";
import { useBetslip } from "@/lib/betslip-store";

interface OutcomeData {
  id: string;
  name: string;
  odds: number;
  status: string;
}

interface MarketSection {
  id: string;
  name: string;
  market_type: string;
  is_suspended: boolean;
  outcomes: OutcomeData[];
}

interface MatchDetail {
  id: string;
  sport_id: string;
  tournament_name: string;
  home_team: string;
  away_team: string;
  start_time: string;
  status: string;
  minute: number | null;
  home_score: number;
  away_score: number;
  is_suspended: boolean;
  markets: MarketSection[];
}

export default function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const { toggleSelection, isSelectionActive } = useBetslip();

  useEffect(() => {
    api<MatchDetail>(`/sports/matches/${id}`, { token: null })
      .then((res) => setMatch(res))
      .catch(() => {});
  }, [id]);

  const toggleSection = (marketId: string) => {
    setCollapsed((prev) => ({ ...prev, [marketId]: !prev[marketId] }));
  };

  if (!match) {
    return (
      <div className="min-h-screen bg-ink flex flex-col">
        <Navbar />
        <div className="p-12 text-center text-xs font-bold text-mut">Loading match markets…</div>
      </div>
    );
  }

  const isLive = match.status === "live";
  const matchTitle = `${match.home_team} vs ${match.away_team}`;

  return (
    <div className="min-h-screen bg-ink flex flex-col">
      <Navbar />

      <div className="flex-1 flex max-w-screen-2xl mx-auto w-full">
        <SportsSidebar activeSport={match.sport_id} />

        <main className="flex-1 min-w-0 bg-panel border-r border-line pb-24 md:pb-12">
          {/* Match Scoreboard Header Strip (No cards, flat full-width) */}
          <div className="border-b border-line bg-slate-900 text-white p-4">
            <div className="flex items-center gap-2 text-xs text-amber-400 font-bold mb-2">
              <Link href="/sports" className="hover:underline">Sports</Link>
              <span>/</span>
              <span>{match.tournament_name}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h1 className="text-xl md:text-2xl font-black">
                  {match.home_team} vs {match.away_team}
                </h1>
                <p className="text-xs text-stone-400 mt-1">
                  {new Date(match.start_time).toLocaleString()}
                </p>
              </div>

              {isLive && (
                <div className="flex flex-col items-end">
                  <div className="text-3xl font-black text-rose-500 flex items-center gap-2">
                    <span>{match.home_score}</span>
                    <span className="text-stone-500">:</span>
                    <span>{match.away_score}</span>
                  </div>
                  <span className="text-xs font-black text-rose-500 animate-pulse mt-0.5">
                    {match.minute}&apos; IN-PLAY
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* All Markets in Collapsible Sections (NOT CARDS!) */}
          <div className="divide-y divide-line">
            {match.markets.map((mkt) => {
              const isCol = !!collapsed[mkt.id];
              return (
                <div key={mkt.id} className="bg-panel">
                  {/* Collapsible Header */}
                  <button
                    onClick={() => toggleSection(mkt.id)}
                    className="w-full px-4 py-2.5 bg-panel-2/60 hover:bg-panel-2 flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-800 transition"
                  >
                    <span>{mkt.name}</span>
                    {isCol ? (
                      <ChevronRightIcon width={14} height={14} className="text-mut" />
                    ) : (
                      <ChevronDownIcon width={14} height={14} className="text-mut" />
                    )}
                  </button>

                  {/* Outcomes Grid */}
                  {!isCol && (
                    <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {mkt.outcomes.map((o) => {
                        const active = isSelectionActive(o.id);
                        return (
                          <button
                            key={o.id}
                            onClick={() =>
                              toggleSelection({
                                matchId: match.id,
                                matchTitle,
                                marketId: mkt.id,
                                marketName: mkt.name,
                                outcomeId: o.id,
                                outcomeName: o.name,
                                odds: o.odds,
                              })
                            }
                            disabled={mkt.is_suspended || match.is_suspended}
                            className={`h-10 rounded border px-3 flex items-center justify-between text-xs font-bold transition ${
                              active
                                ? "bg-accent text-white border-accent font-black"
                                : "bg-panel border-line text-slate-800 hover:bg-panel-2 hover:border-slate-400"
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                          >
                            <span className="truncate">{o.name}</span>
                            <span className="shrink-0 font-black">
                              {mkt.is_suspended ? <LockIcon width={12} height={12} /> : o.odds.toFixed(2)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </main>

        <BetslipPanel isDesktop={true} />
      </div>

      <BetslipPanel isDesktop={false} />
      <MobileBetslipTrigger />

      <Footer />
      <BottomNav />
    </div>
  );
}
