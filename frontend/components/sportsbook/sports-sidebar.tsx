"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  ActivityIcon,
  BasketballIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CricketIcon,
  FootballIcon,
  RugbyIcon,
  TennisIcon,
  VirtualsIcon,
} from "@/components/icons";

interface TournamentItem {
  id: string;
  name: string;
  slug: string;
}

interface CategoryItem {
  id: string;
  name: string;
  country_code: string | null;
  tournaments: TournamentItem[];
}

interface SportNode {
  id: string;
  name: string;
  slug: string;
  categories: CategoryItem[];
}

const SPORT_ICONS: Record<string, React.FC<{ width?: number; height?: number; className?: string }>> = {
  football: FootballIcon,
  basketball: BasketballIcon,
  tennis: TennisIcon,
  rugby: RugbyIcon,
  cricket: CricketIcon,
  virtuals: VirtualsIcon,
};

export function SportsSidebar({ activeSport = "football" }: { activeSport?: string }) {
  const [tree, setTree] = useState<SportNode[]>([]);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    cat_eng: true,
    cat_ke: true,
  });

  useEffect(() => {
    api<{ tree: SportNode[] }>("/sports/tree", { token: null })
      .then((res) => setTree(res.tree))
      .catch(() => {});
  }, []);

  const toggleCategory = (catId: string) => {
    setOpenCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  return (
    <nav className="w-60 shrink-0 border-r border-line bg-panel flex flex-col h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto hidden md:flex">
      {/* Live Shortcut */}
      <Link
        href="/live"
        className="flex items-center justify-between px-3 py-2.5 border-b border-line bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-black transition"
      >
        <div className="flex items-center gap-2">
          <ActivityIcon width={16} height={16} className="text-rose-600 animate-pulse" />
          <span>Live In-Play</span>
        </div>
        <span className="rounded bg-rose-600 px-1.5 py-0.2 text-[10px] font-black text-white">
          LIVE
        </span>
      </Link>

      {/* Sports Tree */}
      <div className="divide-y divide-line/60">
        {tree.map((s) => {
          const Icon = SPORT_ICONS[s.id] || FootballIcon;
          const isCurrent = s.id === activeSport;

          return (
            <div key={s.id} className="py-1">
              <Link
                href={`/sports?sport=${s.id}`}
                className={`flex items-center justify-between px-3 py-2 text-xs font-bold transition ${
                  isCurrent ? "text-accent-2 bg-accent/5 font-black" : "text-slate-800 hover:bg-panel-2"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon width={16} height={16} className={isCurrent ? "text-accent-2" : "text-mut"} />
                  <span>{s.name}</span>
                </div>
              </Link>

              {/* Sub-Categories */}
              <div className="pl-4 pr-2 space-y-0.5 text-xs">
                {s.categories.map((c) => {
                  const isOpen = !!openCategories[c.id];
                  return (
                    <div key={c.id}>
                      <button
                        onClick={() => toggleCategory(c.id)}
                        className="w-full flex items-center justify-between py-1 text-slate-700 hover:text-slate-950 font-semibold"
                      >
                        <span>{c.name}</span>
                        {isOpen ? (
                          <ChevronDownIcon width={12} height={12} className="text-mut" />
                        ) : (
                          <ChevronRightIcon width={12} height={12} className="text-mut" />
                        )}
                      </button>

                      {isOpen && (
                        <div className="pl-2 border-l border-line/60 space-y-0.5 my-0.5">
                          {c.tournaments.map((t) => (
                            <Link
                              key={t.id}
                              href={`/sports?sport=${s.id}&tournament=${t.id}`}
                              className="block py-1 text-[11px] text-mut hover:text-accent-2 truncate font-medium"
                            >
                              {t.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
