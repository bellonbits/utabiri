import { notFound } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { Footer } from "@/components/footer";
import { CategoryTabs } from "@/components/category-tabs";
import { Navbar } from "@/components/navbar";
import { PriceChart, type ChartSeries } from "@/components/price-chart";
import {
  TradeView,
  type TradeMarketDto,
  type TradeOutcome,
} from "@/components/trade-view";
import type { ApiMarket } from "@/lib/api";
import { fmtEndDate, fmtVolCents, marketImage, serverApiUrl } from "@/lib/live";
import { SERIES_COLORS, seededSeries } from "@/lib/series";

// markets are created at runtime via /admin — always render fresh
export const dynamic = "force-dynamic";

export default async function MarketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await fetch(`${serverApiUrl()}/markets/${id}`, {
    cache: "no-store",
  }).catch(() => null);
  if (!res || res.status === 404) notFound();
  if (!res.ok) throw new Error(`market fetch failed: ${res.status}`);
  const market: ApiMarket = await res.json();

  const outcomes: TradeOutcome[] = market.outcomes.map((o, i) => ({
    label: o.label,
    pct: Math.round(o.price_yes * 100),
    vol: fmtVolCents(market.volume_cents),
    color: SERIES_COLORS[i % SERIES_COLORS.length],
  }));
  const series: ChartSeries[] = outcomes.map((o) => ({
    label: o.label,
    pct: o.pct,
    color: o.color,
    points: seededSeries(`${market.id}:${o.label}`, o.pct),
  }));

  const dto: TradeMarketDto = {
    id: market.id,
    question: market.question,
    image: marketImage(market),
    category: market.category || "Markets",
    volume: fmtVolCents(market.volume_cents),
    endDate: fmtEndDate(market.end_date),
  };

  return (
    <div className="min-h-dvh">
      <Navbar />
      <CategoryTabs />
      <main className="mx-auto max-w-screen-xl px-4 pb-24 pt-6 md:pb-10">
        <TradeView
          market={dto}
          outcomes={outcomes}
          chart={<PriceChart series={series} />}
        />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
