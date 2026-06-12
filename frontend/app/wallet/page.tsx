"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtKES, useSession } from "@/lib/session";
import { BottomNav } from "@/components/bottom-nav";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { NseLive } from "@/components/live-markets";
import { btnCls, Field, inputCls, Notice } from "@/components/shell";
import { GridIcon, LockIcon, PulseIcon, TrendUpIcon } from "@/components/icons";

type WalletDto = {
  balance_cents: number;
  locked_cents: number;
  total_deposits_cents: number;
  total_withdrawals_cents: number;
};

type Tx = {
  id: string;
  type: string;
  amount_cents: number;
  status: string;
  created_at: string;
};

const TX_LABEL: Record<string, string> = {
  deposit: "Deposit",
  trade_buy: "Trade — Buy",
  trade_sell: "Trade — Sell",
  payout: "Market payout",
  withdrawal: "Withdrawal",
};

type Panel = "deposit" | "withdraw" | "statement";

export default function WalletPage() {
  const user = useSession();
  const [wallet, setWallet] = useState<WalletDto | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [panel, setPanel] = useState<Panel>("deposit");
  const [depositAmt, setDepositAmt] = useState(500);
  const [withdrawAmt, setWithdrawAmt] = useState(100);
  const [phone, setPhone] = useState("+2547");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    api<WalletDto>("/wallet").then(setWallet).catch(() => setWallet(null));
    api<{ items: Tx[] }>("/wallet/transactions")
      .then((r) => setTxs(r.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  if (!user) {
    return (
      <div className="min-h-dvh">
        <Navbar />
        <main className="mx-auto max-w-md px-4 pt-20 text-center">
          <p className="text-sm text-mut">
            Please{" "}
            <Link href="/login" className="font-semibold text-accent-2 hover:underline">
              log in
            </Link>{" "}
            to view your wallet.
          </p>
        </main>
        <Footer />
      <BottomNav />
      </div>
    );
  }

  const act = async (fn: () => Promise<string>) => {
    setBusy(true);
    setMsg(null);
    try {
      const text = await fn();
      setMsg({ ok: true, text });
      refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Failed" });
    } finally {
      setBusy(false);
    }
  };

  const deposit = () =>
    act(async () => {
      const r = await api<{ status: string; transaction_id: string; mode?: string }>(
        "/wallet/deposit",
        {
          method: "POST",
          body: { amount_cents: Math.round(depositAmt * 100), phone },
        },
      );
      if (r.status === "completed") {
        return `Deposited KES ${depositAmt.toLocaleString()} (dev instant credit)`;
      }
      // STK push fired — poll until the payment confirms (webhook-independent)
      setMsg({ ok: true, text: "STK push sent — enter your M-Pesa PIN on your phone…" });
      for (let i = 0; i < 24; i++) {
        await new Promise((res) => setTimeout(res, 5000));
        const s = await api<{ status: string }>(
          `/wallet/transactions/${r.transaction_id}/check`,
          { method: "POST" },
        );
        if (s.status === "completed") return `Deposit of KES ${depositAmt.toLocaleString()} confirmed`;
        if (s.status === "failed") throw new Error("Payment failed or was cancelled");
      }
      return "Still pending — it will credit automatically once M-Pesa confirms";
    });

  const withdraw = () =>
    act(async () => {
      const r = await api<{ fee_cents: number; payout_cents: number }>(
        "/wallet/withdraw",
        { method: "POST", body: { amount_cents: Math.round(withdrawAmt * 100), phone } },
      );
      return `Withdrawal requested — you'll receive ${fmtKES(r.payout_cents)} after approval (fee ${fmtKES(r.fee_cents)})`;
    });

  const pendingWithdrawals = wallet?.locked_cents ?? 0;
  const netPnl =
    (wallet?.balance_cents ?? 0) +
    (wallet?.locked_cents ?? 0) +
    (wallet?.total_withdrawals_cents ?? 0) -
    (wallet?.total_deposits_cents ?? 0);

  return (
    <div className="min-h-dvh">
      <Navbar />
      <main className="mx-auto max-w-screen-xl px-4 pb-24 pt-4 md:pb-10">
        {/* ---------- hero ---------- */}
        <section className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-[#16223f] via-[#121b2e] to-[#0d1526] p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-accent/25 blur-3xl" />
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-extrabold tracking-tight">
              {user.display_name}&apos;s Wallet
            </h1>
            <span className="rounded-full border border-line bg-ink/40 px-3 py-1 text-xs font-semibold text-mut">
              M-Pesa linked
            </span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-6 lg:grid-cols-4">
            {wallet &&
              (
                [
                  ["Available Balance", wallet.balance_cents, ""],
                  ["Pending Settlements", pendingWithdrawals, ""],
                  ["Total Deposits", wallet.total_deposits_cents, ""],
                  ["Net P&L", netPnl, netPnl >= 0 ? "text-up" : "text-down"],
                ] as const
              ).map(([label, cents, cls]) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-mut">{label}</p>
                  <p className={`mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl ${cls}`}>
                    {fmtKES(cents)}
                  </p>
                </div>
              ))}
          </div>
        </section>

        {/* ---------- wallet cards + action tabs ---------- */}
        <section className="mt-4 rounded-3xl border border-line bg-panel p-5">
          <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
            <h2 className="mr-auto text-base font-bold">Payment wallets</h2>
            {(
              [
                ["deposit", "Deposit"],
                ["withdraw", "Withdraw"],
                ["statement", "Statement"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPanel(key)}
                className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
                  panel === key
                    ? "bg-white text-ink"
                    : "border border-line text-mut hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {/* wallet cards */}
            <div className="relative flex h-40 flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-[#1d4ed8] to-[#0ea5e9] p-4">
              <div className="flex items-center justify-between text-white/80">
                <TrendUpIcon width={18} height={18} />
                <span className="text-xs font-bold">•••• {user.id.slice(0, 4)}</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-white/75">Trading Wallet</p>
                <p className="text-2xl font-extrabold">{fmtKES(wallet?.balance_cents ?? 0)}</p>
              </div>
            </div>
            <div className="relative flex h-40 flex-col justify-between overflow-hidden rounded-2xl border border-line bg-panel-2 p-4">
              <div className="flex items-center justify-between text-mut">
                <LockIcon width={18} height={18} />
                <span className="text-xs font-bold">Locked</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-mut">Pending withdrawals</p>
                <p className="text-2xl font-extrabold text-gold">
                  {fmtKES(wallet?.locked_cents ?? 0)}
                </p>
              </div>
            </div>
            <button
              onClick={() => setPanel("deposit")}
              className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-sm font-bold text-mut transition hover:border-accent hover:text-white"
            >
              <GridIcon width={20} height={20} />
              + ADD FUNDS
            </button>
          </div>

          {msg && <div className="mt-4"><Notice ok={msg.ok} text={msg.text} /></div>}

          {/* active panel */}
          <div className="mt-4">
            {panel === "deposit" && (
              <div className="grid gap-3 sm:max-w-md">
                <Field label="Amount (KES)">
                  <input
                    type="number"
                    min={10}
                    value={depositAmt}
                    onChange={(e) => setDepositAmt(Number(e.target.value))}
                    className={inputCls}
                  />
                </Field>
                <Field label="M-Pesa phone (for the STK prompt)">
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputCls}
                    placeholder="+254712345678"
                  />
                </Field>
                <div className="flex gap-2">
                  {[100, 250, 500, 1000].map((v) => (
                    <button
                      key={v}
                      onClick={() => setDepositAmt(v)}
                      className="rounded-full border border-line px-3 py-1 text-xs font-bold text-mut hover:text-white"
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <button onClick={deposit} disabled={busy} className={btnCls}>
                  {busy ? "Waiting for M-Pesa…" : "Deposit via M-Pesa"}
                </button>
              </div>
            )}

            {panel === "withdraw" && (
              <div className="grid gap-3 sm:max-w-md">
                <Field label="Amount (KES, min 100)">
                  <input
                    type="number"
                    min={100}
                    value={withdrawAmt}
                    onChange={(e) => setWithdrawAmt(Number(e.target.value))}
                    className={inputCls}
                  />
                </Field>
                <Field label="M-Pesa phone">
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputCls}
                    placeholder="+254712345678"
                  />
                </Field>
                <button onClick={withdraw} disabled={busy} className={btnCls}>
                  {busy ? "Working…" : "Request Withdrawal"}
                </button>
              </div>
            )}

            {panel === "statement" && (
              <>
                {txs.length === 0 ? (
                  <p className="text-sm text-mut">No transactions yet.</p>
                ) : (
                  <ul className="divide-y divide-line/60">
                    {txs.map((t) => (
                      <li key={t.id} className="flex items-center gap-3 py-2.5">
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                            t.amount_cents >= 0 ? "bg-up/10 text-up" : "bg-down/10 text-down"
                          }`}
                        >
                          <PulseIcon width={14} height={14} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">
                            {TX_LABEL[t.type] ?? t.type}
                          </p>
                          <p className="text-xs text-mut-2">
                            {new Date(t.created_at).toLocaleString()} · {t.status}
                          </p>
                        </div>
                        <span
                          className={`text-sm font-bold ${
                            t.amount_cents >= 0 ? "text-up" : "text-down"
                          }`}
                        >
                          {t.amount_cents >= 0 ? "+" : ""}
                          {fmtKES(t.amount_cents)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </section>

        {/* ---------- market movers ---------- */}
        <section className="mt-4 rounded-3xl border border-line bg-panel p-5">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-base font-bold">NSE Movers</h2>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-mut-2">
              Live · Nairobi Securities Exchange
            </span>
          </div>
          <p className="mb-3 text-xs text-mut">
            Track Kenyan equities in real time alongside your prediction portfolio.
          </p>
          <div className="[&>div]:grid [&>div]:gap-2 sm:[&>div]:grid-cols-3">
            <NseLive />
          </div>
        </section>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
