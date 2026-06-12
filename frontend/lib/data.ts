export type Outcome = {
  label: string;
  yes: number; // probability 0-100
};

export type MarketIconKey =
  | "landmark"
  | "ball"
  | "phone"
  | "percent"
  | "bitcoin"
  | "trophy"
  | "runner"
  | "wheat"
  | "trend-down";

export type MatchupTeam = {
  name: string;
  abbr: string;
  pct: number;
  color: string; // tailwind bg class for the abbr chip
  tint: string; // tailwind classes for the big pick button
};

/**
 * All URLs verified reachable (HTTP 200) on 2026-06-11.
 * Politician portraits: Wikimedia Commons, CC-licensed
 * (President Ruto Portrait 2022; Rigathi Gachagua October 2023).
 * Thematic photos: Unsplash CDN (hotlinking permitted by Unsplash license).
 */
const u = (id: string) => `https://images.unsplash.com/photo-${id}?w=600&q=70`;
export const IMG = {
  ruto: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/President_Ruto_Potrait_2022_%28cropped%29.jpg/500px-President_Ruto_Potrait_2022_%28cropped%29.jpg",
  gachagua:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Rigathi_Gachagua_October_2023_%28cropped%29.jpg/500px-Rigathi_Gachagua_October_2023_%28cropped%29.jpg",
  footballKick: u("1579952363873-27f3bade9f55"),
  stadium: u("1574629810360-7efbbe195018"),
  bitcoin: u("1518546305927-5a555bb7020d"),
  runner: u("1552674605-db6ffd4facb5"),
  maize: u("1471193945509-9ad0617afabf"),
  stockChart: u("1611974789855-9c2a0a7236a3"),
  forex: u("1590283603385-17ffb3a7f29f"),
  bankColumns: u("1554469384-e58fac16e23a"),
  rain: u("1519692933481-e162a57d6721"),
  nairobi: u("1577948000111-9c970dfe3743"),
} as const;

export type Market = {
  id: string;
  question: string;
  image: string;
  icon: MarketIconKey;
  iconBg: string; // tailwind bg class
  iconFg: string; // tailwind text class
  kind: "binary" | "multi" | "matchup";
  yes?: number; // binary only
  outcomes?: Outcome[]; // multi only
  teams?: [MatchupTeam, MatchupTeam]; // matchup only
  status?: string; // e.g. "LIVE", "NS", "HT" — shown red in footer
  category?: string; // e.g. "FKF PL", "Crypto" — shown after volume
  volume: string;
  isNew?: boolean;
};


export const filterChips = [
  "All",
  "AFCON",
  "Breaking News",
  "Finance Bill",
  "CBK",
  "Mentions",
  "Creators",
  "Politics",
];

/** Deterministic gradient avatar colors for user initials (no emojis). */
export const avatarGradients = [
  "from-rose-500 to-orange-400",
  "from-violet-500 to-fuchsia-400",
  "from-sky-500 to-cyan-400",
  "from-emerald-500 to-lime-400",
  "from-amber-500 to-yellow-400",
];

export function gradientFor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 997;
  return avatarGradients[h % avatarGradients.length];
}
