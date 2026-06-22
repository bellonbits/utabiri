import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { Footer } from "@/components/footer";
import { CategoryTabs } from "@/components/category-tabs";
import { CommodityPriceTable } from "@/components/commodity-price-table";
import { FeaturedCarousel } from "@/components/featured-carousel";
import { HotTopics } from "@/components/hot-topics";
import { LiveTicker } from "@/components/live-markets";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { TrendPulse } from "@/components/trend-pulse";
import type { ApiBriefing } from "@/lib/api";
import { serverApiUrl } from "@/lib/live";

export const dynamic = "force-dynamic";

async function getLatestBriefing(): Promise<ApiBriefing | null> {
  const res = await fetch(`${serverApiUrl()}/briefing/latest`, { cache: "no-store" }).catch(() => null);
  return res && res.ok ? res.json() : null;
}

function BriefingTeaser({ briefing }: { briefing: ApiBriefing }) {
  const color = briefing.health_score >= 65 ? "text-up" : briefing.health_score >= 40 ? "text-gold" : "text-down";
  const trendMark = briefing.score_trend === "up" ? "▲" : briefing.score_trend === "down" ? "▼" : "–";
  return (
    <Link
      href="/briefing"
      className="flex items-center gap-4 rounded-2xl border border-line bg-panel p-4 transition hover:border-accent/50 hover:bg-panel-2"
    >
      <span className={`text-3xl font-extrabold ${color}`}>{briefing.health_score}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-mut-2">
          Daily Economic Briefing <span className={color}>{trendMark} {briefing.score_trend}</span>
        </p>
        <p className="truncate text-sm font-bold">{briefing.executive_summary}</p>
      </div>
      <span className="shrink-0 text-sm font-bold text-accent-2">View full report →</span>
    </Link>
  );
}

export default async function Home() {
  const briefing = await getLatestBriefing();

  return (
    <div className="min-h-dvh">
      <Navbar />
      <CategoryTabs />
      <LiveTicker />

      <main className="mx-auto max-w-screen-2xl px-4 pb-24 pt-4 md:pb-8">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
          <div className="flex min-w-0 flex-col gap-5">
            {briefing && <BriefingTeaser briefing={briefing} />}
            <FeaturedCarousel />
            <CommodityPriceTable />
          </div>

          <div className="hidden flex-col gap-3 lg:flex">
            <TrendPulse />
            <HotTopics />
            <Sidebar />
          </div>
        </div>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
