"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtKES, useSession } from "@/lib/session";
import { gradientFor } from "@/lib/data";
import { Card, Shell } from "@/components/shell";

type Row = {
  rank: number;
  display_name: string;
  profit_cents: number;
  volume_cents: number;
  total_trades: number;
};

export default function LeaderboardPage() {
  const user = useSession();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    api<{ items: Row[] }>("/leaderboard", { token: null })
      .then((r) => setRows(r.items))
      .catch(() => setRows([]));
  }, []);

  return (
    <Shell title="Leaderboard" subtitle="Kenya's sharpest forecasters, ranked by realized profit">
      <Card>
        {rows === null ? (
          <p className="text-sm text-mut">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-mut">No traders yet — be the first.</p>
        ) : (
          <ul className="divide-y divide-line/60">
            {rows.map((r) => {
              const me = user?.display_name === r.display_name;
              return (
                <li
                  key={r.rank}
                  className={`flex items-center gap-3 py-3 ${me ? "rounded-lg bg-accent/5 px-2" : ""}`}
                >
                  <span
                    className={`w-8 text-center text-sm font-extrabold ${
                      r.rank <= 3 ? "text-gold" : "text-mut-2"
                    }`}
                  >
                    {r.rank}
                  </span>
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold uppercase text-white ${gradientFor(r.display_name)}`}
                  >
                    {r.display_name.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">
                      {r.display_name}
                      {me && <span className="ml-2 text-xs font-semibold text-accent-2">you</span>}
                    </p>
                    <p className="text-xs text-mut-2">
                      {r.total_trades} trades · {fmtKES(r.volume_cents)} volume
                    </p>
                  </div>
                  <span
                    className={`text-sm font-extrabold ${
                      r.profit_cents >= 0 ? "text-up" : "text-down"
                    }`}
                  >
                    {r.profit_cents >= 0 ? "+" : ""}
                    {fmtKES(r.profit_cents)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </Shell>
  );
}
