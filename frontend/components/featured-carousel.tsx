"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, type ApiInsight } from "@/lib/api";
import { fmtDate } from "@/lib/live";
import { ChevronRightIcon, PulseIcon } from "@/components/icons";

function shortTitle(q: string): string {
  return q.length > 30 ? `${q.slice(0, 28)}…` : q;
}

const SENTIMENT_CLS: Record<string, string> = {
  bullish: "text-up",
  bearish: "text-down",
  neutral: "text-mut",
};

export function FeaturedCarousel() {
  const [items, setItems] = useState<ApiInsight[]>([]);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const load = () =>
      api<{ items: ApiInsight[] }>("/insights?per_page=6", { token: null })
        .then((r) => setItems(r.items))
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  const featured = useMemo(() => items.slice(0, 6), [items]);

  useEffect(() => {
    if (paused || featured.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % featured.length), 8000);
    return () => clearInterval(t);
  }, [paused, featured.length]);

  if (featured.length === 0) return null;
  const i = featured[idx % featured.length];
  const prev = featured[(idx - 1 + featured.length) % featured.length];
  const next = featured[(idx + 1) % featured.length];

  return (
    <section
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="rounded-2xl border border-line bg-panel p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent-2">
            <PulseIcon width={22} height={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-mut">
              {i.kind === "forecast" ? "Forecast" : i.kind === "recommendation" ? "Recommendation" : "Commentary"}{" "}
              <span className="text-mut-2">·</span> {i.category}
            </p>
            <Link
              href={`/insights/${i.id}`}
              className="mt-0.5 block text-xl font-extrabold tracking-tight hover:text-accent-2 sm:text-2xl"
            >
              {i.title}
            </Link>
          </div>
          {i.sentiment && (
            <span className={`shrink-0 text-sm font-bold ${SENTIMENT_CLS[i.sentiment]}`}>
              {i.sentiment}
            </span>
          )}
        </div>

        <p className="mt-4 text-sm leading-relaxed text-mut">{i.body}</p>
        <p className="mt-3 text-xs text-mut-2">{fmtDate(i.created_at)}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          {featured.map((f, j) => (
            <button
              key={f.id}
              onClick={() => setIdx(j)}
              aria-label={`Show ${f.title}`}
              className={`h-1.5 rounded-full transition-all ${
                j === idx % featured.length ? "w-6 bg-white" : "w-1.5 bg-line hover:bg-mut-2"
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
            {shortTitle(prev.title)}
          </button>
          <button
            onClick={() => setIdx((idx + 1) % featured.length)}
            className="flex items-center gap-1 rounded-full border border-line bg-panel px-4 py-2 text-sm font-bold text-mut transition hover:text-white"
          >
            {shortTitle(next.title)}
            <ChevronRightIcon width={14} height={14} />
          </button>
        </div>
      </div>
    </section>
  );
}
