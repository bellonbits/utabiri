"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { BetslipPanel } from "@/components/sportsbook/betslip-panel";
import { MatchData, MatchRow } from "@/components/sportsbook/match-row";
import { MobileBetslipTrigger } from "@/components/sportsbook/mobile-betslip-trigger";
import { SportsNav } from "@/components/sportsbook/sports-nav";
import { SportsSidebar } from "@/components/sportsbook/sports-sidebar";
import { api } from "@/lib/api";

function SportsContent() {
  const searchParams = useSearchParams();
  const sport = searchParams.get("sport") || "football";
  const filter = searchParams.get("filter") || "all";
  const tournamentId = searchParams.get("tournament") || "";

  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ sport });
    if (tournamentId) params.set("tournament_id", tournamentId);
    if (filter === "live") params.set("status", "live");
    if (filter === "upcoming") params.set("status", "upcoming");

    api<{ items: MatchData[] }>(`/sports/matches?${params}`, { token: null })
      .then((res) => setMatches(res.items || []))
      .catch(() => setMatches([]))
      .finally(() => setLoading(false));
  }, [sport, filter, tournamentId]);

  return (
    <div className="min-h-screen bg-ink flex flex-col">
      <Navbar />
      <SportsNav activeSport={sport} activeFilter={filter} />

      {/* Main Full-Width Sportsbook Grid (NO CARDS, thin dividers) */}
      <div className="flex-1 flex max-w-screen-2xl mx-auto w-full">
        {/* Left Sidebar */}
        <SportsSidebar activeSport={sport} />

        {/* Center Main Content: Dense Match Rows & Tables */}
        <main className="flex-1 min-w-0 bg-panel border-r border-line pb-24 md:pb-12">
          {/* Table Header Strip */}
          <div className="border-b border-line bg-panel-2 px-4 py-2 flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-800">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent" />
              <span>{sport.toUpperCase()} MATCHES & ODDS</span>
            </div>
            <span className="text-[11px] text-mut font-semibold">1 / X / 2</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs font-bold text-mut">
              Loading sports fixtures & live markets…
            </div>
          ) : matches.length === 0 ? (
            <div className="p-12 text-center text-xs text-mut">
              No matches found for this filter. Check back soon.
            </div>
          ) : (
            <div className="divide-y divide-line/60">
              {matches.map((m) => (
                <MatchRow key={m.id} match={m} />
              ))}
            </div>
          )}
        </main>

        {/* Right Desktop Persistent Betslip Panel */}
        <BetslipPanel isDesktop={true} />
      </div>

      {/* Mobile Drawer & Floating Trigger */}
      <BetslipPanel isDesktop={false} />
      <MobileBetslipTrigger />

      <Footer />
      <BottomNav />
    </div>
  );
}

export default function SportsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-mut">Loading Utabiri Bet…</div>}>
      <SportsContent />
    </Suspense>
  );
}
