"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ChevronRightIcon, SparkIcon } from "@/components/icons";

type Hot = {
  topic: string;
  category: string;
  sentiment: "positive" | "negative" | "neutral";
  momentum: "rising" | "steady" | "cooling";
  summary: string;
};

type CatTrend = {
  sentiment: "positive" | "negative" | "neutral";
  trending: string[];
  summary: string;
};

type Trends = {
  generated_at: string;
  hottest: Hot[];
  by_category: Record<string, CatTrend>;
};

const SENTIMENT = {
  positive: { mark: "▲", cls: "text-up", chip: "bg-up/10 text-up" },
  negative: { mark: "▼", cls: "text-down", chip: "bg-down/10 text-down" },
  neutral: { mark: "–", cls: "text-mut", chip: "bg-panel-2 text-mut" },
} as const;

const MOMENTUM: Record<Hot["momentum"], string> = {
  rising: "Rising",
  steady: "Steady",
  cooling: "Cooling",
};

function useTrends(): Trends | null {
  const [data, setData] = useState<Trends | null>(null);
  useEffect(() => {
    api<Trends>("/trends", { token: null })
      .then(setData)
      .catch(() => {});
  }, []);
  return data;
}

/**
 * AI Pulse — Groq-scored sentiment and hottest topics from today's news.
 * Pass `category` (Politics | Business | Sports) to focus a category page.
 */
export function TrendPulse({ category }: { category?: string }) {
  const data = useTrends();

  if (!data) {
    return (
      <section className="rounded-xl border border-line bg-panel p-4">
        <PulseHeader />
        <div className="mt-3 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-panel-2" />
          ))}
        </div>
      </section>
    );
  }

  const focused = category ? data.by_category[category] : undefined;
  const hottest = category
    ? data.hottest.filter((h) => h.category === category)
    : data.hottest;

  return (
    <section className="rounded-xl border border-line bg-panel p-4">
      <PulseHeader />

      {/* category focus (category pages) */}
      {focused && (
        <div className="mt-3 rounded-lg border border-line/60 bg-panel-2 p-3">
          <p className="flex items-center gap-2 text-xs font-bold">
            <span className={SENTIMENT[focused.sentiment].cls}>
              {SENTIMENT[focused.sentiment].mark}
            </span>
            Coverage tone: {focused.sentiment}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-mut">{focused.summary}</p>
          {focused.trending.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {focused.trending.map((t) => (
                <Link
                  key={t}
                  href={`/pulse?topic=${encodeURIComponent(t)}`}
                  className="rounded-full border border-line px-2.5 py-0.5 text-[11px] font-bold text-white/85 transition hover:border-accent/60 hover:text-accent-2"
                >
                  {t}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* hottest topics */}
      {hottest.length > 0 && (
        <ul className="mt-3 divide-y divide-line/60">
          {hottest.slice(0, 6).map((h, i) => {
            const s = SENTIMENT[h.sentiment];
            return (
              <li key={h.topic} title={h.summary}>
                <Link
                  href={`/pulse?topic=${encodeURIComponent(h.topic)}`}
                  className="group block py-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-4 text-sm font-bold text-mut-2">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-bold group-hover:text-accent-2">
                      {h.topic}
                    </span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold ${s.chip}`}>
                      {s.mark} {h.sentiment}
                    </span>
                    <span className="text-[10px] font-bold text-mut-2">
                      {MOMENTUM[h.momentum]}
                    </span>
                  </div>
                  {!category && (
                    <p className="ml-6.5 mt-0.5 truncate pl-0.5 text-xs text-mut-2">
                      {h.category} · {h.summary}
                    </p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* per-category strip (home) */}
      {!category && Object.keys(data.by_category).length > 0 && (
        <div className="mt-3 space-y-2 border-t border-line/60 pt-3">
          {Object.entries(data.by_category).map(([cat, c]) => {
            const s = SENTIMENT[c.sentiment];
            return (
              <p key={cat} className="flex items-baseline gap-2 text-xs">
                <span className="w-14 shrink-0 font-bold text-mut">{cat}</span>
                <span className={`font-extrabold ${s.cls}`}>{s.mark}</span>
                <span className="min-w-0 flex-1 truncate text-white/80">
                  {c.trending.slice(0, 2).join(" · ") || c.summary}
                </span>
              </p>
            );
          })}
        </div>
      )}

      <p className="mt-3 text-[10px] text-mut-2">
        AI analysis of today&apos;s headlines · refreshed every 30 min ·{" "}
        {new Date(data.generated_at).toLocaleTimeString("en-KE", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
    </section>
  );
}

function PulseHeader() {
  return (
    <div className="flex items-center justify-between">
      <Link href="/pulse" className="group flex items-center gap-2 text-sm font-bold">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/15 text-accent-2">
          <SparkIcon width={13} height={13} />
        </span>
        <span className="group-hover:text-accent-2">AI Pulse</span>
        <ChevronRightIcon width={13} height={13} className="text-mut-2" />
      </Link>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-mut-2">
        Sentiment · Trends
      </span>
    </div>
  );
}
