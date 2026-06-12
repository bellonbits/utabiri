"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtKES, useSession } from "@/lib/session";
import { gradientFor } from "@/lib/data";
import { Card, Shell } from "@/components/shell";

type PositionDto = {
  unrealized_pnl_cents: number;
  realized_pnl_cents: number;
  cost_cents: number;
  current_value_cents: number;
};

export default function ProfilePage() {
  const user = useSession();
  const [positions, setPositions] = useState<PositionDto[]>([]);
  const [wallet, setWallet] = useState<{ balance_cents: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    api<{ items: PositionDto[] }>("/positions")
      .then((r) => setPositions(r.items))
      .catch(() => {});
    api<{ balance_cents: number }>("/wallet")
      .then(setWallet)
      .catch(() => {});
  }, [user]);

  if (!user) {
    return (
      <Shell title="Profile">
        <Card>
          <p className="text-sm text-mut">
            Please{" "}
            <a href="/login" className="font-semibold text-accent-2 hover:underline">
              log in
            </a>{" "}
            to view your profile.
          </p>
        </Card>
      </Shell>
    );
  }

  const unrealized = positions.reduce((s, p) => s + p.unrealized_pnl_cents, 0);
  const value = positions.reduce((s, p) => s + p.current_value_cents, 0);

  return (
    <Shell title="Profile">
      <div className="flex flex-col gap-4">
        <Card className="flex items-center gap-4">
          <span
            className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br text-2xl font-extrabold uppercase text-white ${gradientFor(user.display_name)}`}
          >
            {user.display_name.slice(0, 1)}
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold">{user.display_name}</h2>
            <p className="text-sm text-mut">{user.email}</p>
            <p className="mt-1 flex gap-2 text-xs">
              <span className="rounded bg-up/15 px-2 py-0.5 font-bold text-up">
                Verified
              </span>
              {user.is_admin && (
                <span className="rounded bg-gold/15 px-2 py-0.5 font-bold text-gold">
                  Admin
                </span>
              )}
            </p>
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          {(
            [
              ["Wallet", wallet?.balance_cents ?? 0, "text-white"],
              ["Positions value", value, "text-white"],
              [
                "Unrealized P&L",
                unrealized,
                unrealized >= 0 ? "text-up" : "text-down",
              ],
            ] as const
          ).map(([label, cents, cls]) => (
            <Card key={label} className="p-4">
              <p className="text-xs font-semibold text-mut">{label}</p>
              <p className={`mt-1 text-lg font-extrabold ${cls}`}>
                {fmtKES(cents)}
              </p>
            </Card>
          ))}
        </div>

        <Card>
          <h3 className="mb-2 text-base font-bold">Quick links</h3>
          <div className="flex flex-wrap gap-2 text-sm">
            {[
              ["Portfolio", "/portfolio"],
              ["Wallet", "/wallet"],
              ["Leaderboard", "/leaderboard"],
              ["Settings", "/settings"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="rounded-full border border-line px-4 py-1.5 font-semibold text-mut transition hover:text-white"
              >
                {label}
              </a>
            ))}
          </div>
        </Card>
      </div>
    </Shell>
  );
}
