"""Scraper for KAMIS (kamis.kilimo.go.ke) — Kenya's Ministry of Agriculture
market price bulletin. The site is server-rendered HTML with no JSON API,
and its certificate chain is self-signed, so `verify=False` is scoped to
this one client only (not a general security relaxation).

Quirk worth noting: `product=` empty does NOT mean "all commodities" — the
server silently defaults to product id 1 (Dry Maize). To get full coverage
we read the <select name="product"> options once per ingest run and fetch
each commodity id separately.
"""
import asyncio
import re
from datetime import date, datetime

import httpx
from bs4 import BeautifulSoup
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import CommodityPrice

BASE_URL = "https://kamis.kilimo.go.ke/site/market"
REQUEST_DELAY_SECONDS = 0.4


def _client() -> httpx.AsyncClient:
    return httpx.AsyncClient(verify=False, timeout=30.0)


async def fetch_product_options() -> dict[str, str]:
    """Returns {product_id: commodity_name} parsed from the filter dropdown."""
    async with _client() as client:
        r = await client.get(BASE_URL, params={"product": "", "per_page": "10"})
        r.raise_for_status()
    soup = BeautifulSoup(r.text, "lxml")
    select = soup.find("select", {"name": "product"})
    if select is None:
        return {}
    options: dict[str, str] = {}
    for opt in select.find_all("option"):
        value = (opt.get("value") or "").strip()
        if value:
            options[value] = opt.get_text(strip=True)
    return options


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


def _parse_rows(html: str, commodity_fallback: str) -> list[dict]:
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
    return _parse_rows(r.text, commodity_name)


async def upsert_rows(db: AsyncSession, rows: list[dict]) -> int:
    """Upserts pre-fetched/parsed rows (commodity, market, price_date unique
    on conflict). Used both by the local scraper below and by the Vercel-side
    sync route, which scrapes from an IP KAMIS doesn't block and POSTs the
    parsed rows here instead."""
    if not rows:
        return 0
    stmt = sqlite_insert(CommodityPrice).values(rows).on_conflict_do_nothing(
        index_elements=["commodity", "market", "price_date"]
    )
    result = await db.execute(stmt)
    await db.commit()
    return result.rowcount or 0


async def ingest_latest(db: AsyncSession, per_page: int = 50) -> dict:
    """Fetches the latest price rows for every commodity and upserts them.
    Returns {"products": n, "rows_seen": n, "rows_inserted": n}.
    """
    products = await fetch_product_options()
    rows_seen = 0
    rows_inserted = 0
    for product_id, commodity_name in products.items():
        try:
            rows = await fetch_commodity_rows(product_id, commodity_name, per_page=per_page)
        except httpx.HTTPError:
            continue
        rows_seen += len(rows)
        if rows:
            # commit per-product so this long-running scrape doesn't hold a single
            # SQLite write lock for the whole ~80s run and starve other requests
            rows_inserted += await upsert_rows(db, rows)
        await asyncio.sleep(REQUEST_DELAY_SECONDS)
    return {
        "products": len(products),
        "rows_seen": rows_seen,
        "rows_inserted": rows_inserted,
        "finished_at": datetime.utcnow().isoformat(),
    }
