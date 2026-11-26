"use client";

import Link from "next/link";
import { useState } from "react";
import { useBetslip } from "@/lib/betslip-store";
import { ChevronDownIcon, ChevronUpIcon, LockIcon } from "@/components/icons";

export interface OutcomeItem {
  id: string;
  name: string;
  odds: number;
  status: string;
}

export interface MarketGroup {
  market_id?: string;
  name?: string;
  suspended?: boolean;
  outcomes: OutcomeItem[];
}

export interface MatchData {
  id: string;
  sport_id: string;
  tournament_id: string;
  home_team: string;
  away_team: string;
  start_time: string;
  status: string;
  minute: number | null;
  home_score: number;
  away_score: number;
  is_suspended: boolean;
  market_1x2: MarketGroup;
  market_ou: MarketGroup;
  market_btts: MarketGroup;
  total_markets_count: number;
}

export function MatchRow({ match }: { match: MatchData }) {
  const { toggleSelection, isSelectionActive } = useBetslip();
  const [expanded, setExpanded] = useState(false);

  const isLive = match.status === "live";
  const matchTitle = `${match.home_team} vs ${match.away_team}`;

  const formatStartTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return iso;
    }
  };

  const handleOddsClick = (
    e: React.MouseEvent,
    marketName: string,
    outcome: OutcomeItem,
    marketId?: string
  ) => {
    e.stopPropagation();
    if (match.is_suspended || outcome.status !== "active") return;

    toggleSelection({
      matchId: match.id,
      matchTitle,
      marketId: marketId || "m_default",
      marketName,
      outcomeId: outcome.id,
      outcomeName: outcome.name,
      odds: outcome.odds,
    });
  };

  return (
    <div className="border-b border-line hover:bg-panel-2/50 transition">
      {/* Main Dense Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-3 gap-2">
        {/* Match Info & Teams */}
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <div className="w-14 shrink-0 text-left">
            {isLive ? (
              <div className="flex items-center gap-1 text-[11px] font-black text-rose-600">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-ping" />
                <span>{match.minute}&apos;</span>
              </div>
            ) : (
              <span className="text-[11px] font-bold text-mut">
                {formatStartTime(match.start_time)}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <Link
              href={`/sports/match/${match.id}`}
              className="text-xs md:text-sm font-bold text-slate-900 hover:text-accent-2 block truncate"
            >
              <span>{match.home_team}</span>
              {isLive && <span className="mx-1.5 font-black text-rose-600">{match.home_score}</span>}
              <span className="mx-1 text-mut font-normal">vs</span>
              {isLive && <span className="mr-1.5 font-black text-rose-600">{match.away_score}</span>}
              <span>{match.away_team}</span>
            </Link>
          </div>
        </div>

        {/* Inline Odds Columns: 1X2, Over/Under, BTTS */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap md:flex-nowrap">
          {/* 1X2 Market */}
          <div className="flex items-center gap-1">
            {match.market_1x2.outcomes.map((o) => {
              const active = isSelectionActive(o.id);
              return (
                <button
                  key={o.id}
                  onClick={(e) => handleOddsClick(e, "1X2", o, match.market_1x2.market_id)}
                  disabled={match.is_suspended || match.market_1x2.suspended}
                  className={`w-14 h-8 rounded flex items-center justify-between px-1.5 text-xs font-bold transition border ${
                    active
                      ? "bg-accent text-white border-accent font-black"
                      : "bg-panel border-line text-slate-800 hover:bg-panel-2 hover:border-slate-400"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <span className="text-[10px] text-mut uppercase font-semibold">{o.name}</span>
                  <span>{match.is_suspended ? <LockIcon width={10} height={10} /> : o.odds.toFixed(2)}</span>
                </button>
              );
            })}
          </div>

          {/* Over/Under Market (if available) */}
          {match.market_ou?.outcomes?.length > 0 && (
            <div className="hidden sm:flex items-center gap-1 border-l border-line/60 pl-2">
              {match.market_ou.outcomes.slice(0, 2).map((o) => {
                const active = isSelectionActive(o.id);
                return (
                  <button
                    key={o.id}
                    onClick={(e) => handleOddsClick(e, "Over/Under", o, match.market_ou.market_id)}
                    disabled={match.is_suspended || match.market_ou.suspended}
                    className={`w-16 h-8 rounded flex items-center justify-between px-1.5 text-xs font-bold transition border ${
                      active
                        ? "bg-accent text-white border-accent font-black"
                        : "bg-panel border-line text-slate-800 hover:bg-panel-2 hover:border-slate-400"
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <span className="text-[9px] text-mut truncate uppercase">{o.name.split(" ")[0]}</span>
                    <span>{o.odds.toFixed(2)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* More Markets Expand Button */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="h-8 px-2 rounded border border-line bg-panel text-[11px] font-bold text-mut hover:text-slate-900 hover:bg-panel-2 flex items-center gap-1 transition"
          >
            <span>+{match.total_markets_count}</span>
            {expanded ? <ChevronUpIcon width={12} height={12} /> : <ChevronDownIcon width={12} height={12} />}
          </button>
        </div>
      </div>

      {/* Collapsible Markets Section */}
      {expanded && (
        <div className="p-3 bg-panel-2/60 border-t border-line/60 space-y-3">
          {/* Double Chance / BTTS inline */}
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-mut-2 mb-1.5">
              Both Teams to Score (BTTS)
            </p>
            <div className="flex items-center gap-2">
              {match.market_btts.outcomes.map((o) => {
                const active = isSelectionActive(o.id);
                return (
                  <button
                    key={o.id}
                    onClick={(e) => handleOddsClick(e, "Both Teams to Score", o, match.market_btts.market_id)}
                    className={`flex-1 h-8 rounded border px-3 flex items-center justify-between text-xs font-bold transition ${
                      active
                        ? "bg-accent text-white border-accent"
                        : "bg-panel border-line text-slate-800 hover:bg-panel-2"
                    }`}
                  >
                    <span>{o.name}</span>
                    <span>{o.odds.toFixed(2)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-right">
            <Link
              href={`/sports/match/${match.id}`}
              className="text-xs font-bold text-accent-2 hover:underline"
            >
              View all markets & live stats →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
