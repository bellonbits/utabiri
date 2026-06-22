import { Suspense } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { CategoryTabs } from "@/components/category-tabs";
import { Footer } from "@/components/footer";
import { InsightExplorer } from "@/components/insight-explorer";
import { Navbar } from "@/components/navbar";

export default function InsightsPage() {
  return (
    <div className="min-h-dvh">
      <Navbar />
      <CategoryTabs />
      <main className="mx-auto max-w-screen-xl px-4 pb-24 pt-6 md:pb-10">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-panel" />}>
          <InsightExplorer />
        </Suspense>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
