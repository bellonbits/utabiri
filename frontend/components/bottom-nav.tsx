"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ActivityIcon,
  FileTextIcon,
  GamepadIcon,
  HomeIcon,
  UserIcon,
} from "@/components/icons";
import { useBetslip } from "@/lib/betslip-store";

export function BottomNav() {
  const pathname = usePathname();
  const { count, toggleDrawer } = useBetslip();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="flex items-stretch justify-around">
        <li>
          <Link
            href="/sports"
            className={`flex flex-col items-center gap-1 px-3 py-2 text-[10px] font-bold ${
              pathname === "/" || pathname.startsWith("/sports") ? "text-accent-2" : "text-mut hover:text-slate-900"
            }`}
          >
            <HomeIcon width={18} height={18} />
            <span>Home</span>
          </Link>
        </li>
        <li>
          <Link
            href="/live"
            className={`flex flex-col items-center gap-1 px-3 py-2 text-[10px] font-bold ${
              pathname.startsWith("/live") ? "text-rose-600" : "text-mut hover:text-slate-900"
            }`}
          >
            <ActivityIcon width={18} height={18} className={pathname.startsWith("/live") ? "animate-pulse" : ""} />
            <span>Live</span>
          </Link>
        </li>
        <li>
          <Link
            href="/games"
            className={`flex flex-col items-center gap-1 px-3 py-2 text-[10px] font-bold ${
              pathname.startsWith("/games") ? "text-accent-2" : "text-mut hover:text-slate-900"
            }`}
          >
            <GamepadIcon width={18} height={18} />
            <span>Games</span>
          </Link>
        </li>
        <li>
          <button
            onClick={() => toggleDrawer(true)}
            className="relative flex flex-col items-center gap-1 px-3 py-2 text-[10px] font-bold text-mut hover:text-slate-900"
          >
            <div className="relative">
              <FileTextIcon width={18} height={18} />
              {count > 0 && (
                <span className="absolute -top-1 -right-2 rounded-full bg-accent text-white px-1 text-[9px] font-black">
                  {count}
                </span>
              )}
            </div>
            <span>Betslip</span>
          </button>
        </li>
        <li>
          <Link
            href="/account"
            className={`flex flex-col items-center gap-1 px-3 py-2 text-[10px] font-bold ${
              pathname.startsWith("/account") ? "text-accent-2" : "text-mut hover:text-slate-900"
            }`}
          >
            <UserIcon width={18} height={18} />
            <span>Account</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
