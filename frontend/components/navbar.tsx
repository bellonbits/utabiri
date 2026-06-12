"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { clearSession, fmtKES, useSession } from "@/lib/session";
import { BellIcon, GiftIcon, SearchIcon, MenuIcon } from "@/components/icons";

const links = [
  { label: "Markets", href: "/" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Wallet", href: "/wallet" },
  { label: "Leaderboard", href: "/leaderboard" },
];

export function Navbar() {
  const user = useSession();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setBalance(null);
      return;
    }
    api<{ balance_cents: number }>("/wallet")
      .then((w) => setBalance(w.balance_cents))
      .catch(() => setBalance(null));
  }, [user]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 text-white">
          <Image
            src="/logo-mark-light.png"
            alt="Utabiri bear logo"
            width={34}
            height={43}
            priority
            className="h-10 w-auto"
          />
          <span className="text-xl font-extrabold lowercase tracking-tight">
            utabiri
          </span>
        </Link>

        <span className="hidden h-5 w-px bg-line md:block" />

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-mut transition hover:bg-panel hover:text-white"
            >
              {l.label}
            </Link>
          ))}
          {user?.is_admin && (
            <Link
              href="/admin"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-gold transition hover:bg-panel"
            >
              Admin
            </Link>
          )}
          <Link
            href="#"
            className="ml-1 flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm font-medium text-gold transition hover:border-gold/60"
          >
            <GiftIcon width={14} height={14} /> Rewards
          </Link>
        </nav>

        <div className="ml-auto hidden min-w-0 max-w-xs flex-1 items-center gap-2 rounded-lg border border-line bg-panel px-3 py-1.5 lg:flex">
          <SearchIcon className="shrink-0 text-mut-2" width={16} height={16} />
          <input
            placeholder="Search everything"
            className="w-full bg-transparent text-sm outline-none placeholder:text-mut-2"
          />
          <kbd className="rounded border border-line px-1.5 text-xs text-mut-2">/</kbd>
        </div>

        <Link
          href="/notifications"
          className="relative ml-auto rounded-md p-2 text-mut hover:text-white lg:ml-0"
        >
          <BellIcon />
          <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
            1
          </span>
        </Link>

        {user ? (
          <div className="flex items-center gap-2">
            {balance !== null && (
              <Link
                href="/wallet"
                className="hidden rounded-lg border border-line bg-panel px-3 py-1.5 text-sm font-bold text-up sm:block"
              >
                {fmtKES(balance)}
              </Link>
            )}
            <Link
              href="/profile"
              className="rounded-lg px-2 py-1.5 text-sm font-semibold text-white hover:bg-panel"
            >
              {user.display_name}
            </Link>
            <button
              onClick={() => clearSession()}
              className="rounded-lg px-2 py-1.5 text-sm font-semibold text-mut transition hover:text-white"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-mut transition hover:text-white"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-gold px-4 py-1.5 text-sm font-bold text-ink transition hover:brightness-110"
            >
              Sign Up
            </Link>
          </div>
        )}
        <button className="rounded-md p-2 text-mut hover:text-white md:hidden">
          <MenuIcon />
        </button>
      </div>
    </header>
  );
}
