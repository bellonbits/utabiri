import { BottomNav } from "@/components/bottom-nav";
import { Footer } from "@/components/footer";
import { CategoryTabs } from "@/components/category-tabs";
import { FeaturedCarousel } from "@/components/featured-carousel";
import { HotTopics } from "@/components/hot-topics";
import { LiveTicker } from "@/components/live-markets";
import { MarketExplorer } from "@/components/market-explorer";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { TrendPulse } from "@/components/trend-pulse";
import { TVAdvancedChart } from "@/components/tradingview";

export default function Home() {
  return (
    <div className="min-h-dvh">
      <Navbar />
      <CategoryTabs />
      <LiveTicker />

      <main className="mx-auto max-w-screen-2xl px-4 pb-24 pt-4 md:pb-8">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
          <div className="flex min-w-0 flex-col gap-5">
            <FeaturedCarousel />
            <MarketExplorer />

            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">
                  Macro Dashboard · USD/KES
                </h2>
                <span className="text-xs font-semibold uppercase tracking-wider text-mut-2">
                  Live · TradingView
                </span>
              </div>
              <TVAdvancedChart symbol="FX_IDC:USDKES" />
            </section>
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
