"use client";

import { useEffect, useMemo, useState } from "react";
import { NewsIcon } from "@/components/icons";

type NewsItem = {
  source: string;
  title: string;
  summary: string;
  link: string;
  published: string;
  category: "Politics" | "Business" | "Sports" | "General";
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return `${Math.max(1, Math.floor(ms / 60_000))}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function useNews(): NewsItem[] {
  const [items, setItems] = useState<NewsItem[]>([]);
  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((d: { items?: NewsItem[] }) => setItems(d.items ?? []))
      .catch(() => {});
  }, []);
  return items;
}

const STOPWORDS = new Set([
  "will", "the", "by", "in", "for", "before", "what", "into", "law", "of",
  "a", "an", "to", "be", "is", "on", "at", "and",
]);

/** Two compact headlines, keyword-matched to the market when possible. */
export function CarouselNews({ keywords }: { keywords: string }) {
  const items = useNews();
  const picked = useMemo(() => {
    if (items.length === 0) return [];
    const words = keywords
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3 && !STOPWORDS.has(w));
    const scored = items
      .map((n) => ({
        n,
        score: words.filter((w) => n.title.toLowerCase().includes(w)).length,
      }))
      .sort((a, b) => b.score - a.score || b.n.published.localeCompare(a.n.published));
    // prefer related headlines; otherwise just the freshest
    return (scored[0]?.score ? scored : items.map((n) => ({ n, score: 0 })))
      .slice(0, 2)
      .map((s) => s.n);
  }, [items, keywords]);

  if (picked.length === 0) return null;
  return (
    <div className="flex flex-col gap-3 border-t border-line/60 pt-3">
      {picked.map((n) => (
        <a
          key={n.link}
          href={n.link}
          target="_blank"
          rel="noopener noreferrer"
          className="group block"
        >
          <p className="flex items-center gap-1.5 text-xs text-mut-2">
            <NewsIcon width={12} height={12} />
            <span className="font-semibold text-mut">{n.source}</span> ·{" "}
            {timeAgo(n.published)}
          </p>
          <p className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug text-white/90 group-hover:text-accent-2">
            {n.title}
          </p>
        </a>
      ))}
    </div>
  );
}

const CATS = ["All", "Politics", "Business", "Sports"] as const;

/** Sidebar panel: latest headlines across trusted Kenyan sources. */
export function NewsPanel() {
  const items = useNews();
  const [cat, setCat] = useState<(typeof CATS)[number]>("All");

  const shown = items
    .filter((n) => cat === "All" || n.category === cat)
    .slice(0, 6);

  return (
    <section className="rounded-xl border border-line bg-panel p-4">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-bold">Kenya News</h4>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-mut-2">
          Live · 10 sources
        </span>
      </div>
      <div className="mb-2 flex gap-1.5">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
              cat === c
                ? "bg-white text-ink"
                : "border border-line text-mut hover:text-white"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-mut">Loading headlines…</p>
      ) : shown.length === 0 ? (
        <p className="py-3 text-sm text-mut">No {cat} headlines right now.</p>
      ) : (
        <ul className="divide-y divide-line/60">
          {shown.map((n) => (
            <li key={n.link} className="py-2.5">
              <a
                href={n.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group block"
              >
                <p className="line-clamp-2 text-sm font-medium leading-snug group-hover:text-accent-2">
                  {n.title}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-mut-2">
                  <span className="font-semibold text-mut">{n.source}</span> ·{" "}
                  {timeAgo(n.published)}
                  {n.category !== "General" && (
                    <span className="rounded bg-panel-2 px-1.5 py-0.5 text-[10px] font-bold text-mut">
                      {n.category}
                    </span>
                  )}
                </p>
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[10px] text-mut-2">
        Nation, The Standard, The Star, KNA, Business Daily, Citizen, Kenyans,
        Capital FM, KBC &amp; Kenyan Wallstreet — headlines link to the
        original articles.
      </p>
    </section>
  );
}
