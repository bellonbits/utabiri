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


async def _fetch_headlines() -> list[dict[str, str]]:
    async with httpx.AsyncClient(timeout=30.0) as c:
        r = await c.get(f"{FRONTEND_URL}/api/news")
        r.raise_for_status()
        items = r.json().get("items", [])
    return [
        {"title": n.get("title", ""), "source": n.get("source", ""),
         "category": n.get("category", "General")}
        for n in items[:35]
    ]


@router.get("/trends")
async def trends():
    now = time.time()
    if _cache["data"] and now - _cache["at"] < TTL_SECONDS:
        return _cache["data"]

    try:
        headlines = await _fetch_headlines()
    except Exception:
        headlines = []
    if not headlines:
        if _cache["data"]:
            return _cache["data"]  # stale beats nothing
        raise HTTPException(503, "news feed unavailable")

    try:
        analysis = await ai.analyze_trends(headlines)
    except ai.AiError as e:
        if _cache["data"]:
            return _cache["data"]
        raise HTTPException(502, f"AI: {e}")

    data = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "headline_count": len(headlines),
        **analysis,
    }
    _cache.update(at=now, data=data)
    return data
