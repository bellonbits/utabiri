import { NextResponse } from "next/server";

/**
 * Kenyan news aggregator — trusted outlets only, refreshed every 5 minutes.
 * Stores: title, summary (short snippet), url, published_at, source, category.
 * Native RSS where available; Google News per-site RSS where outlets don't
 * publish a working feed (Nation, The Star, Business Daily, Citizen,
 * Kenyan Wallstreet). Headlines link out to the original articles.
 */
type Feed = {
  source: string;
  url: string;
  viaGoogle?: boolean;
  category?: Category; // fixed category (e.g. Standard's sectional feeds)
};

type Category = "Politics" | "Business" | "Sports" | "General";

const FEEDS: Feed[] = [
  // ---- Tier 1, native RSS
  { source: "The Standard", url: "https://www.standardmedia.co.ke/rss/headlines.php" },
  { source: "The Standard", url: "https://www.standardmedia.co.ke/rss/politics.php", category: "Politics" },
  { source: "The Standard", url: "https://www.standardmedia.co.ke/rss/business.php", category: "Business" },
  { source: "The Standard", url: "https://www.standardmedia.co.ke/rss/sports.php", category: "Sports" },
  { source: "Kenya News Agency", url: "https://www.kenyanews.go.ke/feed/" },
  // ---- Tier 1, via Google News (no working native feed)
  { source: "Nation Africa", url: gnews("nation.africa"), viaGoogle: true },
  { source: "Business Daily", url: gnews("businessdailyafrica.com"), viaGoogle: true, category: "Business" },
  { source: "The Star", url: gnews("the-star.co.ke"), viaGoogle: true },
  // ---- Tier 2
  { source: "Kenyans.co.ke", url: "https://www.kenyans.co.ke/feeds/news" },
  { source: "Capital FM", url: "https://www.capitalfm.co.ke/news/feed/" },
  { source: "KBC", url: "https://www.kbc.co.ke/feed/" },
  { source: "Citizen Digital", url: gnews("citizen.digital"), viaGoogle: true },
  { source: "Kenyan Wallstreet", url: gnews("kenyanwallstreet.com"), viaGoogle: true, category: "Business" },
];

function gnews(site: string): string {
  return `https://news.google.com/rss/search?q=site:${site}&hl=en-KE&gl=KE&ceid=KE:en`;
}

export type NewsItem = {
  source: string;
  title: string;
  summary: string;
  link: string;
  published: string; // ISO
  category: Category;
  image: string; // article image from the feed, or "" if none
};

const SPORTS_RE =
  /\b(harambee stars|afcon|gor mahia|fkf|football|soccer|caf|fifa|marathon|athletics|premier league|world cup|olympic|rugby|kipchoge|safari rally)\b/i;
const BUSINESS_RE =
  /\b(cbk|shilling|nse|inflation|econom|bank|tax|treasury|eurobond|markets?|finance|imf|world bank|kra|fuel|invest|earnings|ipo|safaricom|kcb|equity)\b/i;
const POLITICS_RE =
  /\b(ruto|gachagua|raila|parliament|senate|governor|iebc|election|bill\b|cabinet|president|mps?\b|azimio|uda|county|state house|impeach)\b/i;

function classify(text: string): Category {
  if (SPORTS_RE.test(text)) return "Sports";
  if (BUSINESS_RE.test(text)) return "Business";
  if (POLITICS_RE.test(text)) return "Politics";
  return "General";
}

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractImage(block: string): string {
  const candidates = [
    block.match(/<media:content[^>]+url="([^"]+)"/)?.[1],
    block.match(/<media:thumbnail[^>]+url="([^"]+)"/)?.[1],
    block.match(/<enclosure[^>]+url="([^"]+\.(?:jpe?g|png|webp)[^"]*)"/i)?.[1],
    block.match(/<img[^>]+src="(https?:\/\/[^"]+)"/)?.[1],
  ];
  const url = candidates.find((u) => u && u.startsWith("http")) ?? "";
  return url.replace(/&amp;/g, "&");
}

function parseItems(xml: string, feed: Feed): NewsItem[] {
  const out: NewsItem[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = m[1];
    const rawTitle = decode(block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
    const link = decode(block.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "");
    const desc = decode(block.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "");
    const pub = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "";
    if (!rawTitle || !link) continue;
    const title = feed.viaGoogle ? rawTitle.replace(/\s+-\s+[^-]+$/, "") : rawTitle;
    const summary = desc.length > 180 ? `${desc.slice(0, 177)}…` : desc;
    out.push({
      source: feed.source,
      title,
      summary: summary === title ? "" : summary,
      link,
      published: pub ? new Date(pub).toISOString() : new Date().toISOString(),
      category: feed.category ?? classify(`${title} ${summary}`),
      image: extractImage(block),
    });
  }
  return out;
}

export async function GET() {
  const results = await Promise.allSettled(
    FEEDS.map(async (f) => {
      const r = await fetch(f.url, {
        headers: { "User-Agent": "Mozilla/5.0 (UtabiriNews)" },
        next: { revalidate: 300 }, // 5 minutes
      });
      if (!r.ok) return [] as NewsItem[];
      return parseItems(await r.text(), f).slice(0, 8);
    }),
  );

  const seen = new Set<string>();
  const items = results
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .filter((n) => {
      const key = n.title.toLowerCase().slice(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.published.localeCompare(a.published))
    .slice(0, 60);

  return NextResponse.json(
    { items, fetchedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
