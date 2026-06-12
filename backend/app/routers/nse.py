"""Live NSE Kenya quotes, scraped from afx.kwayisi.org (delayed public prices).

Mirrors frontend/app/api/nse/route.ts; this server-side copy exists because
some frontend hosts (e.g. Vercel) cannot reach the source from their network.
"""
import re
import time
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter(tags=["nse"])

SOURCE = "https://afx.kwayisi.org/nse/"
ROW = re.compile(
    r'<tr><td><a href=[^>]*title="([^"]+)">([A-Z0-9]+)</a>'
    r"<td><a [^>]*>[^<]*</a><td>([\d,]*)<td>([\d.,]+)"
    r"<td(?:\s+class=(?:hi|lo))?>([+-]?[\d.]+)"
)

CACHE_SECONDS = 300
_cache: dict = {"at": 0.0, "data": None}


@router.get("/nse")
async def nse_quotes():
    if _cache["data"] and time.monotonic() - _cache["at"] < CACHE_SECONDS:
        return _cache["data"]

    try:
        # the source has AAAA records but containers often lack an IPv6
        # route; binding to 0.0.0.0 forces IPv4
        transport = httpx.AsyncHTTPTransport(local_address="0.0.0.0")
        async with httpx.AsyncClient(timeout=15.0, transport=transport) as c:
            r = await c.get(SOURCE, headers={
                "User-Agent": "Mozilla/5.0 (UtabiriBot; market data panel)",
            })
    except httpx.HTTPError as e:
        raise HTTPException(502, f"upstream fetch failed: {e!r}")
    if r.status_code != 200:
        raise HTTPException(502, f"upstream {r.status_code}")

    quotes = []
    for name, symbol, vol, price_raw, change_raw in ROW.findall(r.text):
        price = float(price_raw.replace(",", ""))
        change = float(change_raw)
        prev = price - change
        quotes.append({
            "symbol": symbol,
            "name": name.replace("&amp;", "&"),
            "volume": int(vol.replace(",", "") or 0),
            "price": price,
            "change": change,
            "changePct": (change / prev) * 100 if prev else 0,
        })
    if not quotes:
        raise HTTPException(502, "parse failure — source layout changed?")

    data = {
        "quotes": quotes,
        "source": SOURCE,
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
    }
    _cache.update(at=time.monotonic(), data=data)
    return data
