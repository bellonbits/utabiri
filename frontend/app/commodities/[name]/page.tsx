"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, type ApiInsight, type ApiTrendPoint } from "@/lib/api";
import { BottomNav } from "@/components/bottom-nav";
import { CategoryTabs } from "@/components/category-tabs";
import { Footer } from "@/components/footer";
import { InsightCard } from "@/components/insight-card";
import { Navbar } from "@/components/navbar";
import { AreaChart } from "@/components/charts";

export default function CommodityDetailPage() {
  const { name } = useParams<{ name: string }>();
  const commodity = decodeURIComponent(name);
  const [points, setPoints] = useState<ApiTrendPoint[]>([]);
  const [insights, setInsights] = useState<ApiInsight[]>([]);

  useEffect(() => {
    api<{ points: ApiTrendPoint[] }>(`/commodities/${encodeURIComponent(commodity)}/trend`, { token: null })
      .then((r) => setPoints(r.points))
      .catch(() => {});
    api<{ items: ApiInsight[] }>(
      `/insights?per_page=10`,
      { token: null },
    )
      .then((r) =>
        setInsights(r.items.filter((i) => i.related_commodity === commodity)),
      )
      .catch(() => {});
  }, [commodity]);

  const retailPoints = points.map((p) => p.avg_retail ?? 0).filter((v) => v > 0);
  const labels = points
    .filter((p) => p.avg_retail !== null)
    .map((p) => new Date(p.date).toLocaleDateString("en-KE", { month: "short", day: "numeric" }));

  return (
    <div className="min-h-dvh">
      <Navbar />
      <CategoryTabs />
      <main className="mx-auto max-w-screen-xl px-4 pb-24 pt-6 md:pb-10">
        <h1 className="text-2xl font-extrabold tracking-tight">{commodity}</h1>
        <p className="mt-1 text-sm text-mut">Average retail price trend across all reporting markets</p>

        <div className="mt-6 rounded-xl border border-line bg-panel p-5">
          {retailPoints.length >= 2 ? (
            <AreaChart points={retailPoints} labels={labels} />
          ) : (
            <p className="py-10 text-center text-sm text-mut">Not enough price history yet for a trend chart.</p>
          )}
        </div>

        {insights.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-lg font-bold">Related insights</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {insights.map((i) => (
                <InsightCard key={i.id} insight={i} />
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
