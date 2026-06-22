import json
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import ai
from ..models import CommodityPrice, EconomicBriefing, MacroIndicator
from ..routers.trends import fetch_headlines


async def generate_and_store(db: AsyncSession) -> EconomicBriefing:
    """Builds today's EconomicBriefing (idempotent — replaces today's row if
    one already exists) and persists it."""
    try:
        headlines = await fetch_headlines()
    except Exception:
        headlines = []

    prices = (
        await db.scalars(select(CommodityPrice).order_by(CommodityPrice.price_date.desc()).limit(20))
    ).all()
    indicators = (
        await db.scalars(select(MacroIndicator).order_by(MacroIndicator.created_at.desc()).limit(15))
    ).all()

    previous = (
        await db.scalars(
            select(EconomicBriefing).order_by(EconomicBriefing.briefing_date.desc()).limit(1)
        )
    ).first()

    context = {
        "headlines": headlines,
        "prices": [
            {"commodity": p.commodity, "market": p.market, "retail_price": p.retail_price,
             "price_date": p.price_date.isoformat()}
            for p in prices
        ],
        "indicators": [
            {"name": i.name, "value": i.value, "unit": i.unit, "period": i.period}
            for i in indicators
        ],
        "previous_score": previous.health_score if previous else None,
    }

    data = await ai.generate_briefing(context)

    today = date.today()
    existing = await db.scalar(select(EconomicBriefing).where(EconomicBriefing.briefing_date == today))
    if existing:
        await db.delete(existing)
        await db.flush()

    briefing = EconomicBriefing(
        briefing_date=today,
        health_score=data["health_score"],
        previous_score=previous.health_score if previous else None,
        score_trend=data["score_trend"],
        executive_summary=data["executive_summary"],
        key_drivers=json.dumps(data["key_drivers"]),
        country_comparison=json.dumps(data["country_comparison"]),
        kenya_strengths=json.dumps(data["kenya_strengths"]),
        kenya_weaknesses=json.dumps(data["kenya_weaknesses"]),
        sector_impacts=json.dumps(data["sector_impacts"]),
        personal_finance=json.dumps(data["personal_finance"]),
        investment_ideas=json.dumps(data["investment_ideas"]),
        austrian_view=data["austrian_view"],
        classical_view=data["classical_view"],
        government_recommendations=json.dumps(data["government_recommendations"]),
        business_recommendations=json.dumps(data["business_recommendations"]),
        household_recommendations=json.dumps(data["household_recommendations"]),
    )
    db.add(briefing)
    await db.commit()
    return briefing
