"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { IMG } from "@/lib/data";
import { BottomNav } from "@/components/bottom-nav";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { ChevronRightIcon, NewsIcon, SparkIcon } from "@/components/icons";

type Hot = {
  topic: string;
  category: string;
  sentiment: "positive" | "negative" | "neutral";
  momentum: "rising" | "steady" | "cooling";
  summary: string;
};

type Trends = {
  generated_at: string;
  hottest: Hot[];
  by_category: Record<
    string,
    { sentiment: string; trending: string[]; summary: string }
  >;
};

type NewsItem = {
  source: string;
  title: string;
  summary: string;
  link: string;
  published: string;
  category: string;
  image: string;
};

const SENTIMENT = {
  positive: { mark: "▲", chip: "bg-up/15 text-up" },
  negative: { mark: "▼", chip: "bg-down/15 text-down" },
  neutral: { mark: "–", chip: "bg-panel-2 text-mut" },
} as const;

const FALLBACK_IMG: Record<string, string> = {
  Politics: IMG.nairobi,
  Business: IMG.stockChart,
  Sports: IMG.stadium,
  General: IMG.nairobi,
};

const STOPWORDS = new Set([
  "will", "the", "and", "for", "with", "over", "after", "amid", "into",
  "from", "this", "that", "says", "kenya", "kenyan", "new", "plan", "calls",
]);

function keywords(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9']+/)
        .filter((w) => w.length > 3 && !STOPWORDS.has(w)),
    ),
  );
}

function timeAgo(iso: string): string {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function PulseContent() {
  const params = useSearchParams();
  const selected = params.get("topic");
  const [trends, setTrends] = useState<Trends | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    api<Trends>("/trends", { token: null }).then(setTrends).catch(() => {});
    fetch("/api/news")
      .then((r) => r.json())
      .then((d: { items?: NewsItem[] }) => setNews(d.items ?? []))
      .catch(() => {});
  }, []);

  const topic = useMemo(() => {
    if (!trends) return null;
    if (!selected) return trends.hottest[0] ?? null;
    return (
      trends.hottest.find(
        (h) => h.topic.toLowerCase() === selected.toLowerCase(),
      ) ?? {
        // trending chips that aren't in "hottest" still get a page
        topic: selected,
        category: "General",
        sentiment: "neutral" as const,
        momentum: "steady" as const,
        summary: `Stories related to "${selected}" from today's coverage.`,
      }
    );
  }, [trends, selected]);

  const stories = useMemo(() => {
    if (!topic || news.length === 0) return [];
    const kws = keywords(`${topic.topic} ${topic.summary}`);
    const scored = news
      .map((n) => ({
        n,
        score: kws.filter((k) =>
          `${n.title} ${n.summary}`.toLowerCase().includes(k),
        ).length,
      }))
      .filter((s) => s.score > 0)
      .sort(
        (a, b) => b.score - a.score || b.n.published.localeCompare(a.n.published),
      )
      .map((s) => s.n);
    if (scored.length >= 3) return scored.slice(0, 9);
    // pad with same-category coverage so the page never feels empty
    const pad = news.filter(
      (n) => n.category === topic.category && !scored.includes(n),
    );
    return [...scored, ...pad].slice(0, 9);
  }, [topic, news]);

  if (!trends || !topic) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-2xl bg-panel" />
        ))}
      </div>
    );
  }

  const s = SENTIMENT[topic.sentiment];

  return (
    <>
      {/* topic hero */}
      <section className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-[#16223f] via-[#121b2e] to-[#0d1526] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-mut">
          <SparkIcon width={14} height={14} className="text-accent-2" />
          AI Pulse · {topic.category}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
          {topic.topic}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mut">
          {topic.summary}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${s.chip}`}>
            {s.mark} {topic.sentiment} coverage
          </span>
          <span className="rounded-full border border-line px-3 py-1 text-xs font-bold text-mut">
            Momentum: {topic.momentum}
          </span>
          <span className="text-xs text-mut-2">
            Analyzed {new Date(trends.generated_at).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </section>

      {/* other hot topics switcher */}
      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
        {trends.hottest.map((h) => {
          const active = h.topic === topic.topic;
          return (
            <Link
              key={h.topic}
              href={`/pulse?topic=${encodeURIComponent(h.topic)}`}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-bold transition ${
                active
                  ? "bg-white text-ink"
                  : "border border-line bg-panel text-mut hover:text-white"
              }`}
            >
              {SENTIMENT[h.sentiment].mark} {h.topic}
            </Link>
          );
        })}
      </div>

      {/* story grid */}
      <h2 className="mt-6 flex items-center gap-2 text-lg font-bold">
        <NewsIcon width={18} height={18} className="text-mut" />
        The full story
        <span className="text-sm font-medium text-mut-2">
          · {stories.length} articles from trusted sources
        </span>
      </h2>
      {stories.length === 0 ? (
        <p className="mt-4 text-sm text-mut">
          No matching coverage right now — feeds refresh every 5 minutes.
        </p>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((n) => (
            <a
              key={n.link}
              href={n.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-panel transition hover:border-accent/50"
            >
              <div className="relative h-40 overflow-hidden bg-panel-2">
                {/* external news CDNs — plain img keeps domains unrestricted */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={n.image || FALLBACK_IMG[n.category] || FALLBACK_IMG.General}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
                <span className="absolute left-3 top-3 rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
                  {n.source}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <p className="line-clamp-2 text-[15px] font-bold leading-snug group-hover:text-accent-2">
                  {n.title}
                </p>
                {n.summary && (
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-mut">
                    {n.summary}
                  </p>
                )}
                <p className="mt-auto flex items-center gap-1 pt-3 text-xs text-mut-2">
                  {timeAgo(n.published)} · {n.category} · Read on {n.source}
                  <ChevronRightIcon width={12} height={12} />
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </>
  );
}

export default function PulsePage() {
  return (
    <div className="min-h-dvh">
      <Navbar />
      <main className="mx-auto max-w-screen-xl px-4 pb-24 pt-5 md:pb-10">
        <Suspense
          fallback={<div className="h-64 animate-pulse rounded-3xl bg-panel" />}
        >
          <PulseContent />
        </Suspense>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
