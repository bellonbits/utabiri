"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { gradientFor } from "@/lib/data";

type Row = {
  rank: number;
  display_name: string;
  profit_cents: number;
  volume_cents: number;
};

function fmtKes(cents: number): string {
  const kes = cents / 100;
  if (kes >= 1_000_000) return `KES ${(kes / 1_000_000).toFixed(1)}M`;
  if (kes >= 1_000) return `KES ${Math.round(kes / 1_000)}K`;
  return `KES ${Math.round(kes)}`;
}

/** Live leaderboard snippet; renders nothing until there are traders. */
export function TopTraders() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    api<{ items: Row[] }>("/leaderboard", { token: null })
      .then((r) => setRows(r.items.filter((x) => x.volume_cents > 0)))
      .catch(() => {});
  }, []);

  if (rows.length === 0) return null;
  return (
    <section className="rounded-xl border border-line bg-panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-bold">Top Traders</h4>
        <a
          href="/leaderboard"
          className="text-xs font-semibold text-mut hover:text-white"
        >
          Show all
        </a>
      </div>
      <ol className="grid grid-cols-2 gap-3">
        {rows.slice(0, 6).map((u) => (
          <li key={u.rank} className="flex items-center gap-2">
            <span className="text-xs font-bold text-mut-2">{u.rank}</span>
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradientFor(
                u.display_name,
              )} text-[11px] font-bold uppercase text-white`}
            >
              {u.display_name.slice(0, 1)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">{u.display_name}</p>
              <p className="truncate text-[11px] text-mut">
                {fmtKes(u.volume_cents)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
