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
import { markets, type Market } from "@/lib/data";
import { SERIES_COLORS, seededSeries } from "@/lib/series";

export function generateStaticParams() {
  return markets.map((m) => ({ id: m.id }));
}

function outcomesOf(m: Market): TradeOutcome[] {
  if (m.kind === "binary") {
    return [
      {
        label: m.question.length > 28 ? "Yes" : m.question,
        pct: m.yes ?? 50,
        vol: m.volume,
        color: SERIES_COLORS[0],
      },
    ];
  }
  if (m.kind === "matchup") {
    return m.teams!.map((t, i) => ({
      label: t.name,
      pct: t.pct,
      vol: m.volume,
      color: SERIES_COLORS[i % SERIES_COLORS.length],
    }));
  }
  return m.outcomes!.map((o, i) => ({
    label: o.label,
    pct: o.yes,
    vol: m.volume,
    color: SERIES_COLORS[i % SERIES_COLORS.length],
  }));
}

export default async function MarketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const market = markets.find((m) => m.id === id);
  if (!market) notFound();

  const outcomes = outcomesOf(market);
  const series: ChartSeries[] = outcomes.map((o) => ({
    label: o.label,
    pct: o.pct,
    color: o.color,
    points: seededSeries(`${market.id}:${o.label}`, o.pct),
  }));

  const dto: TradeMarketDto = {
    id: market.id,
    question: market.question,
    image: market.image,
    category: market.category ?? "Markets",
    volume: market.volume,
    endDate: "Dec 31, 2026",
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
