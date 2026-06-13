"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { clearSession, fmtKES, useSession } from "@/lib/session";
import { BellIcon, GiftIcon, MenuIcon, SearchIcon, XIcon } from "@/components/icons";

const links = [
  { label: "Markets", href: "/" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Wallet", href: "/wallet" },
  { label: "Leaderboard", href: "/leaderboard" },
];

export function Navbar() {
  const user = useSession();
  const [balance, setBalance] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) { setBalance(null); return; }
    api<{ balance_cents: number }>("/wallet")
      .then((w) => setBalance(w.balance_cents))
      .catch(() => setBalance(null));
  }, [user]);

  // Close menu on route change (body scroll lock)
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-ink/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-4 px-4">
          <Link href="/" onClick={close} className="flex items-center gap-2 text-white">
            <Image
              src="/logo-mark-light.png"
              alt="Utabiri"
              width={34}
              height={43}
              priority
              className="h-9 w-auto"
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

          {/* desktop search */}
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

          {/* desktop auth */}
          {user ? (
            <div className="hidden items-center gap-2 md:flex">
              {balance !== null && (
                <Link
                  href="/wallet"
                  className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm font-bold text-up"
                >
                  {fmtKES(balance)}
                </Link>
              )}
              <Link
                href="/profile"
                className="max-w-[120px] truncate rounded-lg px-2 py-1.5 text-sm font-semibold text-white hover:bg-panel"
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
            <div className="hidden items-center gap-2 md:flex">
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

          {/* hamburger */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded-md p-2 text-mut hover:text-white md:hidden"
            aria-label="Toggle menu"
          >
            {menuOpen ? <XIcon /> : <MenuIcon />}
          </button>
        </div>
      </header>

      {/* mobile overlay menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={close} />

          {/* slide-down panel */}
          <div className="absolute inset-x-0 top-0 max-h-[90dvh] overflow-y-auto rounded-b-2xl border-b border-line bg-ink shadow-2xl">
            {/* top bar */}
            <div className="flex h-14 items-center gap-3 px-4">
              <Link href="/" onClick={close} className="flex items-center gap-2 text-white">
                <Image src="/logo-mark-light.png" alt="Utabiri" width={28} height={35} className="h-8 w-auto" />
                <span className="text-xl font-extrabold lowercase tracking-tight">utabiri</span>
              </Link>
              <button onClick={close} className="ml-auto rounded-md p-2 text-mut hover:text-white">
                <XIcon />
              </button>
            </div>

            {/* nav links */}
            <nav className="flex flex-col px-3 pb-2">
              {links.map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  onClick={close}
                  className="rounded-xl px-4 py-3.5 text-base font-semibold text-white hover:bg-panel"
                >
                  {l.label}
                </Link>
              ))}
              {user?.is_admin && (
                <Link
                  href="/admin"
                  onClick={close}
                  className="rounded-xl px-4 py-3.5 text-base font-semibold text-gold hover:bg-panel"
                >
                  Admin
                </Link>
              )}
              <Link
                href="#"
                onClick={close}
                className="flex items-center gap-2 rounded-xl px-4 py-3.5 text-base font-semibold text-gold hover:bg-panel"
              >
                <GiftIcon width={16} height={16} /> Rewards
              </Link>
            </nav>

            {/* auth section */}
            <div className="border-t border-line px-4 py-4">
              {user ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold">{user.display_name}</p>
                      {balance !== null && (
                        <p className="text-xs font-semibold text-up">{fmtKES(balance)}</p>
                      )}
                    </div>
                    <Link
                      href="/wallet"
                      onClick={close}
                      className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white"
                    >
                      Deposit
                    </Link>
                  </div>
                  <button
                    onClick={() => { clearSession(); close(); }}
                    className="mt-1 w-full rounded-xl border border-line py-3 text-sm font-semibold text-mut hover:text-white"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Link
                    href="/login"
                    onClick={close}
                    className="flex-1 rounded-xl border border-line py-3 text-center text-sm font-semibold hover:bg-panel"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    onClick={close}
                    className="flex-1 rounded-xl bg-gold py-3 text-center text-sm font-bold text-ink"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
