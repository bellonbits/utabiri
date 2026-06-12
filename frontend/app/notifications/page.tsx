"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtKES, useSession } from "@/lib/session";
import { Card, Shell } from "@/components/shell";
import {
  BellIcon,
  PulseIcon,
  TrendUpIcon,
  TrophyIcon,
} from "@/components/icons";

type Tx = {
  id: string;
  type: string;
  amount_cents: number;
  status: string;
  created_at: string;
};

type Notification = {
  id: string;
  title: string;
  body: string;
  tone: "up" | "down" | "neutral";
  icon: "pulse" | "trend" | "trophy" | "bell";
  at: string;
};

function toNotification(t: Tx): Notification {
  const amt = fmtKES(Math.abs(t.amount_cents));
  switch (t.type) {
    case "deposit":
      return {
        id: t.id,
        title: t.status === "completed" ? "Deposit received" : "Deposit pending",
        body: `${amt} ${t.status === "completed" ? "has been credited to your wallet." : "is awaiting M-Pesa confirmation."}`,
        tone: t.status === "completed" ? "up" : "neutral",
        icon: "pulse",
        at: t.created_at,
      };
    case "trade_buy":
      return {
        id: t.id,
        title: "Trade confirmed — buy",
        body: `Your order for ${amt} was filled.`,
        tone: "neutral",
        icon: "trend",
        at: t.created_at,
      };
    case "trade_sell":
      return {
        id: t.id,
        title: "Trade confirmed — sell",
        body: `You sold shares for ${amt}; funds are in your wallet.`,
        tone: "up",
        icon: "trend",
        at: t.created_at,
      };
    case "payout":
      return {
        id: t.id,
        title: "You won a market!",
        body: `A market you predicted resolved in your favour — ${amt} paid out.`,
        tone: "up",
        icon: "trophy",
        at: t.created_at,
      };
    case "withdrawal":
      return {
        id: t.id,
        title: "Withdrawal sent",
        body: `${amt} is on its way to your M-Pesa.`,
        tone: "down",
        icon: "pulse",
        at: t.created_at,
      };
    default:
      return {
        id: t.id,
        title: t.type,
        body: amt,
        tone: "neutral",
        icon: "bell",
        at: t.created_at,
      };
  }
}

const ICONS = {
  pulse: PulseIcon,
  trend: TrendUpIcon,
  trophy: TrophyIcon,
  bell: BellIcon,
};

export default function NotificationsPage() {
  const user = useSession();
  const [items, setItems] = useState<Notification[] | null>(null);

  useEffect(() => {
    if (!user) return;
    api<{ items: Tx[] }>("/wallet/transactions")
      .then((r) => setItems(r.items.map(toNotification)))
      .catch(() => setItems([]));
  }, [user]);

  if (!user) {
    return (
      <Shell title="Notifications">
        <Card>
          <p className="text-sm text-mut">
            Please{" "}
            <Link href="/login" className="font-semibold text-accent-2 hover:underline">
              log in
            </Link>{" "}
            to see your notifications.
          </p>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell
      title="Notifications"
      subtitle="Deposits, trade confirmations, payouts and account activity"
    >
      <Card>
        {items === null ? (
          <p className="text-sm text-mut">Loading…</p>
        ) : items.length === 0 ? (
          <div className="py-8 text-center">
            <BellIcon width={28} height={28} className="mx-auto text-mut-2" />
            <p className="mt-3 text-sm font-semibold">You&apos;re all caught up</p>
            <p className="mt-1 text-sm text-mut">
              Activity on your account will appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line/60">
            {items.map((n) => {
              const Icon = ICONS[n.icon];
              const tone =
                n.tone === "up"
                  ? "bg-up/10 text-up"
                  : n.tone === "down"
                    ? "bg-down/10 text-down"
                    : "bg-accent/10 text-accent-2";
              return (
                <li key={n.id} className="flex items-start gap-3 py-3.5">
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}
                  >
                    <Icon width={16} height={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{n.title}</p>
                    <p className="text-sm text-mut">{n.body}</p>
                    <p className="mt-0.5 text-xs text-mut-2">
                      {new Date(n.at).toLocaleString()}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <p className="mt-3 text-center text-xs text-mut-2">
        Email notifications activate once a Resend API key is configured on the
        backend.
      </p>
    </Shell>
  );
}
