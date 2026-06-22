/**
 * All URLs verified reachable (HTTP 200) on 2026-06-11.
 * Thematic photos: Unsplash CDN (hotlinking permitted by Unsplash license).
 */
const u = (id: string) => `https://images.unsplash.com/photo-${id}?w=600&q=70`;
export const IMG = {
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
