"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type ApiInsight } from "@/lib/api";
import { ChevronRightIcon, PulseIcon, SparkIcon } from "@/components/icons";

/** Promo card + most recent insight categories, Polymarket-style right rail. */
export function HotTopics() {
  const [items, setItems] = useState<ApiInsight[]>([]);

  useEffect(() => {
    api<{ items: ApiInsight[] }>("/insights?per_page=20", { token: null })
      .then((r) => setItems(r.items))
      .catch(() => {});
  }, []);

  const topics = Array.from(new Set(items.map((i) => i.category))).slice(0, 5);

  return (
    <div className="flex flex-col gap-3">
      {/* promo card */}
      <section className="relative overflow-hidden rounded-xl border border-line bg-gradient-to-br from-[#2a1b54] via-[#1c1740] to-panel p-4">
        <span className="absolute right-3 top-3 rounded-full border border-white/20 px-2 py-0.5 text-[10px] font-bold text-white/70">
          Beta
        </span>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-accent-2">
          <SparkIcon width={20} height={20} />
        </span>
        <h3 className="mt-3 text-lg font-extrabold leading-tight">
          Get personalized advice
        </h3>
        <p className="mt-1 text-xs text-white/70">
          Follow topics like maize or forex for tailored recommendations
        </p>
        <Link
          href="/settings"
          className="mt-3 block w-full rounded-full bg-accent py-2.5 text-center text-sm font-bold text-white transition hover:bg-accent-2"
        >
          Set my interests
        </Link>
      </section>

      {/* hot topics */}
      <section className="rounded-xl border border-line bg-panel p-4">
        <Link
          href="/insights"
          className="flex items-center gap-1 text-base font-extrabold tracking-tight hover:text-accent-2"
        >
          Hot topics <ChevronRightIcon width={15} height={15} />
        </Link>
        <ul className="mt-2 divide-y divide-line/60">
          {topics.map((t, i) => (
            <li key={t}>
              <Link
                href={`/insights?category=${encodeURIComponent(t)}`}
                className="group flex items-center gap-3 py-2.5"
              >
                <span className="w-4 text-sm font-bold text-mut-2">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold group-hover:text-accent-2">
                  {t}
                </span>
                <PulseIcon width={13} height={13} className="text-down" />
                <ChevronRightIcon width={13} height={13} className="text-mut-2" />
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/insights"
          className="mt-2 block rounded-full border border-line py-2.5 text-center text-sm font-bold transition hover:bg-panel-2"
        >
          Explore all
        </Link>
      </section>
    </div>
  );
}
