import Link from "next/link";
import { notFound } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { Footer } from "@/components/footer";
import { CategoryTabs } from "@/components/category-tabs";
import { LiveTicker } from "@/components/live-markets";
import { MarketCard } from "@/components/market-card";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { TrendPulse } from "@/components/trend-pulse";
import { categories, categoryBySlug } from "@/lib/categories";
import { markets } from "@/lib/data";

/** Map page slugs onto the AI Pulse categories. */
const AI_CATEGORY: Record<string, string> = {
  politics: "Politics",
  elections: "Politics",
  sports: "Sports",
  economy: "Business",
  business: "Business",
  crypto: "Business",
};

export function generateStaticParams() {
  return categories.map((c) => ({ slug: c.slug }));
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = categoryBySlug(slug);
  if (!category) notFound();

  const items = markets.filter((m) =>
    category.match.includes(m.category ?? ""),
  );

  return (
    <div className="min-h-dvh">
      <Navbar />
      <CategoryTabs />
      <LiveTicker />

      <main className="mx-auto max-w-screen-2xl px-4 pb-24 pt-5 md:pb-8">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
          <div className="flex min-w-0 flex-col gap-4">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">
                {category.label}
              </h1>
              <p className="mt-1 text-sm text-mut">{category.blurb}</p>
            </div>

            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-panel p-10 text-center">
                <p className="text-base font-bold">
                  No {category.label} markets yet
                </p>
                <p className="mt-1 text-sm text-mut">
                  New markets land every week — check back soon or browse
                  everything that&apos;s live now.
                </p>
                <Link
                  href="/"
                  className="mt-4 inline-block rounded-full bg-accent px-5 py-2 text-sm font-bold text-white transition hover:bg-accent-2"
                >
                  Browse all markets
                </Link>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {items.map((m) => (
                  <MarketCard key={m.id} market={m} />
                ))}
              </div>
            )}
          </div>

          <div className="hidden flex-col gap-3 lg:flex">
            <TrendPulse category={AI_CATEGORY[slug]} />
            <Sidebar />
          </div>
        </div>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
