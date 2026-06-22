import { BottomNav } from "@/components/bottom-nav";
import { CategoryTabs } from "@/components/category-tabs";
import { CommodityPriceTable } from "@/components/commodity-price-table";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";

export default function CommoditiesPage() {
  return (
    <div className="min-h-dvh">
      <Navbar />
      <CategoryTabs />
      <main className="mx-auto max-w-screen-xl px-4 pb-24 pt-6 md:pb-10">
        <CommodityPriceTable />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
