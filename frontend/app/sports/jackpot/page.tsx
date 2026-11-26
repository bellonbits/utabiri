"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { BottomNav } from "@/components/bottom-nav";
import { BetslipPanel } from "@/components/sportsbook/betslip-panel";
import { MobileBetslipTrigger } from "@/components/sportsbook/mobile-betslip-trigger";
import { useGameWallet } from "@/lib/game-wallet";
import { TrophyIcon, SparklesIcon, CheckCircleIcon, ClockIcon, CoinsIcon, AlertCircleIcon } from "@/components/icons";

interface JackpotFixture {
  id: number;
  match: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  kickoff: string;
  pick?: "1" | "X" | "2";
}

const JACKPOT_FIXTURES: JackpotFixture[] = [
  { id: 1, match: "Arsenal vs Chelsea", homeTeam: "Arsenal", awayTeam: "Chelsea", league: "Premier League", kickoff: "Tomorrow, 19:30" },
  { id: 2, match: "Gor Mahia vs AFC Leopards", homeTeam: "Gor Mahia", awayTeam: "AFC Leopards", league: "FKF Premier League", kickoff: "Tomorrow, 15:00" },
  { id: 3, match: "Liverpool vs Manchester City", homeTeam: "Liverpool", awayTeam: "Manchester City", league: "Premier League", kickoff: "Sat, 18:00" },
  { id: 4, match: "Real Madrid vs Barcelona", homeTeam: "Real Madrid", awayTeam: "Barcelona", league: "La Liga", kickoff: "Sat, 22:00" },
  { id: 5, match: "Tusker FC vs Bandari FC", homeTeam: "Tusker FC", awayTeam: "Bandari FC", league: "FKF Premier League", kickoff: "Sat, 16:00" },
  { id: 6, match: "Bayern Munich vs Dortmund", homeTeam: "Bayern Munich", awayTeam: "Dortmund", league: "Bundesliga", kickoff: "Sat, 19:30" },
  { id: 7, match: "Inter Milan vs Juventus", homeTeam: "Inter Milan", awayTeam: "Juventus", league: "Serie A", kickoff: "Sun, 21:45" },
  { id: 8, match: "Aston Villa vs Tottenham", homeTeam: "Aston Villa", awayTeam: "Tottenham", league: "Premier League", kickoff: "Sun, 17:00" },
  { id: 9, match: "Ulinzi Stars vs KCB FC", homeTeam: "Ulinzi Stars", awayTeam: "KCB FC", league: "FKF Premier League", kickoff: "Sun, 15:00" },
  { id: 10, match: "Atletico Madrid vs Sevilla", homeTeam: "Atletico Madrid", awayTeam: "Sevilla", league: "La Liga", kickoff: "Sun, 19:00" },
  { id: 11, match: "AC Milan vs Roma", homeTeam: "AC Milan", awayTeam: "Roma", league: "Serie A", kickoff: "Sun, 21:00" },
  { id: 12, match: "Newcastle vs Manchester United", homeTeam: "Newcastle", awayTeam: "Manchester United", league: "Premier League", kickoff: "Sun, 18:30" },
  { id: 13, match: "Kakamega Homeboyz vs Posta Rangers", homeTeam: "Kakamega Homeboyz", awayTeam: "Posta Rangers", league: "FKF Premier League", kickoff: "Sun, 14:00" },
];

