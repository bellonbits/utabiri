import { NextRequest, NextResponse } from "next/server";
import { Agent, fetch as undiciFetch } from "undici";
import { serverApiUrl } from "@/lib/live";

// kamis.kilimo.go.ke serves a self-signed certificate (the Python scraper
// hits the same issue and uses httpx's verify=False) — scoped to requests
// against this one host only, not a global TLS relaxation.
//
// Must use undici's own fetch with its own Agent — Node's global fetch is
// backed by a different (internal) undici instance, and passing a dispatcher
// from the standalone npm package to the global fetch throws
// "invalid onRequestStart method" because the two versions' internals don't
// line up.
const insecureAgent = new Agent({ connect: { rejectUnauthorized: false } });

/**
 * Scrapes a curated set of KAMIS commodities and pushes parsed rows to the
 * backend's /sync/kamis endpoint.
 *
 * Why this lives on Vercel instead of the backend: kamis.kilimo.go.ke blocks
 * the backend VPS's datacenter IP at the TCP level (connections time out
 * while general HTTPS egress from that VPS works fine) — likely an
 * anti-bot measure against cloud-provider ASNs. Vercel's serverless IPs
 * aren't blocked, so the scrape happens here and the parsed rows are pushed
 * server-to-server to the backend, authenticated with a shared secret.
 *
 * Triggered by a Vercel Cron Job (see vercel.json) and protected by
 * CRON_SECRET, which Vercel automatically sends as a Bearer token to
 * cron-invoked routes when that env var is set.
 */
export const maxDuration = 60;

const BASE_URL = "https://kamis.kilimo.go.ke/site/market";

// A curated subset, not the full ~190-commodity catalogue — keeps each run
// well within the serverless time budget. Matched case-insensitively as a
// substring against the live product list, so naming drift on KAMIS's side
// (e.g. "Beans Red Haricot" vs "Red Haricot Beans") still matches.
const PRIORITY_KEYWORDS = [
  "maize", "beans", "rice", "wheat", "irish potato", "tomato", "onion",
  "cabbage", "kale", "sukuma", "milk", "egg", "sugar", "cooking oil",
  "banana", "mango", "avocado", "coffee", "tea", "green grams", "sorghum",
];

type Row = {
  commodity: string;
  classification: string | null;
  grade: string | null;
  market: string;
  county: string;
  wholesale_price: number | null;
  retail_price: number | null;
  unit: string | null;
  supply_volume: number | null;
  price_date: string;
};

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, "")).trim();
}

async function fetchProductOptions(): Promise<Map<string, string>> {
  const res = await undiciFetch(`${BASE_URL}?product=&per_page=10`, {
    headers: { "User-Agent": "Mozilla/5.0 (UtabiriKamisSync)" },
    dispatcher: insecureAgent,
  });
  const html = await res.text();
  const selectMatch = html.match(/<select name="product"[^>]*>([\s\S]*?)<\/select>/);
  const options = new Map<string, string>();
  if (!selectMatch) return options;
  for (const m of selectMatch[1].matchAll(/<option\s+value="(\d*)">([^<]+)<\/option>/g)) {
    const [, value, label] = m;
    if (value) options.set(value, stripTags(label));
  }
  return options;
}

function parsePrice(cell: string): number | null {
  const text = stripTags(cell).trim();
  if (!text || text === "-") return null;
  const match = text.match(/[\d,]+\.?\d*/);
  if (!match) return null;
  return parseFloat(match[0].replace(/,/g, ""));
}

function parseUnit(cell: string): string | null {
  const text = stripTags(cell).trim();
  return text.includes("/") ? text.split("/", 2)[1].trim() : null;
}

function parseRows(html: string, fallbackCommodity: string): Row[] {
  const tableMatch = html.match(/<table[^>]*class="[^"]*table-bordered[^"]*"[\s\S]*?<\/table>/);
  if (!tableMatch) return [];
  const bodyMatch = tableMatch[0].match(/<tbody>([\s\S]*?)<\/tbody>/);
  if (!bodyMatch) return [];

  const rows: Row[] = [];
  for (const trMatch of bodyMatch[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const cells = [...trMatch[1].matchAll(/<td>([\s\S]*?)<\/td>/g)].map((c) => c[1]);
    if (cells.length < 10) continue;
    const [commodity, classification, grade, , market, wholesale, retail, supply, county, priceDate] = cells;
    const date = stripTags(priceDate).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const cls = stripTags(classification).trim();
    const grd = stripTags(grade).trim();
    rows.push({
      commodity: stripTags(commodity).trim() || fallbackCommodity,
      classification: cls && cls !== "-" ? cls : null,
      grade: grd && grd !== "-" ? grd : null,
      market: stripTags(market).trim(),
      county: stripTags(county).trim(),
      wholesale_price: parsePrice(wholesale),
      retail_price: parsePrice(retail),
      unit: parseUnit(retail) ?? parseUnit(wholesale),
      supply_volume: parsePrice(supply),
      price_date: date,
    });
  }
  return rows;
}

async function fetchCommodityRows(productId: string, name: string): Promise<Row[]> {
  const res = await undiciFetch(`${BASE_URL}?product=${productId}&per_page=15`, {
    headers: { "User-Agent": "Mozilla/5.0 (UtabiriKamisSync)" },
    dispatcher: insecureAgent,
  });
  if (!res.ok) return [];
  return parseRows(await res.text(), name);
}

function matchesPriority(name: string): boolean {
  const lower = name.toLowerCase();
  return PRIORITY_KEYWORDS.some((kw) => lower.includes(kw));
}

const CONCURRENCY = 10;

/** Runs async tasks with bounded concurrency — 46 matched commodities run
 * sequentially took ~150s (way past Vercel's function timeout); in batches
 * of 10 the same set finishes in a small number of round-trips instead. */
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    results.push(...(await Promise.all(batch.map(fn))));
  }
  return results;
}

async function runSync() {
  const products = await fetchProductOptions();
  const matched = [...products.entries()].filter(([, name]) => matchesPriority(name));

  const batches = await mapWithConcurrency(matched, CONCURRENCY, async ([productId, name]) => {
    try {
      return await fetchCommodityRows(productId, name);
    } catch {
      // skip a commodity that fails to fetch/parse — don't fail the whole run
      return [];
    }
  });
  const allRows: Row[] = batches.flat();

  let rowsInserted = 0;
  if (allRows.length > 0) {
    const syncRes = await fetch(`${serverApiUrl()}/sync/kamis`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sync-Secret": process.env.KAMIS_SYNC_SECRET ?? "",
      },
      body: JSON.stringify({ rows: allRows }),
    });
    if (syncRes.ok) {
      const data = await syncRes.json();
      rowsInserted = data.rows_inserted ?? 0;
    } else {
      throw new Error(`backend sync rejected: ${syncRes.status} ${await syncRes.text()}`);
    }
  }

  return {
    products_checked: products.size,
    commodities_matched: matched.length,
    rows_scraped: allRows.length,
    rows_inserted: rowsInserted,
  };
}

export async function GET(req: NextRequest) {
  // Vercel sends this automatically on cron-triggered invocations when
  // CRON_SECRET is set — reject anything else to stop randos from making
  // this function hammer KAMIS on their behalf.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runSync();
    return NextResponse.json(summary);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "sync failed" }, { status: 502 });
  }
}
