/** Small shared SVG chart primitives (no deps). */

function toPath(points: number[], w: number, h: number, pad = 2): string {
  const min = Math.min(...points);
  const max = Math.max(...points);
  return points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - pad - ((p - min) / (max - min || 1)) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function Sparkline({
  points,
  up,
  height = 40,
}: {
  points: number[];
  up: boolean;
  height?: number;
}) {
  if (points.length < 2) return <div style={{ height }} />;
  const color = up ? "var(--color-up)" : "var(--color-down)";
  const d = toPath(points, 110, 36);
  return (
    <svg viewBox="0 0 110 36" className="w-full" style={{ height }}>
      <path d={`${d} L110 36 L0 36 Z`} fill={color} opacity="0.12" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" />
    </svg>
  );
}

export function AreaChart({
  points,
  labels,
  color = "var(--color-up)",
}: {
  points: number[];
  labels?: string[];
  color?: string;
}) {
  if (points.length < 2) return <div className="h-48" />;
  const W = 800;
  const H = 220;
  const d = toPath(points, W, H - 20, 8);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
      <defs>
        <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={`${d} L${W} ${H - 20} L0 ${H - 20} Z`} fill="url(#area-fill)" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {labels?.map((l, i) => (
        <text
          key={`${l}-${i}`}
          x={((i + 0.5) / labels.length) * W}
          y={H - 4}
          fontSize="12"
          fill="var(--color-mut-2)"
          textAnchor="middle"
        >
          {l}
        </text>
      ))}
    </svg>
  );
}
