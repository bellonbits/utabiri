type GaugeProps = {
  pct: number; // 0-100
  delta?: string;
  label: "Yes" | "No";
};

const R = 30;
const CIRC = Math.PI * R; // semicircle length

/** Corner gauge — "62% chance" style, green when likely, red when not. */
export function ChanceGauge({ pct }: { pct: number }) {
  const color = pct >= 50 ? "var(--color-up)" : "var(--color-down)";
  const dash = (Math.max(0, Math.min(100, pct)) / 100) * CIRC;
  return (
    <div className="relative ml-3 h-16 w-28 shrink-0">
      <svg viewBox="0 0 80 44" className="h-full w-full">
        <path
          d="M 10 40 A 30 30 0 0 1 70 40"
          fill="none"
          stroke="var(--color-line)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M 10 40 A 30 30 0 0 1 70 40"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${CIRC}`}
        />
      </svg>
      <div className="absolute inset-x-0 -bottom-0.5 text-center leading-tight">
        <div className="text-2xl font-extrabold tracking-tight">{pct}%</div>
        <div className="text-[11px] font-medium text-mut">chance</div>
      </div>
    </div>
  );
}

export function Gauge({ pct, delta, label }: GaugeProps) {
  const up = label === "Yes";
  const color = up ? "var(--color-up)" : "var(--color-down)";
  const dash = (Math.max(0, Math.min(100, pct)) / 100) * CIRC;

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-12 w-20">
        <svg viewBox="0 0 80 44" className="h-full w-full">
          <path
            d="M 10 40 A 30 30 0 0 1 70 40"
            fill="none"
            stroke="var(--color-line)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M 10 40 A 30 30 0 0 1 70 40"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRC}`}
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center">
          <div className="text-lg font-extrabold leading-none">{pct}%</div>
          {delta && (
            <div className="text-[10px] font-semibold leading-tight text-up">
              {delta}
            </div>
          )}
        </div>
      </div>
      <span
        className="mt-1.5 text-sm font-bold"
        style={{ color }}
      >
        {label}
      </span>
    </div>
  );
}
