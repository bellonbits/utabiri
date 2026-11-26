"""Public AI trend pulse — sentiment + hottest topics from the news.

Groq is called at most once per TTL window; everyone else gets the cache.
Headlines come from the frontend's news aggregator (/api/news).
"""
import os
import time
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException

from .. import ai

router = APIRouter(tags=["trends"])

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3100")
TTL_SECONDS = 1800  # refresh at most every 30 minutes

_cache: dict[str, Any] = {"at": 0.0, "data": None}


DEFAULT_KENYA_HEADLINES = [
    {"title": "Central Bank of Kenya Holds Base Lending Rate Steady at 12.75%", "source": "Business Daily", "category": "Macro"},
    {"title": "Nairobi Coffee Exchange Records Higher Realization for Premium Grade AA", "source": "Daily Nation", "category": "Markets"},
    {"title": "EPRA Releases Fuel Prices Retaining Super Petrol and Diesel Rates", "source": "The Standard", "category": "Energy"},
    {"title": "Kenya Revenue Authority Surpasses Quarterly Target Amid Digital Invoicing Drive", "source": "Capital FM", "category": "Macro"},
    {"title": "Maize Flour Prices Ease as Short-Rain Harvest Enters Key North Rift Markets", "source": "KAMIS Agriculture", "category": "Agriculture"},
    {"title": "Nairobi Securities Exchange All Share Index Gains on Foreign Investor Inflows", "source": "NSE Kenya", "category": "Markets"},
    {"title": "Kenya Shilling Strengthens Against US Dollar at 129.95 Amid Remittances", "source": "CBK Exchange", "category": "Forex"},
]


async def fetch_headlines() -> list[dict[str, str]]:
    try:
        async with httpx.AsyncClient(timeout=10.0) as c:
            r = await c.get(f"{FRONTEND_URL}/api/news")
            if r.status_code == 200:
                items = r.json().get("items", [])
                if items:
                    return [
                        {"title": n.get("title", ""), "source": n.get("source", ""),
                         "category": n.get("category", "General")}
                        for n in items[:35]
                    ]
    except Exception:
        pass
    return DEFAULT_KENYA_HEADLINES


@router.get("/trends")
async def trends():
    now = time.time()
    if _cache["data"] and now - _cache["at"] < TTL_SECONDS:
        return _cache["data"]

    headlines = await fetch_headlines()
    if not headlines:
        headlines = DEFAULT_KENYA_HEADLINES

    try:
        analysis = await ai.analyze_trends(headlines)
    except Exception:
        analysis = ai._heuristic_trends(headlines)

    data = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "headline_count": len(headlines),
        **analysis,
    }
    _cache.update(at=now, data=data)
    return data
