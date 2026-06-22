export function HealthScoreGauge({
  score,
  trend,
  previousScore,
}: {
  score: number;
  trend: "up" | "down" | "flat";
  previousScore: number | null;
}) {
  const color = score >= 65 ? "var(--color-up)" : score >= 40 ? "#f5a623" : "var(--color-down)";
  const r = 54;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const trendMark = trend === "up" ? "▲" : trend === "down" ? "▼" : "–";
  const trendCls = trend === "up" ? "text-up" : trend === "down" ? "text-down" : "text-mut";

  return (
    <div className="flex items-center gap-5">
      <svg width="140" height="140" viewBox="0 0 140 140" className="shrink-0">
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--color-line)" strokeWidth="12" />
        <circle
          cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 70 70)"
        />
        <text x="70" y="65" textAnchor="middle" fontSize="32" fontWeight="800" fill="white">{score}</text>
        <text x="70" y="86" textAnchor="middle" fontSize="11" fill="var(--color-mut-2)">/ 100</text>
      </svg>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-mut-2">
          Kenya Economic Health Score
        </p>
        <p className={`mt-1 flex items-center gap-1.5 text-sm font-bold ${trendCls}`}>
          {trendMark} {trend}
          {previousScore !== null && (
            <span className="text-mut-2">· was {previousScore} yesterday</span>
          )}
        </p>
      </div>
    </div>
  );
}
