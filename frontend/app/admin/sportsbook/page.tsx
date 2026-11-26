"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { BottomNav } from "@/components/bottom-nav";
import {
  SlidersIcon,
  ShieldIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ClockIcon,
  XCircleIcon,
  FileTextIcon,
  ActivityIcon,
} from "@/components/icons";

interface AdminOutcome {
  id: string;
  name: string;
  odds: number;
  status: string;
}

interface AdminMarket {
  id: string;
  name: string;
  is_suspended: boolean;
  outcomes: AdminOutcome[];
}

interface AdminMatch {
  id: string;
  home_team: string;
  away_team: string;
  status: string;
  home_score: number;
  away_score: number;
  minute?: number;
  scheduled_at: string;
  markets: AdminMarket[];
}

interface AuditItem {
  id: number;
  action: string;
  user_id: string;
  metadata_json: string;
  created_at: string;
}

interface RiskItem {
  user: string;
  risk_level: string;
  reason: string;
  flagged_at: string;
}

export default function AdminSportsbookPage() {
  const [matches, setMatches] = useState<AdminMatch[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditItem[]>([]);
  const [riskFlags, setRiskFlags] = useState<RiskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  // Score settlement state per match
  const [scoreInputs, setScoreInputs] = useState<Record<string, { home: number; away: number }>>({});
  // Odds editing state per outcome
  const [editingOdds, setEditingOdds] = useState<Record<string, number>>({});

  const fetchOverview = async () => {
    try {
      const res = await fetch("/backend/admin/sportsbook/overview");
      if (res.ok) {
        const data = await res.json();
        setMatches(data.matches || []);
        setAuditLogs(data.audit_logs || []);
        setRiskFlags(data.risk_flags || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleUpdateOdds = async (outcomeId: string) => {
    const newOdds = editingOdds[outcomeId];
    if (!newOdds || newOdds <= 1.0) return;

    try {
      const res = await fetch("/backend/admin/sportsbook/odds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome_id: outcomeId, new_odds: newOdds }),
      });
      if (res.ok) {
        setMessage(`Odds updated to ${newOdds} for outcome`);
        fetchOverview();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleSuspend = async (marketId: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/backend/admin/sportsbook/suspend", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market_id: marketId, is_suspended: !currentStatus }),
      });
      if (res.ok) {
        setMessage(`Market ${!currentStatus ? "suspended" : "resumed"}`);
        fetchOverview();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSettleMatch = async (matchId: string) => {
    const scores = scoreInputs[matchId] || { home: 0, away: 0 };
    try {
      const res = await fetch("/backend/admin/sportsbook/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_id: matchId,
          home_score: scores.home,
          away_score: scores.away,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessage(`Match settled! ${data.settled_bets_count || 0} bets paid out.`);
        fetchOverview();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-dvh bg-ink">
      <Navbar />

      {/* Admin Full-width Strip Header */}
      <div className="border-b border-line bg-panel px-4 py-3">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-white bg-slate-900 px-2 py-0.5">
                Sportsbook Backoffice
              </span>
              <span className="text-xs font-semibold text-mut">Odds, Suspension & Settlement Engine</span>
            </div>
            <h1 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
              Admin Sportsbook Management
            </h1>
          </div>

          {message && (
            <div className="border border-emerald-400 bg-emerald-50 text-emerald-800 text-xs px-3 py-1.5 flex items-center gap-2 font-bold">
              <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
              <span>{message}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 space-y-8">
        {/* Section 1: Matches, Odds & Settlement */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <SlidersIcon className="h-4 w-4 text-accent" /> Active Fixtures & Live Settlement
            </h2>
            <button
              onClick={fetchOverview}
              className="text-xs font-bold text-accent hover:underline cursor-pointer"
            >
              Refresh Fixtures
            </button>
          </div>

          <div className="border border-line bg-panel divide-y divide-line">
            {matches.length === 0 ? (
              <div className="p-8 text-center text-xs text-mut font-medium">
                No active fixtures found. Bootstrap or add matches in database.
              </div>
            ) : (
              matches.map((m) => {
                const homeScore = scoreInputs[m.id]?.home ?? m.home_score;
                const awayScore = scoreInputs[m.id]?.away ?? m.away_score;

                return (
                  <div key={m.id} className="p-4 space-y-3 hover:bg-panel-2 transition">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 ${
                            m.status === "live" ? "bg-rose-600 text-white" : m.status === "finished" ? "bg-slate-700 text-white" : "bg-panel-2 text-slate-700 border border-line"
                          }`}>
                            {m.status} {m.status === "live" ? `${m.minute}'` : ""}
                          </span>
                          <span className="text-xs text-mut font-mono">ID: {m.id.slice(0, 8)}</span>
                        </div>
                        <h3 className="text-base font-black text-slate-900 mt-1">
                          {m.home_team} vs {m.away_team}
                        </h3>
                      </div>

                      {/* Score Input & Settlement Action */}
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <div className="flex items-center gap-1 border border-line bg-ink px-2 py-1">
                          <span className="text-xs font-bold text-mut">Final:</span>
                          <input
                            type="number"
                            min="0"
                            value={homeScore}
                            onChange={(e) =>
                              setScoreInputs((prev) => ({
                                ...prev,
                                [m.id]: { home: parseInt(e.target.value) || 0, away: awayScore },
                              }))
                            }
                            className="w-10 border border-line bg-panel text-center text-xs font-black text-slate-900"
                          />
                          <span className="text-xs font-bold text-mut">-</span>
                          <input
                            type="number"
                            min="0"
                            value={awayScore}
                            onChange={(e) =>
                              setScoreInputs((prev) => ({
                                ...prev,
                                [m.id]: { home: homeScore, away: parseInt(e.target.value) || 0 },
                              }))
                            }
                            className="w-10 border border-line bg-panel text-center text-xs font-black text-slate-900"
                          />
                        </div>

                        <button
                          onClick={() => handleSettleMatch(m.id)}
                          className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 text-xs font-black uppercase transition cursor-pointer"
                        >
                          Settle & Pay Bets
                        </button>
                      </div>
                    </div>

                    {/* Markets and Odds Table */}
                    <div className="space-y-2 pt-1">
                      {m.markets.map((mkt) => (
                        <div key={mkt.id} className="border border-line bg-ink p-2.5 space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-slate-800 font-black">{mkt.name}</span>
                            <button
                              onClick={() => handleToggleSuspend(mkt.id, mkt.is_suspended)}
                              className={`px-2 py-0.5 text-[10px] font-black uppercase border transition cursor-pointer ${
                                mkt.is_suspended
                                  ? "border-rose-500 bg-rose-50 text-rose-700"
                                  : "border-emerald-500 bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {mkt.is_suspended ? "Suspended (Click to Open)" : "Active (Click to Suspend)"}
                            </button>
                          </div>

                          {/* Outcomes */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {mkt.outcomes.map((out) => {
                              const currVal = editingOdds[out.id] ?? out.odds;
                              return (
                                <div key={out.id} className="flex items-center justify-between border border-line bg-panel px-2 py-1 text-xs">
                                  <span className="font-bold text-slate-700 truncate pr-1">{out.name}</span>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      step="0.05"
                                      min="1.01"
                                      value={currVal}
                                      onChange={(e) =>
                                        setEditingOdds((prev) => ({
                                          ...prev,
                                          [out.id]: parseFloat(e.target.value) || 1.05,
                                        }))
                                      }
                                      className="w-14 border border-line text-center text-xs font-black text-slate-900"
                                    />
                                    <button
                                      onClick={() => handleUpdateOdds(out.id)}
                                      className="bg-accent text-white px-1.5 py-0.5 text-[10px] font-black uppercase hover:bg-accent-2 cursor-pointer"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Section 2: User Risk Flags & Audit Log */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Risk Flags */}
          <div className="space-y-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-line pb-2">
              <ShieldIcon className="h-4 w-4 text-rose-500" /> Compliance & Risk Flags
            </h2>
            <div className="border border-line bg-panel divide-y divide-line text-xs">
              {riskFlags.map((rf, idx) => (
                <div key={idx} className="p-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{rf.user}</span>
                      <span className={`px-1.5 py-0.2 text-[10px] font-black uppercase ${
                        rf.risk_level === "High" ? "bg-rose-100 text-rose-800" : rf.risk_level === "Medium" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
                      }`}>
                        {rf.risk_level} Risk
                      </span>
                    </div>
                    <p className="text-xs text-mut mt-1">{rf.reason}</p>
                  </div>
                  <span className="text-[10px] text-mut shrink-0">{rf.flagged_at}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Log */}
          <div className="space-y-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-line pb-2">
              <FileTextIcon className="h-4 w-4 text-accent" /> Sportsbook Audit Trail
            </h2>
            <div className="border border-line bg-panel divide-y divide-line text-xs max-h-[300px] overflow-y-auto">
              {auditLogs.length === 0 ? (
                <div className="p-4 text-center text-xs text-mut">No audit events recorded yet.</div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">{log.action}</span>
                      <span className="font-mono text-[10px] text-mut">{log.metadata_json}</span>
                    </div>
                    <span className="text-[10px] text-mut shrink-0 font-mono">
                      {log.created_at?.slice(11, 19)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <BottomNav />
    </div>
  );
}
