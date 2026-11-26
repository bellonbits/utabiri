"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { AviatorGame } from "@/components/games/aviator-game";
import { ChessGame } from "@/components/games/chess-game";
import { SpinTheWheelGame } from "@/components/games/wheel-game";
import { useGameWallet } from "@/lib/game-wallet";

export type GameTab = "aviator" | "wheel" | "chess";

interface GamesHubProps {
  defaultTab?: GameTab;
}

function GamesContent({ defaultTab = "aviator" }: GamesHubProps) {
  const searchParams = useSearchParams();
  const tabFromQuery = searchParams ? (searchParams.get("tab") as GameTab) : null;
  const [activeTab, setActiveTab] = useState<GameTab>(tabFromQuery || defaultTab);
  const { balance, refill } = useGameWallet();

  useEffect(() => {
    if (tabFromQuery && (tabFromQuery === "aviator" || tabFromQuery === "wheel" || tabFromQuery === "chess")) {
      setActiveTab(tabFromQuery);
    }
  }, [tabFromQuery]);

  return (
    <main className="mx-auto max-w-screen-xl px-4 pb-24 pt-6 md:pb-12">
      {/* Top Banner & Wallet Bar */}
      <div className="flex flex-col gap-4 rounded-3xl border border-line bg-gradient-to-r from-panel via-panel to-panel-2 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-accent-2">
              Utabiri Arcade
            </span>
            <span className="text-xs font-semibold text-mut">Provably Fair Games</span>
          </div>
          <h1 className="mt-1 text-2xl md:text-3xl font-black tracking-tight text-slate-900">
            Games & Challenges
          </h1>
          <p className="mt-1 text-xs md:text-sm text-mut-2">
            Test your prediction nerves on Aviator, spin the fortune wheel, or play chess against Utabiri AI.
          </p>
        </div>

        {/* Balance & Refill Pill */}
        <div className="flex items-center gap-3 self-start sm:self-auto rounded-2xl border border-line bg-ink px-4 py-3 shadow-inner">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-wider text-mut-2">
              Game Balance
            </span>
            <span className="text-xl font-black text-amber-600 flex items-center gap-1">
              🪙 {balance.toLocaleString()} <span className="text-xs text-mut-2 font-bold">Coins</span>
            </span>
          </div>
          <button
            onClick={refill}
            className="rounded-xl bg-accent px-3.5 py-2 text-xs font-black text-white hover:bg-accent-2 transition shadow-xs active:scale-95 cursor-pointer"
            title="Claim daily bonus coins"
          >
            +500 Free
          </button>
        </div>
      </div>

      {/* Game Selector Tabs */}
      <div className="mt-6 flex flex-wrap gap-2 border-b border-line pb-4">
        <button
          onClick={() => setActiveTab("aviator")}
          className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold transition cursor-pointer ${
            activeTab === "aviator"
              ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
              : "border border-line bg-panel text-slate-700 hover:bg-panel-2"
          }`}
        >
          <span className="text-lg">✈️</span> Aviator
        </button>

        <button
          onClick={() => setActiveTab("wheel")}
          className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold transition cursor-pointer ${
            activeTab === "wheel"
              ? "bg-amber-500 text-slate-900 shadow-md shadow-amber-500/20"
              : "border border-line bg-panel text-slate-700 hover:bg-panel-2"
          }`}
        >
          <span className="text-lg">🎡</span> Spin the Wheel
        </button>

        <button
          onClick={() => setActiveTab("chess")}
          className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold transition cursor-pointer ${
            activeTab === "chess"
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
              : "border border-line bg-panel text-slate-700 hover:bg-panel-2"
          }`}
        >
          <span className="text-lg">♟️</span> Chess Master
        </button>
      </div>

      {/* Active Game Stage */}
      <div className="mt-6">
        {activeTab === "aviator" && <AviatorGame />}
        {activeTab === "wheel" && <SpinTheWheelGame />}
        {activeTab === "chess" && <ChessGame />}
      </div>
    </main>
  );
}

export function GamesHub({ defaultTab = "aviator" }: GamesHubProps) {
  return (
    <div className="min-h-dvh bg-ink">
      <Navbar />
      <Suspense fallback={<div className="p-12 text-center text-sm font-bold text-mut">Loading Arcade…</div>}>
        <GamesContent defaultTab={defaultTab} />
      </Suspense>
      <Footer />
      <BottomNav />
    </div>
  );
}

export default function GamesPage() {
  return <GamesHub defaultTab="aviator" />;
}
