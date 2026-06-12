"""Live NSE Kenya quotes via TradingView's public scanner API.

The original source (afx.kwayisi.org) drops connections from datacenter
IPs (Vercel, DigitalOcean), so we use TradingView's NSEKE feed instead.
Response shape mirrors frontend/app/api/nse/route.ts.
"""
import time
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter(tags=["nse"])

SOURCE = "https://scanner.tradingview.com/kenya/scan"
QUERY = {
    "columns": ["name", "description", "close", "change", "change_abs",
                "volume"],
    "sort": {"sortBy": "name", "sortOrder": "asc"},
}

CACHE_SECONDS = 300
_cache: dict = {"at": 0.0, "data": None}


@router.get("/nse")
async def nse_quotes():
    if _cache["data"] and time.monotonic() - _cache["at"] < CACHE_SECONDS:
        return _cache["data"]

    try:
        # bind to 0.0.0.0 to force IPv4; the container has no IPv6 route
        transport = httpx.AsyncHTTPTransport(local_address="0.0.0.0")
        async with httpx.AsyncClient(timeout=15.0, transport=transport) as c:
            r = await c.post(SOURCE, json=QUERY)
    except httpx.HTTPError as e:
        raise HTTPException(502, f"upstream fetch failed: {e!r}")
    if r.status_code != 200:
        raise HTTPException(502, f"upstream {r.status_code}")

    quotes = []
    for row in r.json().get("data", []):
        symbol, name, price, change_pct, change, volume = row["d"]
        if price is None:
            continue
        quotes.append({
            "symbol": symbol,
            "name": name,
            "volume": int(volume or 0),
            "price": price,
            "change": change or 0,
            "changePct": change_pct or 0,
        })
    if not quotes:
        raise HTTPException(502, "empty feed — query rejected?")

    data = {
        "quotes": quotes,
        "source": SOURCE,
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
    }
    _cache.update(at=time.monotonic(), data=data)
    return data
