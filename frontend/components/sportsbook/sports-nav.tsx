"use client";

import Link from "next/link";
import {
  ActivityIcon,
  BasketballIcon,
  CricketIcon,
  FootballIcon,
  RugbyIcon,
  TennisIcon,
  TrophyIcon,
  VirtualsIcon,
} from "@/components/icons";

const SPORTS = [
  { id: "football", name: "Football", Icon: FootballIcon },
  { id: "basketball", name: "Basketball", Icon: BasketballIcon },
  { id: "tennis", name: "Tennis", Icon: TennisIcon },
  { id: "rugby", name: "Rugby", Icon: RugbyIcon },
  { id: "cricket", name: "Cricket", Icon: CricketIcon },
  { id: "virtuals", name: "Virtuals", Icon: VirtualsIcon },
];

export function SportsNav({
  activeSport = "football",
  activeFilter = "all",
}: {
  activeSport?: string;
  activeFilter?: string;
}) {
  return (
    <div className="border-b border-line bg-panel sticky top-14 z-30">
      {/* Sticky Sport Icons Tab Bar */}
      <div className="flex items-center gap-1 overflow-x-auto px-4 py-2 border-b border-line/60">
        <Link
          href="/live"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-black bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 shrink-0"
        >
          <ActivityIcon width={14} height={14} className="animate-pulse text-rose-600" />
          <span>LIVE NOW</span>
        </Link>

        {SPORTS.map(({ id, name, Icon }) => {
          const isSelected = id === activeSport;
          return (
            <Link
              key={id}
              href={`/sports?sport=${id}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold shrink-0 transition ${
                isSelected
                  ? "bg-accent text-white font-black"
                  : "bg-panel-2 text-mut hover:text-slate-900 border border-line"
              }`}
            >
              <Icon width={14} height={14} />
              <span>{name}</span>
            </Link>
          );
        })}
      </div>

      {/* Sub-Filters Strip: All | Live | Today | Upcoming */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-panel-2/40 text-xs font-semibold">
        <div className="flex items-center gap-4 text-mut">
          <Link
            href={`/sports?sport=${activeSport}&filter=all`}
            className={`hover:text-slate-900 ${activeFilter === "all" ? "text-accent-2 font-black" : ""}`}
          >
            All Matches
          </Link>
          <Link
            href={`/sports?sport=${activeSport}&filter=live`}
            className={`hover:text-slate-900 flex items-center gap-1 ${activeFilter === "live" ? "text-rose-600 font-black" : ""}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
            Live In-Play
          </Link>
          <Link
            href={`/sports?sport=${activeSport}&filter=today`}
            className={`hover:text-slate-900 ${activeFilter === "today" ? "text-accent-2 font-black" : ""}`}
          >
            Today
          </Link>
          <Link
            href={`/sports?sport=${activeSport}&filter=upcoming`}
            className={`hover:text-slate-900 ${activeFilter === "upcoming" ? "text-accent-2 font-black" : ""}`}
          >
            Upcoming
          </Link>
        </div>

        <Link
          href="/predictor"
          className="text-xs font-black text-accent-2 hover:underline flex items-center gap-1"
        >
          <span>Honest AI Predictions</span> →
        </Link>
      </div>

      {/* Plain Full-Width Jackpot Strip Banner (NO CARDS, plain full-width strip) */}
      <div className="bg-slate-900 text-white px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-line">
        <div className="flex items-center gap-2">
          <TrophyIcon width={16} height={16} className="text-amber-400 shrink-0" />
          <span className="text-xs uppercase font-extrabold tracking-wider text-amber-400">
            Mega Jackpot
          </span>
          <span className="text-xs text-white/90">
            Prize Pool: <strong className="text-amber-300">15,000,000 KES</strong> (13 Matches)
          </span>
        </div>
        <Link
          href="/sports/jackpot"
          className="rounded bg-accent hover:bg-accent-2 px-3 py-1 text-xs font-black text-white shrink-0"
        >
          Enter for 50 Coins
        </Link>
      </div>
    </div>
  );
}
