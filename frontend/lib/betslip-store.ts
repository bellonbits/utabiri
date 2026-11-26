"use client";

import { useEffect, useState } from "react";
import { api } from "./api";

export interface BetslipLeg {
  matchId: string;
  matchTitle: string;
  marketId: string;
  marketName: string;
  outcomeId: string;
  outcomeName: string;
  odds: number;
  isSuspended?: boolean;
}

const STORAGE_KEY = "utabiri_betslip_selections";
const STAKE_KEY = "utabiri_betslip_stake";

export function getAccumulatorBonus(count: number): number {
  if (count < 2) return 0.0;
  if (count === 2) return 0.03;
  if (count === 3) return 0.05;
  if (count === 4) return 0.10;
  if (count <= 6) return 0.15;
  if (count <= 9) return 0.25;
  if (count <= 14) return 0.35;
  return 0.50; // 50% max accumulator boost
}

// Global event bus for cross-component reactive betslip updates
const BETSLIP_CHANGE_EVENT = "utabiri_betslip_change";
const BETSLIP_DRAWER_EVENT = "utabiri_betslip_drawer";

let _isDrawerOpen = false;

export function useBetslip() {
  const [selections, setSelections] = useState<BetslipLeg[]>([]);
  const [stake, setStakeState] = useState<number>(100);
  const [betType, setBetType] = useState<"single" | "multiple" | "system">("multiple");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [bookingCode, setBookingCode] = useState<string | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [placeSuccess, setPlaceSuccess] = useState<string | null>(null);

  // Sync with localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSelections(JSON.parse(raw));
      const rawStake = localStorage.getItem(STAKE_KEY);
      if (rawStake) setStakeState(parseFloat(rawStake) || 100);
    } catch {}

    const onUpdate = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) setSelections(JSON.parse(raw));
        else setSelections([]);
      } catch {}
    };

    const onDrawer = (e: Event) => {
      const custom = e as CustomEvent<{ open?: boolean }>;
      if (custom.detail && typeof custom.detail.open === "boolean") {
        setIsOpen(custom.detail.open);
        _isDrawerOpen = custom.detail.open;
      } else {
        setIsOpen((prev) => {
          _isDrawerOpen = !prev;
          return !prev;
        });
      }
    };

    window.addEventListener(BETSLIP_CHANGE_EVENT, onUpdate);
    window.addEventListener(BETSLIP_DRAWER_EVENT, onDrawer as EventListener);
    return () => {
      window.removeEventListener(BETSLIP_CHANGE_EVENT, onUpdate);
      window.removeEventListener(BETSLIP_DRAWER_EVENT, onDrawer as EventListener);
    };
  }, []);

  const save = (newLegs: BetslipLeg[]) => {
    setSelections(newLegs);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newLegs));
    } catch {}
    window.dispatchEvent(new Event(BETSLIP_CHANGE_EVENT));
  };

  const toggleSelection = (leg: BetslipLeg) => {
    const exists = selections.find((s) => s.outcomeId === leg.outcomeId);
    if (exists) {
      // Remove
      save(selections.filter((s) => s.outcomeId !== leg.outcomeId));
    } else {
      // If same match has an existing leg, replace with new market outcome
      const filtered = selections.filter((s) => s.matchId !== leg.matchId);
      save([...filtered, leg]);
    }
  };

  const removeSelection = (outcomeId: string) => {
    save(selections.filter((s) => s.outcomeId !== outcomeId));
  };

  const clearBetslip = () => {
    save([]);
    setBookingCode(null);
    setPlaceError(null);
    setPlaceSuccess(null);
  };

  const setStake = (amount: number) => {
    const val = Math.max(10, Math.round(amount));
    setStakeState(val);
    try {
      localStorage.setItem(STAKE_KEY, String(val));
    } catch {}
  };

  const toggleDrawer = (open?: boolean) => {
    window.dispatchEvent(
      new CustomEvent(BETSLIP_DRAWER_EVENT, { detail: { open } })
    );
  };

  // Calculations
  const totalOdds = selections.reduce((acc, s) => acc * s.odds, 1.0);
  const roundedOdds = selections.length > 0 ? parseFloat(totalOdds.toFixed(2)) : 1.0;
  const bonusRate = getAccumulatorBonus(selections.length);
  const grossWin = stake * roundedOdds;
  const bonusAmount = grossWin * bonusRate;
  const potentialPayout = parseFloat((grossWin + bonusAmount).toFixed(2));

  // Book a bet code
  const bookBet = async (): Promise<string | null> => {
    if (selections.length === 0) return null;
    try {
      const res = await api<{ code: string }>("/bets/book", {
        method: "POST",
        body: JSON.stringify({
          stake,
          selections: selections.map((s) => ({
            match_id: s.matchId,
            market_id: s.marketId,
            outcome_id: s.outcomeId,
            expected_odds: s.odds,
          })),
        }),
      });
      setBookingCode(res.code);
      return res.code;
    } catch {
      return null;
    }
  };

  // Load booked bet code
  const loadBookedBet = async (code: string): Promise<boolean> => {
    try {
      const res = await api<{ code: string; stake: number; selections: any[] }>(
        `/bets/book/${code.trim()}`
      );
      if (res && res.selections) {
        setStake(res.stake || 100);
        // Note: Full leg restoration happens when user views markets or submits
        setBookingCode(res.code);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return {
    selections,
    count: selections.length,
    stake,
    setStake,
    betType,
    setBetType,
    totalOdds: roundedOdds,
    bonusRate,
    bonusAmount: parseFloat(bonusAmount.toFixed(2)),
    potentialPayout,
    isOpen,
    toggleDrawer,
    toggleSelection,
    removeSelection,
    clearBetslip,
    isSelectionActive: (outcomeId: string) =>
      selections.some((s) => s.outcomeId === outcomeId),
    bookingCode,
    bookBet,
    loadBookedBet,
    isPlacing,
    setIsPlacing,
    placeError,
    setPlaceError,
    placeSuccess,
    setPlaceSuccess,
  };
}
