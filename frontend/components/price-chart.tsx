export type ChartSeries = {
  label: string;
  pct: number;
  color: string;
  points: number[];
};

const W = 820;
const H = 300;
const PAD_R = 46;
const PAD_B = 26;
const PAD_T = 10;

function pathFor(points: number[], yMax: number): string {
  const n = points.length - 1;
  return points
    .map((p, i) => {
      const x = (i / n) * (W - PAD_R);
      const y = PAD_T + (1 - p / yMax) * (H - PAD_T - PAD_B);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

const MONTHS = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];

export function PriceChart({ series }: { series: ChartSeries[] }) {
  const maxPoint = Math.max(...series.flatMap((s) => s.points));
  const yMax = Math.min(100, Math.max(25, Math.ceil((maxPoint * 1.15) / 5) * 5));
  const ticks = [0.2, 0.4, 0.6, 0.8, 1].map((f) => f * yMax);

  return (
    <div>
      {/* legend */}
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-sm">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: s.color }}
            />
            <span className="text-mut">{s.label}</span>
            <span className="font-bold">{s.pct.toFixed(1)}%</span>
          </span>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
        {/* gridlines + y labels */}
        {ticks.map((t) => {
          const y = PAD_T + (1 - t / yMax) * (H - PAD_T - PAD_B);
          return (
            <g key={t}>
              <line
                x1="0"
                x2={W - PAD_R}
                y1={y}
                y2={y}
                stroke="var(--color-line)"
                strokeDasharray="3 5"
                strokeWidth="1"
              />
              <text
                x={W - PAD_R + 8}
                y={y + 4}
                fontSize="12"
                fill="var(--color-mut-2)"
              >
                {Math.round(t)}%
              </text>
            </g>
          );
        })}

        {/* month labels */}
        {MONTHS.map((m, i) => (
          <text
            key={m}
            x={((i + 0.5) / MONTHS.length) * (W - PAD_R)}
            y={H - 6}
            fontSize="12"
            fill="var(--color-mut-2)"
            textAnchor="middle"
          >
            {m}
          </text>
        ))}

        {/* series lines */}
        {series.map((s) => (
          <path
            key={s.label}
            d={pathFor(s.points, yMax)}
            fill="none"
            stroke={s.color}
            strokeWidth="2"
            strokeLinejoin="round"
          />
        ))}

        {/* live dots at the end of each line */}
        {series.map((s) => {
          const y =
            PAD_T +
            (1 - s.points[s.points.length - 1] / yMax) * (H - PAD_T - PAD_B);
          return (
            <g key={s.label}>
              <circle cx={W - PAD_R} cy={y} r="7" fill={s.color} opacity="0.25" />
              <circle cx={W - PAD_R} cy={y} r="3.5" fill={s.color} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
