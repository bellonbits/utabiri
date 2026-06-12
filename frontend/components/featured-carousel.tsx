"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, type ApiMarket } from "@/lib/api";
import { markets as staticMarkets } from "@/lib/data";
import { SERIES_COLORS, seededSeries } from "@/lib/series";
import { CarouselNews } from "@/components/news-feed";
import { PriceChart, type ChartSeries } from "@/components/price-chart";
import {
  BookmarkIcon,
  ChevronRightIcon,
  PulseIcon,
} from "@/components/icons";

function fmtVol(cents: number): string {
  const kes = cents / 100;
  if (kes >= 1_000_000) return `KES ${(kes / 1_000_000).toFixed(1)}M Vol.`;
  if (kes >= 1_000) return `KES ${Math.round(kes / 1_000)}K Vol.`;
  return `KES ${Math.round(kes)} Vol.`;
}

function shortName(q: string): string {
  return q.length > 22 ? `${q.slice(0, 20)}…` : q;
}

export function FeaturedCarousel() {
  const [live, setLive] = useState<ApiMarket[]>([]);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const load = () =>
      api<{ items: ApiMarket[] }>("/markets", { token: null })
        .then((r) => setLive(r.items))
        .catch(() => {});
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  // feature the top markets by volume (live), fall back to static order
  const featured = useMemo(() => {
    const base = live.length
      ? live
      : staticMarkets.map((m) => ({
          id: m.id,
          question: m.question,
          category: m.category ?? "Markets",
          volume_cents: 0,
          status: "open",
          outcomes:
            m.kind === "binary"
              ? [{ id: m.id, label: "Yes", price_yes: (m.yes ?? 50) / 100, price_no: 0 }]
              : m.kind === "matchup"
                ? m.teams!.map((t) => ({ id: t.abbr, label: t.name, price_yes: t.pct / 100, price_no: 0 }))
                : m.outcomes!.map((o) => ({ id: o.label, label: o.label, price_yes: o.yes / 100, price_no: 0 })),
        }));
    return base.slice(0, 6);
  }, [live]);

  // autoplay
  useEffect(() => {
    if (paused || featured.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % featured.length), 8000);
    return () => clearInterval(t);
  }, [paused, featured.length]);

  if (featured.length === 0) return null;
  const m = featured[idx % featured.length];
  const img = staticMarkets.find((s) => s.id === m.id)?.image;
  const prev = featured[(idx - 1 + featured.length) % featured.length];
  const next = featured[(idx + 1) % featured.length];

  const series: ChartSeries[] = m.outcomes.slice(0, 4).map((o, i) => ({
    label: o.label,
    pct: o.price_yes * 100,
    color: SERIES_COLORS[i % SERIES_COLORS.length],
    points: seededSeries(`${m.id}:${o.label}`, o.price_yes * 100, 90),
  }));

  return (
    <section
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="rounded-2xl border border-line bg-panel p-5">
        {/* header */}
        <div className="flex items-start gap-3">
          {img && (
            <Image
              src={img}
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 shrink-0 rounded-xl object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-mut">
              Markets <span className="text-mut-2">·</span> {m.category}
            </p>
            <Link
              href={`/markets/${m.id}`}
              className="mt-0.5 block truncate text-xl font-extrabold tracking-tight hover:text-accent-2 sm:text-2xl"
            >
              {m.question}
            </Link>
          </div>
          <button className="rounded-md p-2 text-mut hover:text-white">
            <BookmarkIcon width={17} height={17} />
          </button>
        </div>

        {/* body: outcomes + chart */}
        <div className="mt-4 grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
          <div className="flex flex-col divide-y divide-line/60">
            {m.outcomes.slice(0, 4).map((o, i) => (
              <Link
                key={o.id}
                href={`/markets/${m.id}`}
                className="group flex items-center justify-between gap-2 py-3"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }}
                  />
                  <span className="truncate text-sm font-semibold group-hover:text-accent-2">
                    {o.label}
                  </span>
                </span>
                <span className="text-xl font-extrabold tracking-tight">
                  {Math.round(o.price_yes * 100)}%
                </span>
              </Link>
            ))}
            <div className="py-3">
              <CarouselNews keywords={`${m.question} ${m.category}`} />
            </div>
            <div className="pt-3 text-xs text-mut-2">
              <span className="flex items-center gap-1.5">
                <PulseIcon width={13} height={13} /> {fmtVol(m.volume_cents)}
                <span>· Ends Dec 31, 2026</span>
              </span>
            </div>
          </div>
          <div className="min-w-0">
            <PriceChart series={series} />
          </div>
        </div>
      </div>

      {/* dots + prev/next pills */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          {featured.map((f, i) => (
            <button
              key={f.id}
              onClick={() => setIdx(i)}
              aria-label={`Show ${f.question}`}
              className={`h-1.5 rounded-full transition-all ${
                i === idx % featured.length
                  ? "w-6 bg-white"
                  : "w-1.5 bg-line hover:bg-mut-2"
              }`}
            />
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setIdx((idx - 1 + featured.length) % featured.length)}
            className="flex items-center gap-1 rounded-full border border-line bg-panel px-4 py-2 text-sm font-bold text-mut transition hover:text-white"
          >
            <ChevronRightIcon width={14} height={14} className="rotate-180" />
            {shortName(prev.question)}
          </button>
          <button
            onClick={() => setIdx((idx + 1) % featured.length)}
            className="flex items-center gap-1 rounded-full border border-line bg-panel px-4 py-2 text-sm font-bold text-mut transition hover:text-white"
          >
            {shortName(next.question)}
            <ChevronRightIcon width={14} height={14} />
          </button>
        </div>
      </div>
    </section>
  );
}
