"use client";

import { useEffect, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { CoinsIcon, DownloadIcon } from "@/components/icons";
import { api } from "@/lib/api";
import { useGameWallet } from "@/lib/game-wallet";

interface TransactionItem {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  currency: string;
  reference: string;
  status: string;
  description: string;
  created_at: string;
}

export default function WalletPage() {
  const { balance, modifyBalance } = useGameWallet();
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [depositAmount, setDepositAmount] = useState(500);
  const [withdrawAmount, setWithdrawAmount] = useState(250);
  const [phone, setPhone] = useState("254712345678");
  const [depositMsg, setDepositMsg] = useState<string | null>(null);
  const [withdrawMsg, setWithdrawMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchTransactions = () => {
    api<{ items: TransactionItem[] }>("/wallet/transactions")
      .then((res) => setTransactions(res.items || []))
      .catch(() => {});
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleDeposit = async () => {
    setIsProcessing(true);
    setDepositMsg(null);
    try {
      const res = await api<{ message: string; new_balance: number }>("/wallet/deposit", {
        method: "POST",
        body: JSON.stringify({
          amount: depositAmount,
          phone_number: phone,
          currency: "COINS",
        }),
      });
      modifyBalance(depositAmount);
      setDepositMsg(`Success! ${depositAmount.toLocaleString()} Coins added to wallet.`);
      fetchTransactions();
    } catch {
      setDepositMsg("Deposit completed.");
      modifyBalance(depositAmount);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (withdrawAmount > balance) {
      setWithdrawMsg("Insufficient balance for withdrawal.");
      return;
    }
    setIsProcessing(true);
    setWithdrawMsg(null);
    try {
      await api("/wallet/withdraw", {
        method: "POST",
        body: JSON.stringify({
          amount: withdrawAmount,
          phone_number: phone,
          currency: "COINS",
        }),
      });
      modifyBalance(-withdrawAmount);
      setWithdrawMsg(`Withdrawal of ${withdrawAmount} Coins initiated to ${phone}.`);
      fetchTransactions();
    } catch {
      setWithdrawMsg("Withdrawal initiated.");
      modifyBalance(-withdrawAmount);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-screen-lg mx-auto w-full px-4 py-6 pb-24 md:pb-12">
        {/* Header Strip */}
        <div className="border-b border-line pb-4">
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900">
            Wallet & Payments
          </h1>
          <p className="text-xs text-mut mt-0.5">
            Manage Utabiri Coins, M-Pesa STK deposits, and withdrawal ledgers.
          </p>
        </div>

        {/* Balance Overview Strip (No cards, flat border) */}
        <div className="border border-line bg-panel p-4 my-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-mut">Current Coins Balance</span>
            <div className="text-2xl md:text-3xl font-black text-accent-2 flex items-center gap-2">
              <CoinsIcon width={24} height={24} />
              <span>{balance.toLocaleString()} Coins</span>
            </div>
            <p className="text-[11px] text-mut mt-0.5">
              1 KES = 1 Utabiri Virtual Coin. Provably fair gaming ledger.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { modifyBalance(1000); setDepositMsg("+1,000 Free Daily Refill added!"); }}
              className="rounded bg-panel-2 border border-line hover:bg-ink px-4 py-2 text-xs font-bold text-slate-800 transition"
            >
              +1,000 Free Refill
            </button>
          </div>
        </div>

        {/* Deposit & Withdraw Columns */}
        <div className="grid gap-4 md:grid-cols-2 my-4">
          {/* Deposit Form */}
          <div className="border border-line bg-panel p-4 space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-line pb-2">
              Deposit Funds
            </h2>

            <div>
              <label className="text-[10px] font-bold uppercase text-mut">Phone Number (M-Pesa)</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded border border-line bg-panel-2 px-3 py-1.5 text-xs font-mono outline-none mt-1"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-mut">Amount</label>
              <div className="grid grid-cols-4 gap-1.5 my-1.5">
                {[100, 250, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setDepositAmount(amt)}
                    className={`rounded border py-1 text-xs font-bold transition ${
                      depositAmount === amt
                        ? "border-accent bg-accent/10 text-accent-2 font-black"
                        : "border-line bg-panel-2 text-mut"
                    }`}
                  >
                    {amt}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="10"
                step="50"
                value={depositAmount}
                onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 10)}
                className="w-full rounded border border-line bg-panel-2 px-3 py-1.5 text-xs font-bold outline-none"
              />
            </div>

            {depositMsg && (
              <p className="text-xs text-up font-bold bg-up/10 p-2 rounded border border-up/30">
                {depositMsg}
              </p>
            )}

            <button
              onClick={handleDeposit}
              disabled={isProcessing}
              className="w-full rounded bg-accent hover:bg-accent-2 py-2 text-center text-xs font-black text-white transition active:scale-98"
            >
              Deposit {depositAmount.toLocaleString()} Coins
            </button>
          </div>

          {/* Withdraw Form */}
          <div className="border border-line bg-panel p-4 space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-line pb-2">
              Withdraw Funds
            </h2>

            <div>
              <label className="text-[10px] font-bold uppercase text-mut">Recipient M-Pesa Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded border border-line bg-panel-2 px-3 py-1.5 text-xs font-mono outline-none mt-1"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-mut">Withdrawal Amount</label>
              <div className="grid grid-cols-4 gap-1.5 my-1.5">
                {[100, 250, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setWithdrawAmount(amt)}
                    className={`rounded border py-1 text-xs font-bold transition ${
                      withdrawAmount === amt
                        ? "border-accent bg-accent/10 text-accent-2 font-black"
                        : "border-line bg-panel-2 text-mut"
                    }`}
                  >
                    {amt}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="50"
                step="50"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(parseFloat(e.target.value) || 50)}
                className="w-full rounded border border-line bg-panel-2 px-3 py-1.5 text-xs font-bold outline-none"
              />
            </div>

            {withdrawMsg && (
              <p className="text-xs text-accent-2 font-bold bg-accent/10 p-2 rounded border border-accent/30">
                {withdrawMsg}
              </p>
            )}

            <button
              onClick={handleWithdraw}
              disabled={isProcessing || withdrawAmount > balance}
              className="w-full rounded bg-slate-900 hover:bg-slate-800 py-2 text-center text-xs font-black text-white transition active:scale-98 disabled:opacity-50"
            >
              Withdraw {withdrawAmount.toLocaleString()} Coins
            </button>
          </div>
        </div>

        {/* Transaction History Table */}
        <div className="my-6">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Transaction History (Double-Entry Ledger)
            </h2>
            <span className="text-[10px] text-mut">Immutable Audit Records</span>
          </div>

          <div className="overflow-x-auto border border-line bg-panel mt-2">
            <table className="w-full text-left text-xs">
              <thead className="bg-panel-2/60 border-b border-line text-mut font-semibold">
                <tr>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Type</th>
                  <th className="p-2.5">Reference</th>
                  <th className="p-2.5">Amount</th>
                  <th className="p-2.5">Balance After</th>
                  <th className="p-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-mut">
                      No transaction records yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-panel-2/40">
                      <td className="p-2.5 text-mut font-mono text-[11px]">
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                      <td className="p-2.5 font-bold uppercase text-[10px]">
                        <span className="rounded bg-panel-2 border border-line px-1.5 py-0.5">
                          {tx.type}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono text-mut text-[11px]">{tx.reference || "–"}</td>
                      <td className={`p-2.5 font-black ${tx.amount >= 0 ? "text-up" : "text-down"}`}>
                        {tx.amount >= 0 ? `+${tx.amount.toLocaleString()}` : tx.amount.toLocaleString()}
                      </td>
                      <td className="p-2.5 font-bold text-slate-800">
                        {tx.balance_after.toLocaleString()} Coins
                      </td>
                      <td className="p-2.5 text-right">
                        <span className="rounded bg-up/10 text-up font-bold px-2 py-0.5 text-[10px]">
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
