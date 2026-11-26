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
import { PlaneIcon, DiscIcon, CastleIcon, CoinsIcon, ShieldIcon } from "@/components/icons";

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
    <main className="w-full pb-24 md:pb-12">
      {/* Top Sportsbook Header Strip */}
      <div className="border-b border-line bg-panel px-4 py-3">
        <div className="mx-auto max-w-7xl flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-accent border border-accent/30 bg-accent/10 px-2 py-0.5">
                Utabiri Bet Arcade
              </span>
              <span className="text-xs font-semibold text-mut flex items-center gap-1">
                <ShieldIcon className="h-3.5 w-3.5 text-emerald-500" /> Provably Fair Gaming
              </span>
            </div>
            <h1 className="mt-1 text-xl md:text-2xl font-black tracking-tight text-slate-900">
              Interactive Games
            </h1>
            <p className="text-xs text-mut">
              Aviator crash curve, fortune wheel multipliers, and Chess Master with Stockfish AI analysis.
            </p>
          </div>

          {/* Balance & Refill */}
          <div className="flex items-center gap-3 border border-line bg-ink px-4 py-2 self-start sm:self-auto">
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-mut">
                Wallet Balance
              </span>
              <span className="text-lg font-black text-amber-600 flex items-center gap-1.5">
                <CoinsIcon className="h-4 w-4 text-amber-500" />
                {balance.toLocaleString()} <span className="text-xs text-mut font-bold">Coins</span>
              </span>
            </div>
            <button
              onClick={refill}
              className="bg-accent px-3 py-1.5 text-xs font-black text-white hover:bg-accent-2 transition cursor-pointer"
              title="Claim daily bonus coins"
            >
              +500 Free
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Sport Tabs */}
      <div className="border-b border-line bg-panel px-4">
        <div className="mx-auto max-w-7xl flex items-center gap-2 overflow-x-auto py-2">
          <button
            onClick={() => setActiveTab("aviator")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider transition cursor-pointer border ${
              activeTab === "aviator"
                ? "border-rose-600 bg-rose-600 text-white"
                : "border-line bg-panel text-slate-700 hover:bg-panel-2"
            }`}
          >
            <PlaneIcon className="h-4 w-4" /> Aviator
          </button>

          <button
            onClick={() => setActiveTab("wheel")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider transition cursor-pointer border ${
              activeTab === "wheel"
                ? "border-amber-500 bg-amber-500 text-slate-950"
                : "border-line bg-panel text-slate-700 hover:bg-panel-2"
            }`}
          >
            <DiscIcon className="h-4 w-4" /> Spin the Wheel
          </button>

          <button
            onClick={() => setActiveTab("chess")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider transition cursor-pointer border ${
              activeTab === "chess"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-line bg-panel text-slate-700 hover:bg-panel-2"
            }`}
          >
            <CastleIcon className="h-4 w-4" /> Chess Master
          </button>
        </div>
      </div>

      {/* Active Game Arena */}
      <div className="mx-auto max-w-7xl px-4 pt-4">
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
      <Suspense fallback={<div className="p-12 text-center text-sm font-bold text-mut">Loading Games…</div>}>
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