export default function JackpotPage() {
  const { balance, modifyBalance } = useGameWallet();
  const [fixtures, setFixtures] = useState<JackpotFixture[]>(JACKPOT_FIXTURES);
  const [stake, setStake] = useState(50);
  const [placed, setPlaced] = useState(false);
  const [ticketId, setTicketId] = useState("");

  const handlePick = (fixtureId: number, pick: "1" | "X" | "2") => {
    setFixtures((prev) =>
      prev.map((f) => (f.id === fixtureId ? { ...f, pick: f.pick === pick ? undefined : pick } : f))
    );
  };

  const handleLuckyDip = () => {
    const options: ("1" | "X" | "2")[] = ["1", "X", "2"];
    setFixtures((prev) =>
      prev.map((f) => ({
        ...f,
        pick: options[Math.floor(Math.random() * options.length)],
      }))
    );
  };

  const completedCount = fixtures.filter((f) => f.pick !== undefined).length;
  const isComplete = completedCount === 13;

  const handlePlaceJackpot = () => {
    if (!isComplete || stake > balance) return;
    modifyBalance(-stake);
    const code = "JKP-" + Math.floor(100000 + Math.random() * 900000);
    setTicketId(code);
    setPlaced(true);
  };

  return (
    <div className="min-h-dvh bg-ink">
      <Navbar />

      {/* Full-width Plain Strip Banner */}
      <div className="border-b border-line bg-panel px-4 py-3">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-white bg-accent px-2 py-0.5">
                Weekly Jackpot
              </span>
              <span className="text-xs font-semibold text-mut">13 Fixtures</span>
            </div>
            <h1 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
              Utabiri Super 13 Jackpot
            </h1>
            <p className="text-xs text-mut">
              Pick 1X2 for all 13 matches. Guaranteed 10,000,000 KES/Coins Grand Prize + bonuses for 10, 11 & 12 correct.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLuckyDip}
              className="border border-line bg-panel-2 hover:bg-line px-3.5 py-2 text-xs font-black text-slate-800 transition cursor-pointer flex items-center gap-1.5"
            >
              <SparklesIcon className="h-4 w-4 text-accent" /> Auto Pick (Lucky Dip)
            </button>
            <div className="border border-line bg-ink px-3 py-1.5 text-right">
              <span className="text-[10px] uppercase font-bold text-mut block">Jackpot Pool</span>
              <span className="text-lg font-black text-accent">10,000,000 KES</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
          {/* Matches Dense List */}
          <div className="border border-line bg-panel">
            {/* Table Header */}
            <div className="grid grid-cols-[40px_1fr_180px] sm:grid-cols-[50px_1fr_240px] items-center px-4 py-2 border-b border-line text-[11px] font-black uppercase text-mut bg-panel-2">
              <span>#</span>
              <span>Match & Kick-off</span>
              <div className="grid grid-cols-3 text-center">
                <span>1 (Home)</span>
                <span>X (Draw)</span>
                <span>2 (Away)</span>
              </div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-line">
              {fixtures.map((f) => (
                <div key={f.id} className="grid grid-cols-[40px_1fr_180px] sm:grid-cols-[50px_1fr_240px] items-center px-4 py-3 hover:bg-panel-2 transition">
                  <span className="font-mono text-xs font-bold text-mut">{f.id}</span>

                  <div className="pr-2">
                    <span className="text-sm font-black text-slate-900 block truncate">
                      {f.homeTeam} <span className="text-mut font-normal">vs</span> {f.awayTeam}
                    </span>
                    <span className="text-[11px] text-mut font-medium flex items-center gap-2 mt-0.5">
                      <span>{f.league}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><ClockIcon className="h-3 w-3" /> {f.kickoff}</span>
                    </span>
                  </div>

                  {/* Pick Buttons */}
                  <div className="grid grid-cols-3 gap-1">
                    {(["1", "X", "2"] as const).map((opt) => {
                      const isSelected = f.pick === opt;
                      return (
                        <button
                          key={opt}
                          onClick={() => handlePick(f.id, opt)}
                          className={`h-9 text-xs font-black border transition cursor-pointer ${
                            isSelected
                              ? "bg-accent text-white border-accent shadow-xs"
                              : "bg-ink border-line text-slate-800 hover:border-accent/60"
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sticky Summary Side Panel */}
          <div className="border border-line bg-panel p-4 space-y-4 sticky top-20">
            <div className="flex items-center justify-between border-b border-line pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <TrophyIcon className="h-4 w-4 text-accent" /> Entry Ticket
              </span>
              <span className={`text-xs font-bold ${isComplete ? "text-emerald-600" : "text-amber-600"}`}>
                {completedCount}/13 selected
              </span>
            </div>

            {placed ? (
              <div className="border border-emerald-500/50 bg-emerald-50 p-4 text-center space-y-2">
                <CheckCircleIcon className="h-8 w-8 text-emerald-600 mx-auto" />
                <h3 className="text-base font-black text-emerald-900">Jackpot Entry Placed!</h3>
                <p className="text-xs text-emerald-800">
                  Ticket code: <strong className="font-mono font-black">{ticketId}</strong>
                </p>
                <button
                  onClick={() => {
                    setPlaced(false);
                    handleLuckyDip();
                  }}
                  className="mt-2 w-full bg-emerald-600 text-white py-2 text-xs font-black uppercase hover:bg-emerald-700 transition cursor-pointer"
                >
                  Place Another Entry
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-mut">
                  <span>Entry Stake:</span>
                  <span className="font-black text-slate-900">50 KES</span>
                </div>

                <div className="flex items-center justify-between text-xs text-mut">
                  <span>Grand Prize:</span>
                  <span className="font-black text-accent text-sm">10,000,000 KES</span>
                </div>

                <div className="flex items-center justify-between text-xs text-mut">
                  <span>Your Balance:</span>
                  <span className="font-bold text-slate-800">{balance.toLocaleString()} Coins</span>
                </div>

                {!isComplete && (
                  <div className="border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 flex items-start gap-2">
                    <AlertCircleIcon className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>Please select an outcome for all 13 matches or click Auto Pick.</span>
                  </div>
                )}

                <button
                  onClick={handlePlaceJackpot}
                  disabled={!isComplete || stake > balance}
                  className="w-full py-3 bg-accent text-white font-black text-xs uppercase tracking-wider hover:bg-accent-2 transition disabled:opacity-50 cursor-pointer"
                >
                  {isComplete ? "SUBMIT JACKPOT TICKET (50 KES)" : `SELECT ALL 13 (${completedCount}/13)`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
      <BottomNav />
      <BetslipPanel />
      <MobileBetslipTrigger />
    </div>
  );
}
