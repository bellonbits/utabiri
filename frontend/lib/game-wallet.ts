"use client";

import { useEffect, useState } from "react";

const WALLET_KEY = "utabiri_game_balance";
const DEFAULT_BALANCE = 1000;

export function getStoredBalance(): number {
  if (typeof window === "undefined") return DEFAULT_BALANCE;
  const raw = localStorage.getItem(WALLET_KEY);
  if (!raw) {
    localStorage.setItem(WALLET_KEY, String(DEFAULT_BALANCE));
    return DEFAULT_BALANCE;
  }
  const parsed = parseFloat(raw);
  return isNaN(parsed) ? DEFAULT_BALANCE : Math.max(0, Math.round(parsed * 100) / 100);
}

export function setStoredBalance(amount: number): number {
  const safe = Math.max(0, Math.round(amount * 100) / 100);
  if (typeof window !== "undefined") {
    localStorage.setItem(WALLET_KEY, String(safe));
    window.dispatchEvent(new Event("utabiri_wallet_update"));
  }
  return safe;
}

export function modifyBalance(delta: number): number {
  const current = getStoredBalance();
  return setStoredBalance(current + delta);
}

export function useGameWallet() {
  const [balance, setBalance] = useState<number>(DEFAULT_BALANCE);

  useEffect(() => {
    setBalance(getStoredBalance());

    const onUpdate = () => {
      setBalance(getStoredBalance());
    };

    window.addEventListener("utabiri_wallet_update", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("utabiri_wallet_update", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);

  const refill = () => {
    modifyBalance(500);
  };

  return { balance, setBalance: setStoredBalance, modifyBalance, refill };
}
