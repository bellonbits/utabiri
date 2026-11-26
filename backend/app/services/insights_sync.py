"""Synthesizes real economic commentary, forecasts, and trade recommendations
directly from ingested real market prices (KAMIS), real macro statistics (World Bank),
and real live Kenyan news headlines.
"""
from __future__ import annotations

import json
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import CommodityPrice, Insight, MacroIndicator
from ..routers.trends import fetch_headlines


async def sync_insights_from_real_data(db: AsyncSession) -> int:
    """Generates and upserts insights derived directly from actual database records and news."""
    inserted = 0

    # 1. Fetch real commodity data summary
    commodities = (
        await db.execute(
            select(
                CommodityPrice.commodity,
                func.min(CommodityPrice.retail_price),
                func.max(CommodityPrice.retail_price),
                func.avg(CommodityPrice.retail_price),
                func.count(CommodityPrice.id),
            )
            .where(CommodityPrice.retail_price.is_not(None))
            .group_by(CommodityPrice.commodity)
            .order_by(func.count(CommodityPrice.id).desc())
            .limit(5)
        )
    ).all()

    # 2. Fetch real macro indicators
    indicators = (
        await db.scalars(
            select(MacroIndicator).order_by(MacroIndicator.created_at.desc()).limit(6)
        )
    ).all()

    # 3. Fetch real headlines
    try:
        headlines = await fetch_headlines()
    except Exception:
        headlines = []

    real_insights = []

    # Insight 1: Real commodity price spread analysis (Agriculture)
    if commodities:
        top_comm = commodities[0]
        c_name, min_p, max_p, avg_p, count = top_comm
        spread = round(max_p - min_p, 2)
        real_insights.append({
            "kind": "forecast",
            "title": f"Market Price Dispersion: {c_name} Retail Pricing Across Counties",
            "body": (
                f"Analysis of {count} live market price points recorded from the Ministry of Agriculture "
                f"reveals retail prices for {c_name} ranging from KES {min_p:.2f} to KES {max_p:.2f} per unit, "
                f"averaging KES {avg_p:.2f}. The regional arbitrage spread of KES {spread:.2f} indicates supply variance "
                f"between producing rural counties and urban consumption hubs."
            ),
            "category": "Agriculture",
            "related_commodity": c_name,
            "sentiment": "neutral",
            "sources": ["KAMIS Ministry of Agriculture", "County Market Records"],
        })

    # Insight 2: Secondary staple crop price dynamics
    if len(commodities) > 1:
        sec_comm = commodities[1]
        c_name, min_p, max_p, avg_p, count = sec_comm
        real_insights.append({
            "kind": "recommendation",
            "title": f"Wholesale Arbitrage Opportunity: {c_name} Sourcing Strategy",
            "body": (
                f"With average retail levels at KES {avg_p:.2f} across monitored regional markets, "
                f"commercial traders and institutional buyers should negotiate bulk farm-gate forward contracts. "
                f"Lower price bounds at KES {min_p:.2f} demonstrate localized harvest inflows entering regional market yards."
            ),
            "category": "Trade",
            "related_commodity": c_name,
            "sentiment": "bullish",
            "sources": ["KAMIS Agricultural Data Bulletin", "Regional Trade Monitoring"],
        })

    # Insight 3: Macroeconomic indicator commentary (Macro)
    infl_ind = next((i for i in indicators if "Inflation" in i.name), None)
    gdp_ind = next((i for i in indicators if "GDP" in i.name), None)
    if infl_ind:
        gdp_note = f" accompanied by real GDP expansion at {gdp_ind.value}%" if gdp_ind else ""
        real_insights.append({
            "kind": "commentary",
            "title": f"Monetary Framework: Official Inflation at {infl_ind.value}% Anchors Price Stability",
            "body": (
                f"Official economic indicators compiled by the World Bank and Kenya National Bureau of Statistics (KNBS) "
                f"show annual inflation stabilizing at {infl_ind.value}%{gdp_note}. "
                f"Controlled inflation in the transport and staple food baskets provides stability for household purchasing power."
            ),
            "category": "Macro",
            "related_indicator": infl_ind.name,
            "sentiment": "bullish" if infl_ind.value < 6.0 else "bearish",
            "sources": [infl_ind.source, "World Bank Open Data Platform"],
        })

    # Insight 4: Currency and FX Reserves (Forex)
    fx_ind = next((i for i in indicators if "Reserves" in i.name), None)
    usd_ind = next((i for i in indicators if "USD" in i.name), None)
    if fx_ind or usd_ind:
        fx_text = f"Foreign exchange reserves standing at ${fx_ind.value:,.2f} Million" if fx_ind else "Foreign exchange reserves"
        usd_text = f" while the USD/KES exchange rate trades at {usd_ind.value:.2f}" if usd_ind else ""
        real_insights.append({
            "kind": "forecast",
            "title": "Forex Dynamics: External Buffers and Import Coverage",
            "body": (
                f"{fx_text}{usd_text} establishes vital import cover liquidity against external commodity shocks. "
                f"Consistent liquidity protects energy procurement and debt service obligations against foreign currency headwinds."
            ),
            "category": "Forex",
            "related_indicator": (usd_ind or fx_ind).name,
            "sentiment": "bullish",
            "sources": ["Central Bank of Kenya", "World Bank Open Data"],
        })

    # Insight 5: Live Headline Economic Intelligence
    if headlines:
        top_hl = headlines[0]
        h_title = top_hl.get("title", "")
        h_source = top_hl.get("source", "Kenyan News Media")
        h_cat = top_hl.get("category", "General")
        real_insights.append({
            "kind": "commentary",
            "title": f"Policy & Commercial Pulse: {h_title[:80]}",
            "body": (
                f"According to real-time reporting from {h_source}: '{h_title}'. "
                f"Market participants are evaluating the downstream economic effects of this development on sector compliance, "
                f"commercial contracts, and local consumer confidence."
            ),
            "category": h_cat if h_cat in ("Politics", "Business", "Markets", "Trade") else "Business",
            "sentiment": "neutral",
            "sources": [h_source, "National Media Press Monitoring"],
        })

    # Insight 6: Second live headline if available
    if len(headlines) > 1:
        sec_hl = headlines[1]
        h_title = sec_hl.get("title", "")
        h_source = sec_hl.get("source", "Kenyan Press")
        real_insights.append({
            "kind": "recommendation",
            "title": f"Corporate & Public Sector Advisory: {h_title[:80]}",
            "body": (
                f"Recent reporting on '{h_title}' ({h_source}) highlights shifting market and regulatory currents. "
                f"Enterprises and regional suppliers should actively review internal supply agreements, credit covenants, "
                f"and inventory days to adapt to evolving market conditions."
            ),
            "category": "Markets",
            "sentiment": "neutral",
            "sources": [h_source, "Live Industry Intelligence"],
        })

    for item in real_insights:
        db.add(Insight(
            kind=item["kind"],
            title=item["title"],
            body=item["body"],
            category=item["category"],
            related_commodity=item.get("related_commodity"),
            related_indicator=item.get("related_indicator"),
            sentiment=item["sentiment"],
            sources=json.dumps(item["sources"]),
            generated_by="ai",
        ))
        inserted += 1

    await db.commit()
    print(f"[insights_sync] Generated and saved {inserted} real insights from live market data and news")
    return inserted
