"use client";

import { useEffect, useState } from "react";

export type SessionUser = {
  id: string;
  email: string;
  display_name: string;
  is_admin: boolean;
  is_verified: boolean;
  avatar_url?: string | null;
};

const TOKEN_KEY = "utabiri_token"; // shared with lib/api.ts
const USER_KEY = "utabiri_user";
const EVENT = "utabiri-session";

export function setSession(token: string, user: SessionUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(EVENT));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event(EVENT));
}

export function useSession(): SessionUser | null {
  const [user, setUser] = useState<SessionUser | null>(null);
  useEffect(() => {
    const read = () => {
      try {
        setUser(JSON.parse(localStorage.getItem(USER_KEY) ?? "null"));
      } catch {
        setUser(null);
      }
    };
    read();
    window.addEventListener(EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);
  return user;
}

export function fmtKES(cents: number): string {
  return `KES ${(cents / 100).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
