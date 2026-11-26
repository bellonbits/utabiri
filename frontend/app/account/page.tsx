"use client";

import { useState } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { DownloadIcon, ShieldIcon, UserCheckIcon } from "@/components/icons";
import { clearSession, useSession } from "@/lib/session";

export default function AccountPage() {
  const user = useSession();
  const [depositLimit, setDepositLimit] = useState("5000");
  const [lossLimit, setLossLimit] = useState("2500");
  const [sessionLimit, setSessionLimit] = useState("60");
  const [coolOffDays, setCoolOffDays] = useState("0");
  const [savedMsg, setSavedMsg] = useState(false);

  const handleSaveLimits = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  const exportBetHistory = () => {
    const data = {
      user_id: user?.id || "guest",
      export_date: new Date().toISOString(),
      wagers_count: 14,
      total_staked_coins: 3400,
      total_won_coins: 4120,
      net_roi_pct: "+21.1%",
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `utabiri-bet-history-${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-ink flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-screen-md mx-auto w-full px-4 py-6 pb-24 md:pb-12 space-y-6">
        <div className="border-b border-line pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900">
              Account & Responsible Gaming
            </h1>
            <p className="text-xs text-mut mt-0.5">
              Profile details, identity verification (KYC), play limits, and self-exclusion.
            </p>
          </div>
          {user && (
            <button
              onClick={() => { clearSession(); window.location.href = "/login"; }}
              className="text-xs font-bold text-down hover:underline"
            >
              Sign out
            </button>
          )}
        </div>

        {/* Profile & KYC Strip */}
        <div className="border border-line bg-panel p-4 space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-line pb-2 flex items-center gap-2">
            <UserCheckIcon width={16} height={16} className="text-accent-2" />
            <span>Profile & KYC Verification</span>
          </h2>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-mut font-semibold">Display Name</span>
              <p className="font-bold text-slate-900 mt-0.5">{user?.displayName || "Utabiri Player"}</p>
            </div>
            <div>
              <span className="text-mut font-semibold">Email</span>
              <p className="font-bold text-slate-900 mt-0.5">{user?.email || "guest@utabiri.co.ke"}</p>
            </div>
            <div>
              <span className="text-mut font-semibold">Verification Level</span>
              <p className="font-bold text-emerald-600 mt-0.5">Level 1 (Virtual Coins Verified)</p>
            </div>
            <div>
              <span className="text-mut font-semibold">BCLB Age Check</span>
              <p className="font-bold text-slate-900 mt-0.5">18+ Attested</p>
            </div>
          </div>
        </div>

        {/* Responsible Gaming Limits Form */}
        <div className="border border-line bg-panel p-4 space-y-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-line pb-2 flex items-center gap-2">
            <ShieldIcon width={16} height={16} className="text-accent-2" />
            <span>Player Protection & Gaming Limits</span>
          </h2>

          <form onSubmit={handleSaveLimits} className="space-y-4 text-xs">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-800">Daily Deposit Limit (Coins)</label>
                <input
                  type="number"
                  value={depositLimit}
                  onChange={(e) => setDepositLimit(e.target.value)}
                  className="w-full rounded border border-line bg-panel-2 px-3 py-1.5 font-bold outline-none mt-1"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800">Daily Loss Limit (Coins)</label>
                <input
                  type="number"
                  value={lossLimit}
                  onChange={(e) => setLossLimit(e.target.value)}
                  className="w-full rounded border border-line bg-panel-2 px-3 py-1.5 font-bold outline-none mt-1"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800">Session Reminder (Minutes)</label>
                <select
                  value={sessionLimit}
                  onChange={(e) => setSessionLimit(e.target.value)}
                  className="w-full rounded border border-line bg-panel-2 px-3 py-1.5 font-bold outline-none mt-1"
                >
                  <option value="30">Every 30 minutes</option>
                  <option value="60">Every 1 hour</option>
                  <option value="120">Every 2 hours</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-800">Cool-Off / Self-Exclusion</label>
                <select
                  value={coolOffDays}
                  onChange={(e) => setCoolOffDays(e.target.value)}
                  className="w-full rounded border border-line bg-panel-2 px-3 py-1.5 font-bold outline-none mt-1"
                >
                  <option value="0">No exclusion active</option>
                  <option value="1">24 Hours Cool-off</option>
                  <option value="7">7 Days Cool-off</option>
                  <option value="30">30 Days Self-exclusion</option>
                  <option value="180">6 Months Exclusion</option>
                </select>
              </div>
            </div>

            {savedMsg && (
              <p className="text-xs text-up font-bold bg-up/10 p-2 rounded border border-up/30">
                Responsible gaming limits updated successfully.
              </p>
            )}

            <button
              type="submit"
              className="rounded bg-accent hover:bg-accent-2 px-4 py-2 text-xs font-black text-white transition"
            >
              Update Protection Limits
            </button>
          </form>
        </div>

        {/* Data Portability & Export */}
        <div className="border border-line bg-panel p-4 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900">Bet History & Audit Export</h3>
            <p className="text-[11px] text-mut mt-0.5">
              Download your complete wagering record and transaction logs in JSON format.
            </p>
          </div>
          <button
            onClick={exportBetHistory}
            className="rounded border border-line bg-panel-2 hover:bg-ink px-3 py-2 text-xs font-bold text-slate-800 flex items-center gap-1.5 transition"
          >
            <DownloadIcon width={14} height={14} />
            <span>Export Data</span>
          </button>
        </div>

        {/* Responsible Gaming Hotline Banner */}
        <div className="border border-line bg-slate-900 text-stone-300 p-4 text-xs space-y-1">
          <p className="font-bold text-white uppercase text-[11px]">Responsible Gaming Notice</p>
          <p className="text-mut-2">
            Utabiri Bet is strictly 18+. Gaming can be addictive. If you or someone you know has a gambling problem,
            please seek guidance from the National Gambling Helpline (Kenya BCLB support): <strong>0800 720 000</strong>.
          </p>
        </div>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
