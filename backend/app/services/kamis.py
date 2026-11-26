"""Real agricultural commodity price scraper & synchronizer for Kenya:
1. Primary: KAMIS (https://kamis.kilimo.go.ke/site/market) — Ministry of Agriculture
   Kenya market price bulletin.
2. Secondary / Cloud Fallback: UN World Food Programme (WFP) & OCHA Humanitarian
   Data Exchange (HDX) Kenya Food Prices (https://data.humdata.org).
   When cloud VPS datacenter IPs are blocked by government anti-bot firewalls,
   the WFP platform provides official recorded market price data across all Kenyan
   counties (Nairobi, Mombasa, Eldoret, Kisumu, Turkana, Kitui, Marsabit, etc.).

Zero mock data — 100% real platform data.
"""
from __future__ import annotations

import asyncio
import csv
import io
import re
from datetime import date, datetime

import httpx
from bs4 import BeautifulSoup
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import CommodityPrice

BASE_URL = "https://kamis.kilimo.go.ke/site/market"
WFP_HDX_URL = (
    "https://data.humdata.org/dataset/e0d3fba6-f9a2-45d7-b949-140c455197ff/"
    "resource/517ee1bf-2437-4f8c-aa1b-cb9925b9d437/download/wfp_food_prices_ken.csv"
)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def _client() -> httpx.AsyncClient:
    return httpx.AsyncClient(verify=False, timeout=8.0, headers=HEADERS, follow_redirects=True)


def _parse_price(cell: str) -> float | None:
    cell = cell.strip()
    if not cell or cell == "-":
        return None
    match = re.search(r"[\d,]+\.?\d*", cell)
    if not match:
        return None
    return float(match.group(0).replace(",", ""))


def _parse_unit(cell: str) -> str | None:
    cell = cell.strip()
    if "/" in cell:
        return cell.split("/", 1)[1].strip()
    return None


def _parse_kamis_rows(html: str, commodity_fallback: str) -> list[dict]:
    soup = BeautifulSoup(html, "lxml")
    table = soup.find("table", class_="table-bordered")
    if table is None:
        return []
    body = table.find("tbody")
    if body is None:
        return []
    rows: list[dict] = []
    for tr in body.find_all("tr"):
        cells = [td.get_text(strip=True) for td in tr.find_all("td")]
        if len(cells) < 10:
            continue
        commodity, classification, grade, _sex, market, wholesale, retail, supply, county, price_date = cells[:10]
        try:
            parsed_date = date.fromisoformat(price_date.strip())
        except ValueError:
            continue
        rows.append({
            "commodity": commodity.strip() or commodity_fallback,
            "classification": classification.strip() or None if classification.strip() != "-" else None,
            "grade": grade.strip() or None if grade.strip() != "-" else None,
            "market": market.strip(),
            "county": county.strip(),
            "wholesale_price": _parse_price(wholesale),
            "retail_price": _parse_price(retail),
            "unit": _parse_unit(retail) or _parse_unit(wholesale),
            "supply_volume": _parse_price(supply),
            "price_date": parsed_date,
        })
    return rows


async def fetch_commodity_rows(product_id: str, commodity_name: str, per_page: int = 50) -> list[dict]:
    async with _client() as client:
        r = await client.get(BASE_URL, params={"product": product_id, "per_page": str(per_page)})
        r.raise_for_status()
    return _parse_kamis_rows(r.text, commodity_name)


async def fetch_wfp_kenya_prices(byte_range: int = 150_000) -> list[dict]:
    """Fetches real market prices recorded by the UN World Food Programme for Kenya."""
    headers = {"Range": f"bytes=-{byte_range}", "User-Agent": "Mozilla/5.0"}
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True, headers=headers) as client:
        r = await client.get(WFP_HDX_URL)
        if r.status_code not in (200, 206):
            return []
    
    content = r.text
    first_nl = content.find("\n")
    if first_nl != -1:
        content = content[first_nl + 1 :]

    reader = csv.reader(io.StringIO(content))
    records: list[dict] = []
    for row in reader:
        if len(row) < 15:
            continue
        p_date, admin1, county, market, _, _, _, _cat, commodity, _, unit, _, p_type, _curr, price = row[:15]
        try:
            val = float(price)
            d = date.fromisoformat(p_date.strip())
            is_retail = "retail" in p_type.lower()
            records.append({
                "commodity": commodity.strip(),
                "classification": None,
                "grade": None,
                "market": market.strip(),
                "county": county.strip() or admin1.strip(),
                "wholesale_price": None if is_retail else val,
                "retail_price": val if is_retail else None,
                "unit": unit.strip(),
                "supply_volume": None,
                "price_date": d,
            })
        except Exception:
            continue
    return records


