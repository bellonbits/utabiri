"use client";

import { useEffect, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { BetslipPanel } from "@/components/sportsbook/betslip-panel";
import { MatchData, MatchRow } from "@/components/sportsbook/match-row";
import { MobileBetslipTrigger } from "@/components/sportsbook/mobile-betslip-trigger";
import { SportsNav } from "@/components/sportsbook/sports-nav";
import { SportsSidebar } from "@/components/sportsbook/sports-sidebar";
import { ActivityIcon } from "@/components/icons";
import { api } from "@/lib/api";

export default function LiveSportsPage() {
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLive = () => {
    api<{ items: MatchData[] }>("/sports/matches?status=live", { token: null })
      .then((res) => setMatches(res.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLive();
    const interval = setInterval(fetchLive, 4000); // 4-sec live score poll
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-ink flex flex-col">
      <Navbar />
      <SportsNav activeSport="football" activeFilter="live" />

      <div className="flex-1 flex max-w-screen-2xl mx-auto w-full">
        <SportsSidebar activeSport="football" />

        <main className="flex-1 min-w-0 bg-panel border-r border-line pb-24 md:pb-12">
          {/* Live In-Play Banner Strip */}
          <div className="border-b border-line bg-rose-50 px-4 py-2.5 flex items-center justify-between text-xs font-black text-rose-800">
            <div className="flex items-center gap-2">
              <ActivityIcon width={16} height={16} className="text-rose-600 animate-pulse" />
              <span>LIVE IN-PLAY SPORTSBOOK</span>
            </div>
            <span className="text-[11px] font-bold text-rose-600">Auto-updating live odds</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs font-bold text-mut">
              Connecting to live in-play pitch feeds…
            </div>
          ) : matches.length === 0 ? (
            <div className="p-12 text-center text-xs text-mut">
              No live matches right now. Check upcoming fixtures.
            </div>
          ) : (
            <div className="divide-y divide-line/60">
              {matches.map((m) => (
                <MatchRow key={m.id} match={m} />
              ))}
            </div>
          )}
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
