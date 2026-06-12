/** Deterministic pseudo-random price history so SSR and client agree. */
export function seededSeries(
  seed: string,
  endPct: number,
  points = 130,
): number[] {
  let h = 2166136261;
  for (const c of seed) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h = Math.imul(h ^ (h >>> 13), 1597334677);
    return ((h >>> 0) % 1000) / 1000;
  };
  // walk backwards from today's price so the line always ends at endPct
  const out = [endPct];
  let v = endPct;
  for (let i = 1; i < points; i++) {
    v += (rand() - 0.5) * 5 + (rand() - 0.5) * 2;
    v = Math.min(96, Math.max(3, v));
    out.push(v);
  }
  return out.reverse();
}

export const SERIES_COLORS = [
  "#4f8bff",
  "#9ec9ff",
  "#f5a623",
  "#ff7a45",
  "#2dd178",
  "#c084fc",
];
