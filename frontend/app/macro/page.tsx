"use client";

import { useEffect, useState } from "react";
import { api, type ApiMacroIndicator } from "@/lib/api";
import { BottomNav } from "@/components/bottom-nav";
import { CategoryTabs } from "@/components/category-tabs";
import { Footer } from "@/components/footer";
import { MacroIndicatorCard } from "@/components/macro-indicator-card";
import { Navbar } from "@/components/navbar";
import { NseLive } from "@/components/live-markets";
import { TVAdvancedChart } from "@/components/tradingview";

export default function MacroPage() {
  const [indicators, setIndicators] = useState<ApiMacroIndicator[]>([]);

  useEffect(() => {
    api<{ items: ApiMacroIndicator[] }>("/macro/indicators", { token: null })
      .then((r) => setIndicators(r.items))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-dvh">
      <Navbar />
      <CategoryTabs />
      <main className="mx-auto max-w-screen-xl px-4 pb-24 pt-6 md:pb-10">
        <h1 className="text-2xl font-extrabold tracking-tight">Macro Dashboard</h1>
        <p className="mt-1 text-sm text-mut">Kenya's key national indicators</p>

        {indicators.length > 0 && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {indicators.map((ind) => (
              <MacroIndicatorCard key={ind.name} indicator={ind} />
            ))}
          </div>
        )}

        <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-bold">USD/KES</h2>
            <TVAdvancedChart symbol="FX_IDC:USDKES" />
          </section>
          <section className="rounded-xl border border-line bg-panel p-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <h4 className="text-sm font-bold">NSE Live</h4>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-mut-2">
                Nairobi Securities Exchange
              </span>
            </div>
            <NseLive />
          </section>
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