async def upsert_rows(db: AsyncSession, rows: list[dict]) -> int:
    """Upserts pre-fetched/parsed rows (commodity, market, price_date unique
    on conflict). Deduplicates in-memory before executing to guarantee safe inserts."""
    if not rows:
        return 0

    # Deduplicate within batch
    seen = set()
    unique_rows: list[dict] = []
    for r in rows:
        key = (r["commodity"], r["market"], str(r["price_date"]))
        if key not in seen:
            seen.add(key)
            unique_rows.append(r)

    # Insert in sub-batches of 200 for SQLite parameter safety
    total_inserted = 0
    batch_size = 200
    for i in range(0, len(unique_rows), batch_size):
        chunk = unique_rows[i : i + batch_size]
        stmt = sqlite_insert(CommodityPrice).values(chunk).on_conflict_do_nothing(
            index_elements=["commodity", "market", "price_date"]
        )
        res = await db.execute(stmt)
        total_inserted += res.rowcount or 0

    await db.commit()
    return total_inserted


async def ingest_latest(db: AsyncSession, per_page: int = 100) -> dict:
    """Fetches real live price rows from KAMIS or UN WFP and upserts them.
    Returns {"source": str, "rows_seen": n, "rows_inserted": n}.
    """
    rows_seen = 0
    rows_inserted = 0
    kamis_success = False

    # 1. Attempt KAMIS ingest
    try:
        async with _client() as client:
            r = await client.get(BASE_URL, params={"per_page": str(per_page)})
            if r.status_code == 200:
                init_rows = _parse_kamis_rows(r.text, "Dry Maize")
                if init_rows:
                    rows_seen += len(init_rows)
                    rows_inserted += await upsert_rows(db, init_rows)
                    kamis_success = True
                    print(f"[kamis] Ingested {len(init_rows)} live default market rows from KAMIS")
    except Exception as e:
        print(f"[kamis] Direct scrape warning: {e!r}")

    # 2. Concurrently fetch staple priority commodities from KAMIS if initial call succeeded
    if kamis_success:
        priority_products = [
            ("1", "Dry Maize"),
            ("4", "Rice"),
            ("29", "Beans Red Haricot"),
            ("61", "Tomatoes"),
            ("57", "Irish Potatoes"),
            ("58", "Cabbages"),
            ("10", "Green Grams"),
            ("3", "Wheat"),
            ("59", "Sweet Potatoes"),
            ("64", "Beans Rosecoco"),
        ]

        async def _fetch_safe(pid: str, name: str) -> list[dict]:
            try:
                return await fetch_commodity_rows(pid, name, per_page=50)
            except Exception:
                return []

        batches = await asyncio.gather(*[_fetch_safe(pid, name) for pid, name in priority_products])
        for batch in batches:
            if batch:
                rows_seen += len(batch)
                rows_inserted += await upsert_rows(db, batch)

    # 3. If KAMIS failed or returned no rows (e.g. cloud datacenter blocked), fetch from UN WFP
    if rows_seen == 0:
        print("[utabiri] KAMIS direct connection blocked or empty; fetching official UN WFP Kenya Food Prices...")
        try:
            wfp_rows = await fetch_wfp_kenya_prices(byte_range=150_000)
            if wfp_rows:
                rows_seen += len(wfp_rows)
                rows_inserted += await upsert_rows(db, wfp_rows)
                print(f"[utabiri] Successfully ingested {len(wfp_rows)} real market rows from UN WFP Kenya!")
                return {
                    "source": "UN WFP / HDX Kenya Food Prices",
                    "rows_seen": rows_seen,
                    "rows_inserted": rows_inserted,
                    "finished_at": datetime.utcnow().isoformat(),
                }
        except Exception as e:
            print(f"[utabiri] WFP fetch error: {e!r}")

    return {
        "source": "KAMIS Kenya Ministry of Agriculture",
        "rows_seen": rows_seen,
        "rows_inserted": rows_inserted,
        "finished_at": datetime.utcnow().isoformat(),
    }
