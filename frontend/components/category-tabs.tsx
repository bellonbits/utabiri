"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { categories } from "@/lib/categories";

export function CategoryTabs() {
  const pathname = usePathname();

  return (
    <div className="border-b border-line bg-ink">
      <div className="mx-auto flex max-w-screen-2xl items-center gap-1 px-4">
        <a
          href="#"
          className="mr-2 flex shrink-0 items-center gap-1.5 py-3 text-xs font-bold tracking-widest text-down"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-down opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-down" />
          </span>
          LIVE
        </a>
        <span className="h-5 w-px shrink-0 bg-line" />
        <nav className="no-scrollbar flex items-center gap-1 overflow-x-auto">
          <Link
            href="/"
            className={`shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition ${
              pathname === "/"
                ? "border-accent-2 text-white"
                : "border-transparent text-mut hover:text-white"
            }`}
          >
            For You
          </Link>
          {categories.map((c) => {
            const href = `/insights?category=${encodeURIComponent(c.slug)}`;
            return (
              <Link
                key={c.slug}
                href={href}
                className="shrink-0 border-b-2 border-transparent px-3 py-3 text-sm font-medium text-mut transition hover:text-white"
              >
                {c.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto hidden shrink-0 items-center gap-4 text-sm text-mut xl:flex">
          <a href="#" className="hover:text-white">
            Get the App
          </a>
          <a href="#" className="hover:text-white">
            Help
          </a>
        </div>
      </div>
    </div>
  );
}
