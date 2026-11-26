"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useBetslip } from "@/lib/betslip-store";
import { useGameWallet } from "@/lib/game-wallet";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  CoinsIcon,
  CopyIcon,
  Share2Icon,
  Trash2Icon,
  XCircleIcon,
} from "@/components/icons";

export function BetslipPanel({ isDesktop = false }: { isDesktop?: boolean }) {
  const {
    selections,
    count,
    stake,
    setStake,
    betType,
    setBetType,
    totalOdds,
    bonusRate,
    bonusAmount,
    potentialPayout,
    isOpen,
    toggleDrawer,
    removeSelection,
    clearBetslip,
    bookingCode,
    bookBet,
    loadBookedBet,
    isPlacing,
    setIsPlacing,
    placeError,
    setPlaceError,
    placeSuccess,
    setPlaceSuccess,
  } = useBetslip();

  const { balance, modifyBalance } = useGameWallet();
  const [loadCodeInput, setLoadCodeInput] = useState("");
  const [copied, setCopied] = useState(false);

  // Handle Bet Submission
  const handlePlaceBet = async () => {
    if (count === 0) return;
    if (stake > balance) {
      setPlaceError("Insufficient Utabiri Coins. Refill in Wallet.");
      return;
    }

    setIsPlacing(true);
    setPlaceError(null);
    setPlaceSuccess(null);

    try {
      const res = await api<{ bet_id: string; potential_payout: number }>("/bets/place", {
        method: "POST",
        body: JSON.stringify({
          bet_type: betType,
          stake,
          currency: "COINS",
          selections: selections.map((s) => ({
            match_id: s.matchId,
            market_id: s.marketId,
            outcome_id: s.outcomeId,
            expected_odds: s.odds,
          })),
        }),
      });

      // Deduct coins from client state
      modifyBalance(-stake);
      setPlaceSuccess(`Bet placed successfully! Bet ID #${res.bet_id.slice(0, 8)}`);
      setTimeout(() => {
        clearBetslip();
        setPlaceSuccess(null);
      }, 3500);
    } catch (e) {
      setPlaceError(e instanceof Error ? e.message : "Failed to place bet. Please try again.");
    } finally {
      setIsPlacing(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLoadCode = async () => {
    if (!loadCodeInput.trim()) return;
    const ok = await loadBookedBet(loadCodeInput.trim());
    if (ok) {
      setLoadCodeInput("");
      setPlaceSuccess("Booking code loaded!");
      setTimeout(() => setPlaceSuccess(null), 2000);
    } else {
      setPlaceError("Invalid booking code");
      setTimeout(() => setPlaceError(null), 3000);
    }
  };

  // If mobile and not open, don't show
  if (!isDesktop && !isOpen) return null;

  return (
    <aside
      className={`${
        isDesktop
          ? "w-80 shrink-0 border-l border-line bg-panel flex flex-col h-[calc(100vh-3.5rem)] sticky top-14"
          : "fixed inset-0 z-50 bg-black/60 flex justify-end"
      }`}
    >
      <div
        className={`${
          isDesktop
            ? "flex-1 flex flex-col overflow-hidden"
            : "w-full max-w-md bg-panel h-full flex flex-col shadow-2xl"
        }`}
      >
        {/* Betslip Header */}
        <div className="flex items-center justify-between border-b border-line px-4 py-3 bg-panel-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-900">
              Betslip
            </span>
            <span className="rounded bg-accent px-1.5 py-0.5 text-[11px] font-black text-white">
              {count}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {count > 0 && (
              <button
                onClick={clearBetslip}
                className="text-mut hover:text-down transition p-1"
                title="Clear all"
              >
                <Trash2Icon width={16} height={16} />
              </button>
            )}
            {!isDesktop && (
              <button
                onClick={() => toggleDrawer(false)}
                className="text-mut hover:text-slate-900 p-1"
              >
                <XCircleIcon width={18} height={18} />
              </button>
            )}
          </div>
        </div>

        {/* Tab Selector: Singles | Multiples | System */}
        <div className="grid grid-cols-3 border-b border-line text-xs font-bold bg-panel">
          <button
            onClick={() => setBetType("single")}
            className={`py-2 text-center transition border-b-2 ${
              betType === "single"
                ? "border-accent text-accent-2 font-black"
                : "border-transparent text-mut hover:text-slate-900"
            }`}
          >
            Singles
          </button>
          <button
            onClick={() => setBetType("multiple")}
            className={`py-2 text-center transition border-b-2 ${
              betType === "multiple"
                ? "border-accent text-accent-2 font-black"
                : "border-transparent text-mut hover:text-slate-900"
            }`}
          >
            Multiples
          </button>
          <button
            onClick={() => setBetType("system")}
            className={`py-2 text-center transition border-b-2 ${
              betType === "system"
                ? "border-accent text-accent-2 font-black"
                : "border-transparent text-mut hover:text-slate-900"
            }`}
          >
            System
          </button>
        </div>

        {/* Selections List */}
        <div className="flex-1 overflow-y-auto divide-y divide-line/60">
          {count === 0 ? (
            <div className="p-8 text-center text-xs text-mut flex flex-col items-center gap-2">
              <span className="text-mut-2">Your betslip is currently empty.</span>
              <span className="text-[11px] text-mut-2">
                Click any odds button on a match to add selections.
              </span>
            </div>
          ) : (
            selections.map((leg) => (
              <div key={leg.outcomeId} className="p-3 hover:bg-panel-2 transition flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-slate-800 truncate">
                    {leg.matchTitle}
                  </p>
                  <p className="text-xs text-mut mt-0.5">
                    {leg.marketName}: <strong className="text-slate-900">{leg.outcomeName}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="rounded bg-panel-2 border border-line px-2 py-0.5 text-xs font-black text-accent-2">
                    {leg.odds.toFixed(2)}
                  </span>
                  <button
                    onClick={() => removeSelection(leg.outcomeId)}
                    className="text-mut-2 hover:text-down p-0.5"
                  >
                    <XCircleIcon width={14} height={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Stake & Calculations Footer */}
        {count > 0 && (
          <div className="border-t border-line bg-panel p-3 space-y-2.5">
            {/* Quick Stake Chips */}
            <div className="grid grid-cols-4 gap-1.5">
              {[50, 100, 200, 500].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setStake(amt)}
                  className={`rounded border py-1 text-center text-xs font-bold transition ${
                    stake === amt
                      ? "border-accent bg-accent/10 text-accent-2 font-black"
                      : "border-line bg-panel-2 text-mut hover:text-slate-900"
                  }`}
                >
                  {amt}
                </button>
              ))}
            </div>

            {/* Stake Input */}
            <div className="flex items-center justify-between gap-2 rounded border border-line bg-panel-2 px-3 py-1.5">
              <span className="text-xs font-bold text-mut">Stake (Coins)</span>
              <input
                type="number"
                min="10"
                step="10"
                value={stake}
                onChange={(e) => setStake(parseFloat(e.target.value) || 10)}
                className="w-24 bg-transparent text-right text-sm font-black outline-none"
              />
            </div>

            {/* Odds & Calculations breakdown */}
            <div className="space-y-1 text-xs pt-1 border-t border-line/60">
              <div className="flex items-center justify-between text-mut">
                <span>Total Odds</span>
                <span className="font-bold text-slate-800">{totalOdds.toFixed(2)}</span>
              </div>

              {bonusRate > 0 && (
                <div className="flex items-center justify-between text-up font-semibold">
                  <span>Accumulator Bonus (+{(bonusRate * 100).toFixed(0)}%)</span>
                  <span>+{bonusAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-slate-900 pt-1 border-t border-line/60">
                <span className="font-bold">Potential Win</span>
                <span className="text-base font-black text-accent-2">
                  {potentialPayout.toLocaleString()} Coins
                </span>
              </div>
            </div>

            {/* Errors / Success Alert */}
            {placeError && (
              <div className="rounded bg-down/10 border border-down/30 p-2 text-xs text-down flex items-center gap-1.5">
                <AlertCircleIcon width={14} height={14} className="shrink-0" />
                <span>{placeError}</span>
              </div>
            )}
            {placeSuccess && (
              <div className="rounded bg-up/10 border border-up/30 p-2 text-xs text-up flex items-center gap-1.5">
                <CheckCircleIcon width={14} height={14} className="shrink-0" />
                <span>{placeSuccess}</span>
              </div>
            )}

            {/* Place Bet Action Button */}
            <button
              onClick={handlePlaceBet}
              disabled={isPlacing || count === 0}
              className="w-full rounded-md bg-accent py-2.5 text-center text-sm font-black text-white hover:bg-accent-2 transition shadow-xs active:scale-98 disabled:opacity-50"
            >
              {isPlacing ? "Placing Bet…" : `PLACE BET (${stake} COINS)`}
            </button>

            {/* Book a Bet share bar */}
            <div className="flex items-center justify-between pt-1">
              {bookingCode ? (
                <div className="flex items-center justify-between w-full rounded bg-panel-2 border border-line px-2 py-1 text-xs">
                  <span className="font-mono font-bold text-accent-2">{bookingCode}</span>
                  <button
                    onClick={() => handleCopyCode(bookingCode)}
                    className="text-xs font-bold text-mut hover:text-slate-900 flex items-center gap-1"
                  >
                    <CopyIcon width={12} height={12} /> {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={bookBet}
                  className="w-full text-center text-xs font-bold text-mut hover:text-slate-900 flex items-center justify-center gap-1 py-1"
                >
                  <Share2Icon width={12} height={12} /> Book Bet Code
                </button>
              )}
            </div>
          </div>
        )}

        {/* Load Booking Code Footer */}
        <div className="p-3 border-t border-line bg-panel-2 flex items-center gap-2">
          <input
            type="text"
            placeholder="Load Booking Code (e.g. UTB-7294)"
            value={loadCodeInput}
            onChange={(e) => setLoadCodeInput(e.target.value)}
            className="flex-1 rounded border border-line bg-panel px-2.5 py-1 text-xs font-mono outline-none"
          />
          <button
            onClick={handleLoadCode}
            className="rounded bg-panel border border-line px-2.5 py-1 text-xs font-bold hover:bg-ink transition"
          >
            Load
          </button>
        </div>
      </div>
    </aside>
  );
}
