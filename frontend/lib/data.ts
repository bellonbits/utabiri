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

export const markets: Market[] = [
  {
    id: "afcon-winner",
    image: IMG.stadium,
    question: "AFCON 2027 Winner",
    icon: "trophy",
    iconBg: "bg-amber-500/15",
    iconFg: "text-amber-400",
    kind: "multi",
    outcomes: [
      { label: "Senegal", yes: 21 },
      { label: "Morocco", yes: 18 },
      { label: "Kenya", yes: 6 },
    ],
    volume: "KES 12M Vol.",
    category: "Football",
  },
  {
    id: "finance-bill",
    image: IMG.ruto,
    question: "Finance Bill signed into law by July 31?",
    icon: "landmark",
    iconBg: "bg-sky-500/15",
    iconFg: "text-sky-400",
    kind: "binary",
    yes: 60,
    volume: "KES 2M Vol.",
    category: "Politics",
  },
  {
    id: "mashemeji-derby",
    image: IMG.footballKick,
    question: "Mashemeji Derby",
    icon: "ball",
    iconBg: "bg-emerald-500/15",
    iconFg: "text-emerald-400",
    kind: "matchup",
    teams: [
      {
        name: "Gor Mahia",
        abbr: "GOR",
        pct: 55,
        color: "bg-green-700",
        tint: "bg-green-500/15 text-green-300 hover:bg-green-500/25",
      },
      {
        name: "AFC Leopards",
        abbr: "AFC",
        pct: 46,
        color: "bg-blue-700",
        tint: "bg-blue-500/15 text-blue-300 hover:bg-blue-500/25",
      },
    ],
    status: "LIVE",
    volume: "KES 9M Vol.",
    category: "FKF PL",
  },
  {
    id: "harambee-stars",
    image: IMG.footballKick,
    question: "Harambee Stars qualify for AFCON 2027 by...?",
    icon: "ball",
    iconBg: "bg-emerald-500/15",
    iconFg: "text-emerald-400",
    kind: "multi",
    outcomes: [
      { label: "Matchday 5", yes: 38 },
      { label: "Matchday 6", yes: 62 },
    ],
    volume: "KES 344K Vol.",
    category: "Football",
    isNew: true,
  },
  {
    id: "cbk-rate",
    image: IMG.bankColumns,
    question: "CBK rate decision in August?",
    icon: "percent",
    iconBg: "bg-sky-500/15",
    iconFg: "text-sky-400",
    kind: "multi",
    outcomes: [
      { label: "Cut 50+ bps", yes: 8 },
      { label: "Cut 25 bps", yes: 47 },
      { label: "Hold", yes: 41 },
    ],
    volume: "KES 1.1M Vol.",
    category: "Economy",
  },
  {
    id: "btc-price",
    image: IMG.bitcoin,
    question: "What price will Bitcoin hit in June?",
    icon: "bitcoin",
    iconBg: "bg-orange-500/15",
    iconFg: "text-orange-400",
    kind: "multi",
    outcomes: [
      { label: "$120,000", yes: 88 },
      { label: "$150,000", yes: 76 },
      { label: "$200,000", yes: 24 },
    ],
    volume: "KES 5.4M Vol.",
    category: "Crypto",
  },
  {
    id: "digital-tax",
    image: IMG.gachagua,
    question: "Digital content tax passed before May 2027?",
    icon: "phone",
    iconBg: "bg-fuchsia-500/15",
    iconFg: "text-fuchsia-400",
    kind: "binary",
    yes: 59,
    volume: "KES 2M Vol.",
    category: "Politics",
  },
  {
    id: "kipchoge",
    image: IMG.runner,
    question: "Kipchoge podium at Berlin Marathon?",
    icon: "runner",
    iconBg: "bg-indigo-500/15",
    iconFg: "text-indigo-400",
    kind: "binary",
    yes: 71,
    volume: "KES 640K Vol.",
    category: "Athletics",
  },
  {
    id: "maize",
    image: IMG.maize,
    question: "Maize flour below KES 130 by October?",
    icon: "wheat",
    iconBg: "bg-yellow-500/15",
    iconFg: "text-yellow-400",
    kind: "binary",
    yes: 33,
    volume: "KES 420K Vol.",
    category: "Economy",
    isNew: true,
  },
  {
    id: "eurobond",
    image: IMG.stockChart,
    question: "Kenya Eurobond yield below 9% by...?",
    icon: "trend-down",
    iconBg: "bg-rose-500/15",
    iconFg: "text-rose-400",
    kind: "multi",
    outcomes: [
      { label: "August 31", yes: 35 },
      { label: "September 30", yes: 52 },
      { label: "December 31", yes: 74 },
    ],
    volume: "KES 760K Vol.",
    category: "Economy",
  },
  {
    id: "gor-title",
    image: IMG.stadium,
    question: "Gor Mahia wins the FKF Premier League?",
    icon: "trophy",
    iconBg: "bg-green-500/15",
    iconFg: "text-green-400",
    kind: "binary",
    yes: 40,
    volume: "KES 880K Vol.",
    category: "FKF PL",
  },
  {
    id: "el-nino",
    image: IMG.rain,
    question: "El Niño rains declared before November?",
    icon: "trend-down",
    iconBg: "bg-cyan-500/15",
    iconFg: "text-cyan-400",
    kind: "binary",
    yes: 52,
    volume: "KES 310K Vol.",
    category: "Weather",
  },
];

export const trendingTopics = [
  "AFCON",
  "Breaking News",
  "Finance Bill",
  "CBK",
  "Elections 2027",
  "Bitcoin",
  "Safaricom",
  "FKF Premier League",
  "Eurobond",
  "Nairobi",
  "Maize Prices",
  "Weather",
];

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

export type Activity = {
  user: string;
  action: "bought" | "sold";
  side: "Yes" | "No";
  price: string;
  amount: string;
  market: string;
};

export const recentActivity: Activity[] = [
  {
    user: "wanjiku254",
    action: "bought",
    side: "Yes",
    price: "48¢",
    amount: "KES 1,000",
    market: "Gor Mahia vs AFC Leopards",
  },
  {
    user: "halo_otis",
    action: "bought",
    side: "Yes",
    price: "86¢",
    amount: "KES 3,690",
    market: "Harambee Stars qualify for AFCON 2027?",
  },
  {
    user: "raymond26",
    action: "sold",
    side: "No",
    price: "72¢",
    amount: "KES 1,400",
    market: "Finance Bill signed by July 31?",
  },
  {
    user: "chilliwack",
    action: "bought",
    side: "No",
    price: "28¢",
    amount: "KES 200",
    market: "Bitcoin above $150,000 by July?",
  },
  {
    user: "akinyi_o",
    action: "bought",
    side: "Yes",
    price: "48¢",
    amount: "KES 1,000",
    market: "CBK cuts 25 bps in August?",
  },
];

export const topVolume = [
  { name: "Ann Gathoni", amount: "KES 3,509,712" },
  { name: "Lydia Baraka", amount: "KES 3,377,801" },
  { name: "Zaire Otieno", amount: "KES 3,044,274" },
  { name: "Carla Wairimu", amount: "KES 3,038,098" },
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
