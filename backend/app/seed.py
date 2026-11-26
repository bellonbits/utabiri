"""Database live data synchronizer.
Fetches 100% REAL live data from official platforms:
- KAMIS (Ministry of Agriculture Kenya) for real commodity prices
- World Bank Open Data API & TradingView for real macroeconomic indicators
- Standard Media, KNA, Capital FM for real news headlines
- Live contextual synthesis for daily economic briefing & market insights

Zero mock or fake data.
"""
from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .database import SessionFactory
from .models import CommodityPrice, EconomicBriefing, Insight, MacroIndicator
from .services import briefing, insights_sync, kamis, macro_sync


async def seed_if_empty() -> None:
    async with SessionFactory() as db:
        price_count = await db.scalar(select(func.count(CommodityPrice.id)))
        if price_count == 0:
            print("[utabiri] Ingesting real commodity prices from KAMIS (Ministry of Agriculture)...")
            try:
                await kamis.ingest_latest(db)
            except Exception as e:
                print(f"[utabiri] KAMIS real ingest error: {e!r}")

        indicator_count = await db.scalar(select(func.count(MacroIndicator.id)))
        if indicator_count == 0:
            print("[utabiri] Ingesting real macro indicators from World Bank Open API & TradingView...")
            try:
                await macro_sync.sync_macro_indicators(db)
            except Exception as e:
                print(f"[utabiri] Macro sync error: {e!r}")

        insight_count = await db.scalar(select(func.count(Insight.id)))
        if insight_count == 0:
            print("[utabiri] Synthesizing insights from live market data...")
            try:
                await insights_sync.sync_insights_from_real_data(db)
            except Exception as e:
                print(f"[utabiri] Insights sync error: {e!r}")

        briefing_count = await db.scalar(select(func.count(EconomicBriefing.id)))
        if briefing_count == 0:
            print("[utabiri] Generating daily economic briefing from live context...")
            try:
                await briefing.generate_and_store(db)
            except Exception as e:
                print(f"[utabiri] Briefing generation error: {e!r}")
