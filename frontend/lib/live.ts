import type { ApiMarket } from "@/lib/api";
import { IMG, type Market, type MarketIconKey } from "@/lib/data";

/** Base URL for calling the API from server components / route handlers.
 *  The browser uses NEXT_PUBLIC_API_URL (possibly a relative /backend
 *  rewrite), but server code needs an absolute origin. */
export function serverApiUrl(): string {
  const pub = process.env.NEXT_PUBLIC_API_URL ?? "";
  return (
    process.env.BACKEND_ORIGIN ??
    (pub.startsWith("http") ? pub : "http://localhost:8000")
  );
}

export function fmtVolCents(cents: number): string {
  const kes = cents / 100;
  if (kes >= 1_000_000) return `KES ${(kes / 1_000_000).toFixed(1)}M Vol.`;
  if (kes >= 1_000) return `KES ${Math.round(kes / 1_000)}K Vol.`;
  return `KES ${Math.round(kes)} Vol.`;
}

export function fmtEndDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

const FALLBACK_IMG: Record<string, string> = {
  Politics: IMG.nairobi,
  Football: IMG.stadium,
  "FKF PL": IMG.footballKick,
  Sports: IMG.stadium,
  Economy: IMG.forex,
  Crypto: IMG.bitcoin,
  Athletics: IMG.runner,
  Weather: IMG.rain,
};

const ICON: Record<string, MarketIconKey> = {
  Politics: "landmark",
  Football: "ball",
  "FKF PL": "ball",
  Sports: "ball",
  Economy: "percent",
  Crypto: "bitcoin",
  Athletics: "runner",
  Weather: "wheat",
};

export function marketImage(m: Pick<ApiMarket, "image" | "category">): string {
  return m.image || FALLBACK_IMG[m.category] || IMG.nairobi;
}

const TEAM_STYLES = [
  {
    color: "bg-emerald-700",
    tint: "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25",
  },
  {
    color: "bg-sky-700",
    tint: "bg-sky-500/15 text-sky-300 hover:bg-sky-500/25",
  },
] as const;

function abbr(label: string): string {
  return label.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase();
}

/** Shape a live API market into the card model the UI components render. */
export function toCardMarket(m: ApiMarket): Market {
  const pct = (i: number) => Math.round((m.outcomes[i]?.price_yes ?? 0.5) * 100);
  const base = {
    id: m.id,
    question: m.question,
    image: marketImage(m),
    icon: ICON[m.category] ?? "landmark",
    iconBg: "bg-sky-500/15",
    iconFg: "text-sky-400",
    kind: m.kind,
    volume: fmtVolCents(m.volume_cents),
    category: m.category,
    isNew: m.is_new,
  };
  if (m.kind === "binary") return { ...base, yes: pct(0) };
  if (m.kind === "matchup" && m.outcomes.length >= 2) {
    return {
      ...base,
      teams: [
        { name: m.outcomes[0].label, abbr: abbr(m.outcomes[0].label), pct: pct(0), ...TEAM_STYLES[0] },
        { name: m.outcomes[1].label, abbr: abbr(m.outcomes[1].label), pct: pct(1), ...TEAM_STYLES[1] },
      ],
    };
  }
  return {
    ...base,
    kind: "multi",
    outcomes: m.outcomes.map((o, i) => ({ label: o.label, yes: pct(i) })),
  };
}
