"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GridIcon,
  HomeIcon,
  MenuIcon,
  PulseIcon,
  WheatIcon,
} from "@/components/icons";

const items = [
  { label: "Home", href: "/", Icon: HomeIcon },
  { label: "Commodities", href: "/commodities", Icon: WheatIcon },
  { label: "Macro", href: "/macro", Icon: GridIcon },
  { label: "Insights", href: "/insights", Icon: PulseIcon },
  { label: "More", href: "/settings", Icon: MenuIcon },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="flex items-stretch justify-around">
        {items.map(({ label, href, Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={label}>
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 px-4 py-2.5 text-[10px] font-medium ${
                  active ? "text-accent-2" : "text-mut-2 hover:text-white"
                }`}
              >
                <Icon width={20} height={20} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
