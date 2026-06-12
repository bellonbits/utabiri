"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type ApiMarket } from "@/lib/api";
import { markets as staticMarkets, type Market } from "@/lib/data";
import { MarketCard } from "@/components/market-card";
import {
  BookmarkIcon,
  ChevronDownIcon,
  FilterIcon,
  GridIcon,
  ListIcon,
  SearchIcon,
  SparkIcon,
} from "@/components/icons";

/** Overlay live backend prices onto the static card data (by outcome index). */
function mergeLive(m: Market, live?: ApiMarket): Market {
  if (!live) return m;
  const pct = (i: number, fallback: number) => {
    const o = live.outcomes[i];
    return o ? Math.round(o.price_yes * 100) : fallback;
  };
  if (m.kind === "binary") return { ...m, yes: pct(0, m.yes ?? 50) };
  if (m.kind === "matchup" && m.teams) {
    return {
      ...m,
      teams: [
        { ...m.teams[0], pct: pct(0, m.teams[0].pct) },
        { ...m.teams[1], pct: pct(1, m.teams[1].pct) },
      ],
    };
  }
  if (m.outcomes) {
    return {
      ...m,
      outcomes: m.outcomes.map((o, i) => ({ ...o, yes: pct(i, o.yes) })),
    };
  }
  return m;
}

export function MarketExplorer() {
  const [live, setLive] = useState<Map<string, ApiMarket>>(new Map());
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState("All");

  useEffect(() => {
    const load = () =>
      api<{ items: ApiMarket[] }>("/markets", { token: null })
        .then((r) => setLive(new Map(r.items.map((m) => [m.id, m]))))
        .catch(() => {});
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, []);

  const chips = useMemo(() => {
    const cats = Array.from(
      new Set(staticMarkets.map((m) => m.category).filter(Boolean)),
    ) as string[];
    return ["All", ...cats];
  }, []);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return staticMarkets
      .filter((m) => chip === "All" || m.category === chip)
      .filter(
        (m) =>
          !q ||
          m.question.toLowerCase().includes(q) ||
          (m.category ?? "").toLowerCase().includes(q),
      )
      .map((m) => mergeLive(m, live.get(m.id)));
  }, [query, chip, live]);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold tracking-tight">All markets</h2>
        <span className="flex items-center gap-2 text-mut">
          <SearchIcon width={16} height={16} />
          <FilterIcon width={16} height={16} />
          <BookmarkIcon width={16} height={16} />
        </span>
      </div>

      {/* controls */}
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2">
          <SearchIcon className="shrink-0 text-mut-2" width={16} height={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search markets"
            className="w-full bg-transparent text-sm outline-none placeholder:text-mut-2"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-xs font-bold text-mut hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
        <button className="hidden items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-sm font-medium text-white sm:flex">
          <SparkIcon width={14} height={14} className="text-accent-2" />
          Newest
          <ChevronDownIcon width={14} height={14} className="text-mut" />
        </button>
        <div className="hidden overflow-hidden rounded-lg border border-line sm:flex">
          <button className="bg-accent p-2.5 text-white">
            <GridIcon width={16} height={16} />
          </button>
          <button className="bg-panel p-2.5 text-mut hover:text-white">
            <ListIcon width={16} height={16} />
          </button>
        </div>
      </div>

      {/* topic chips — these actually filter */}
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
        {chips.map((c) => (
          <button
            key={c}
            onClick={() => setChip(c)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              chip === c
                ? "bg-white text-ink"
                : "border border-line bg-panel text-mut hover:text-white"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-panel p-10 text-center">
          <p className="text-base font-bold">No markets match</p>
          <p className="mt-1 text-sm text-mut">
            Try a different search or topic.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {items.map((m) => (
            <MarketCard key={m.id} market={m} />
          ))}
        </div>
      )}
    </section>
  );
}
