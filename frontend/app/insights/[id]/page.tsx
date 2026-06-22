import { notFound } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { CategoryTabs } from "@/components/category-tabs";
import { ContentComments } from "@/components/content-comments";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import type { ApiInsight } from "@/lib/api";
import { fmtDate, serverApiUrl } from "@/lib/live";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<ApiInsight["kind"], string> = {
  commentary: "Commentary",
  forecast: "Forecast",
  recommendation: "Recommendation",
};

const SENTIMENT_CLS: Record<string, string> = {
  bullish: "bg-up/15 text-up",
  bearish: "bg-down/15 text-down",
  neutral: "bg-panel-2 text-mut",
};

export default async function InsightDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await fetch(`${serverApiUrl()}/insights/${id}`, { cache: "no-store" }).catch(() => null);
  if (!res || res.status === 404) notFound();
  if (!res.ok) throw new Error(`insight fetch failed: ${res.status}`);
  const insight: ApiInsight = await res.json();

  return (
    <div className="min-h-dvh">
      <Navbar />
      <CategoryTabs />
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-6 md:pb-10">
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded bg-panel-2 px-2 py-0.5 font-bold text-mut">
            {KIND_LABEL[insight.kind]}
          </span>
          <span className="font-semibold text-mut-2">{insight.category}</span>
          {insight.sentiment && (
            <span className={`rounded px-2 py-0.5 font-bold ${SENTIMENT_CLS[insight.sentiment]}`}>
              {insight.sentiment}
            </span>
          )}
        </div>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight">{insight.title}</h1>
        <p className="mt-1 text-xs text-mut-2">{fmtDate(insight.created_at)}</p>
        <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-white/90">{insight.body}</p>

        {(insight.related_commodity || insight.related_indicator) && (
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {insight.related_commodity && (
              <a
                href={`/commodities/${encodeURIComponent(insight.related_commodity)}`}
                className="rounded-full border border-line px-3 py-1 font-bold text-accent-2 hover:bg-panel"
              >
                {insight.related_commodity}
              </a>
            )}
            {insight.related_indicator && (
              <span className="rounded-full border border-line px-3 py-1 font-bold text-mut">
                {insight.related_indicator}
              </span>
            )}
          </div>
        )}

        <div className="mt-8">
          <ContentComments insightId={insight.id} />
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
