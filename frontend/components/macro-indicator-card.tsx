import type { ApiMacroIndicator } from "@/lib/api";
import { Sparkline } from "@/components/charts";

export function MacroIndicatorCard({ indicator }: { indicator: ApiMacroIndicator }) {
  const points = indicator.history.map((h) => h.value);
  const trendUp =
    points.length >= 2 ? points[points.length - 1] >= points[points.length - 2] : true;

  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">{indicator.name}</h3>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-mut-2">
          {indicator.source}
        </span>
      </div>
      <p className="mt-1 text-2xl font-extrabold tracking-tight">
        {indicator.value.toLocaleString("en-KE", { maximumFractionDigits: 2 })}
        <span className="ml-1 text-sm font-semibold text-mut">{indicator.unit}</span>
      </p>
      <p className="text-xs text-mut-2">{indicator.period}</p>
      {points.length >= 2 && <Sparkline points={points} up={trendUp} height={36} />}
    </div>
  );
}
