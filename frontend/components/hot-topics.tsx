"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, type ApiMarket } from "@/lib/api";
import { categories } from "@/lib/categories";
import { ChevronRightIcon, PulseIcon, SparkIcon } from "@/components/icons";

function fmtVol(cents: number): string {
  const kes = cents / 100;
  if (kes >= 1_000_000) return `KES ${(kes / 1_000_000).toFixed(1)}M`;
  if (kes >= 1_000) return `KES ${Math.round(kes / 1_000)}K`;
  return `KES ${Math.round(kes)}`;
}

/** Promo card + ranked topics by live volume, Polymarket-style right rail. */
export function HotTopics() {
  const [live, setLive] = useState<ApiMarket[]>([]);

  useEffect(() => {
    api<{ items: ApiMarket[] }>("/markets", { token: null })
      .then((r) => setLive(r.items))
      .catch(() => {});
  }, []);

  const topics = useMemo(() => {
    const byCat = new Map<string, number>();
    for (const m of live) {
      byCat.set(m.category, (byCat.get(m.category) ?? 0) + m.volume_cents);
    }
    return Array.from(byCat.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, vol]) => ({
        label,
        vol,
        slug:
          categories.find((c) => c.match.includes(label))?.slug ?? "politics",
      }));
  }, [live]);

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
          Build an AFCON combo
        </h3>
        <p className="mt-1 text-xs text-white/70">
          Combine multiple predictions in a combo to win big
        </p>
        <button className="mt-3 w-full rounded-full bg-accent py-2.5 text-sm font-bold text-white transition hover:bg-accent-2">
          Get started
        </button>
      </section>

      {/* hot topics */}
      <section className="rounded-xl border border-line bg-panel p-4">
        <Link
          href="/"
          className="flex items-center gap-1 text-base font-extrabold tracking-tight hover:text-accent-2"
        >
          Hot topics <ChevronRightIcon width={15} height={15} />
        </Link>
        <ul className="mt-2 divide-y divide-line/60">
          {(topics.length
            ? topics
            : categories.slice(0, 5).map((c) => ({ label: c.label, vol: 0, slug: c.slug }))
          ).map((t, i) => (
            <li key={t.label}>
              <Link
                href={`/category/${t.slug}`}
                className="group flex items-center gap-3 py-2.5"
              >
                <span className="w-4 text-sm font-bold text-mut-2">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold group-hover:text-accent-2">
                  {t.label}
                </span>
                {t.vol > 0 && (
                  <span className="text-xs font-semibold text-mut">
                    {fmtVol(t.vol)} today
                  </span>
                )}
                <PulseIcon width={13} height={13} className="text-down" />
                <ChevronRightIcon width={13} height={13} className="text-mut-2" />
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/"
          className="mt-2 block rounded-full border border-line py-2.5 text-center text-sm font-bold transition hover:bg-panel-2"
        >
          Explore all
        </Link>
      </section>
    </div>
  );
}
