import Link from "next/link";
import type { ApiInsight } from "@/lib/api";
import { fmtDate } from "@/lib/live";

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

export function InsightCard({ insight }: { insight: ApiInsight }) {
  return (
    <Link
      href={`/insights/${insight.id}`}
      className="flex flex-col gap-2 rounded-xl border border-line bg-panel p-4 transition hover:border-accent/50 hover:bg-panel-2"
    >
      <div className="flex items-center gap-2 text-xs">
        <span className="rounded bg-panel-2 px-2 py-0.5 font-bold text-mut">
          {KIND_LABEL[insight.kind]}
        </span>
        <span className="font-semibold text-mut-2">{insight.category}</span>
        {insight.sentiment && (
          <span className={`ml-auto rounded px-2 py-0.5 font-bold ${SENTIMENT_CLS[insight.sentiment]}`}>
            {insight.sentiment}
          </span>
        )}
      </div>
      <h3 className="text-base font-bold leading-snug">{insight.title}</h3>
      <p className="line-clamp-3 text-sm text-mut">{insight.body}</p>
      <p className="mt-auto text-xs text-mut-2">{fmtDate(insight.created_at)}</p>
    </Link>
  );
}
