"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api, type ApiInsight, type InsightKind } from "@/lib/api";
import { categories } from "@/lib/categories";
import { InsightCard } from "@/components/insight-card";
import { SearchIcon } from "@/components/icons";

const KIND_CHIPS: { label: string; value: InsightKind | "All" }[] = [
  { label: "All", value: "All" },
  { label: "Commentary", value: "commentary" },
  { label: "Forecasts", value: "forecast" },
  { label: "Recommendations", value: "recommendation" },
];

export function InsightExplorer() {
  const params = useSearchParams();
  const [items, setItems] = useState<ApiInsight[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(params.get("category") || "All");
  const [kind, setKind] = useState<InsightKind | "All">("All");

  useEffect(() => {
    const params = new URLSearchParams();
    if (category !== "All") params.set("category", category);
    if (kind !== "All") params.set("kind", kind);
    api<{ items: ApiInsight[] }>(`/insights?${params}`, { token: null })
      .then((r) => setItems(r.items))
      .catch(() => {});
  }, [category, kind]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) => i.title.toLowerCase().includes(q) || i.body.toLowerCase().includes(q),
    );
  }, [items, query]);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold tracking-tight">Insights</h2>
      </div>

      <div className="flex min-w-0 items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2">
        <SearchIcon className="shrink-0 text-mut-2" width={16} height={16} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search insights"
          className="w-full bg-transparent text-sm outline-none placeholder:text-mut-2"
        />
        {query && (
          <button onClick={() => setQuery("")} className="text-xs font-bold text-mut hover:text-white">
            Clear
          </button>
        )}
      </div>

      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
        {KIND_CHIPS.map((c) => (
          <button
            key={c.value}
            onClick={() => setKind(c.value)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              kind === c.value ? "bg-white text-ink" : "border border-line bg-panel text-mut hover:text-white"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
        {["All", ...categories.map((c) => c.slug)].map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              category === c ? "bg-accent text-white" : "border border-line bg-panel text-mut hover:text-white"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-panel p-10 text-center">
          <p className="text-base font-bold">No insights yet</p>
          <p className="mt-1 text-sm text-mut">Check back soon, or try a different filter.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((i) => (
            <InsightCard key={i.id} insight={i} />
          ))}
        </div>
      )}
    </section>
  );
}
