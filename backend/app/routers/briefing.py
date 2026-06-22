import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import EconomicBriefing

router = APIRouter(prefix="/briefing", tags=["briefing"])


def _dto(b: EconomicBriefing) -> dict:
    return {
        "id": b.id,
        "date": b.briefing_date.isoformat(),
        "health_score": b.health_score,
        "previous_score": b.previous_score,
        "score_trend": b.score_trend,
        "executive_summary": b.executive_summary,
        "key_drivers": json.loads(b.key_drivers),
        "country_comparison": json.loads(b.country_comparison),
        "kenya_strengths": json.loads(b.kenya_strengths),
        "kenya_weaknesses": json.loads(b.kenya_weaknesses),
        "sector_impacts": json.loads(b.sector_impacts),
        "personal_finance": json.loads(b.personal_finance),
        "investment_ideas": json.loads(b.investment_ideas),
        "austrian_view": b.austrian_view,
        "classical_view": b.classical_view,
        "government_recommendations": json.loads(b.government_recommendations),
        "business_recommendations": json.loads(b.business_recommendations),
        "household_recommendations": json.loads(b.household_recommendations),
        "created_at": b.created_at.isoformat(),
    }


@router.get("/latest")
async def latest_briefing(db: AsyncSession = Depends(get_db)):
    b = (
        await db.scalars(
            select(EconomicBriefing).order_by(EconomicBriefing.briefing_date.desc()).limit(1)
        )
    ).first()
    if b is None:
        raise HTTPException(404, "NO_BRIEFING_YET")
    return _dto(b)


@router.get("/history")
async def briefing_history(db: AsyncSession = Depends(get_db)):
    rows = (
        await db.scalars(
            select(EconomicBriefing).order_by(EconomicBriefing.briefing_date.desc()).limit(30)
        )
    ).all()
    return {
        "items": [
            {"date": b.briefing_date.isoformat(), "health_score": b.health_score, "score_trend": b.score_trend}
            for b in rows
        ]
    }
