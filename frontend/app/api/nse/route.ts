import { NextResponse } from "next/server";

/**
 * Live NSE Kenya quotes, scraped server-side from afx.kwayisi.org
 * (publicly listed delayed NSE prices). Cached 5 minutes so we hit the
 * source at most ~12 times/hour regardless of traffic.
 */
const SOURCE = "https://afx.kwayisi.org/nse/";

// <tr><td><a title="Name">SYM</a><td><a>Name</a><td>volume<td>price<td class=hi|lo>change
const ROW =
  /<tr><td><a href=[^>]*title="([^"]+)">([A-Z0-9]+)<\/a><td><a [^>]*>[^<]*<\/a><td>([\d,]*)<td>([\d.,]+)<td(?:\s+class=(?:hi|lo))?>([+-]?[\d.]+)/g;

export type NseApiQuote = {
  symbol: string;
  name: string;
  volume: number;
  price: number;
  change: number;
  changePct: number;
};

/**
 * Some hosts (e.g. Vercel) can't reach the source from their network; the
 * FastAPI backend runs the same scraper at /nse, so proxy through it then.
 */
async function fromBackend(): Promise<NextResponse | null> {
  const backend = process.env.BACKEND_ORIGIN;
  if (!backend) return null;
  try {
    const r = await fetch(`${backend}/nse`, { next: { revalidate: 300 } });
    if (!r.ok) return null;
    return NextResponse.json(await r.json(), {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const res = await fetch(SOURCE, {
      headers: { "User-Agent": "Mozilla/5.0 (UtabiriBot; market data panel)" },
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      return (
        (await fromBackend()) ??
        NextResponse.json({ error: `upstream ${res.status}` }, { status: 502 })
      );
    }
    const html = await res.text();

    const quotes: NseApiQuote[] = [];
    for (const m of html.matchAll(ROW)) {
      const [, name, symbol, vol, priceRaw, changeRaw] = m;
      const price = Number(priceRaw.replace(/,/g, ""));
      const change = Number(changeRaw);
      const prev = price - change;
      quotes.push({
        symbol,
        name: name.replace(/&amp;/g, "&"),
        volume: Number(vol.replace(/,/g, "")) || 0,
        price,
        change,
        changePct: prev ? (change / prev) * 100 : 0,
      });
    }

    if (quotes.length === 0) {
      return (
        (await fromBackend()) ??
        NextResponse.json(
          { error: "parse failure — source layout changed?" },
          { status: 502 },
        )
      );
    }

    return NextResponse.json(
      { quotes, source: SOURCE, fetchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, max-age=300" } },
    );
  } catch (e) {
    return (
      (await fromBackend()) ??
      NextResponse.json({ error: String(e) }, { status: 502 })
    );
  }
}
