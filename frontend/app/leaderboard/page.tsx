"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtKES, useSession } from "@/lib/session";
import { Avatar } from "@/components/avatar";
import { Card, Shell } from "@/components/shell";

type Row = {
  rank: number;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  profit_cents: number;
  volume_cents: number;
  total_trades: number;
};

export default function LeaderboardPage() {
  const user = useSession();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    api<{ items: Row[] }>("/leaderboard", { token: null })
      .then((r) => setRows(r.items))
      .catch(() => setRows([]));
  }, []);

  const toggleFollow = async (userId: string, isFollowing: boolean) => {
    if (!user) { window.location.href = "/login"; return; }
    setBusyId(userId);
    try {
      if (isFollowing) {
        await api(`/users/${userId}/follow`, { method: "DELETE" });
        setFollowing((s) => { const n = new Set(s); n.delete(userId); return n; });
      } else {
        await api(`/users/${userId}/follow`, { method: "POST" });
        setFollowing((s) => new Set(s).add(userId));
      }
    } catch {}
    setBusyId(null);
  };

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
              const me = user?.id === r.user_id;
              const isFollowing = following.has(r.user_id);
              return (
                <li
                  key={r.rank}
                  className={`flex items-center gap-3 py-3 ${me ? "rounded-lg bg-accent/5 px-2" : ""}`}
                >
                  <span
                    className={`w-7 shrink-0 text-center text-sm font-extrabold ${
                      r.rank <= 3 ? "text-gold" : "text-mut-2"
                    }`}
                  >
                    {r.rank}
                  </span>
                  <Link href={`/users/${r.user_id}`}>
                    <Avatar name={r.display_name} avatarUrl={r.avatar_url} size={36} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/users/${r.user_id}`} className="truncate text-sm font-bold hover:text-accent-2 block">
                      {r.display_name}
                      {me && <span className="ml-2 text-xs font-semibold text-accent-2">you</span>}
                    </Link>
                    <p className="text-xs text-mut-2">
                      {r.total_trades} trades · {fmtKES(r.volume_cents)} vol
                    </p>
                  </div>
                  <span
                    className={`text-sm font-extrabold ${
                      r.profit_cents >= 0 ? "text-up" : "text-down"
                    }`}
                  >
                    {r.profit_cents >= 0 ? "+" : ""}{fmtKES(r.profit_cents)}
                  </span>
                  {!me && user && (
                    <button
                      onClick={() => toggleFollow(r.user_id, isFollowing)}
                      disabled={busyId === r.user_id}
                      className={`ml-1 shrink-0 rounded-full px-3 py-1 text-xs font-bold transition ${
                        isFollowing
                          ? "border border-line text-mut hover:border-down hover:text-down"
                          : "bg-accent text-white hover:bg-accent-2"
                      } disabled:opacity-50`}
                    >
                      {busyId === r.user_id ? "…" : isFollowing ? "Following" : "Follow"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </Shell>
  );
}
