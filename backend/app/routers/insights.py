import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Insight, Interest, User
from ..security import optional_user

router = APIRouter(prefix="/insights", tags=["insights"])


def _insight_dto(i: Insight) -> dict:
    return {
        "id": i.id,
        "kind": i.kind,
        "title": i.title,
        "body": i.body,
        "category": i.category,
        "related_commodity": i.related_commodity,
        "related_indicator": i.related_indicator,
        "sentiment": i.sentiment,
        "sources": json.loads(i.sources) if i.sources else [],
        "generated_by": i.generated_by,
        "created_at": i.created_at.isoformat(),
    }


@router.get("")
async def list_insights(
    kind: str = "",
    category: str = "",
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Insight)
    if kind:
        stmt = stmt.where(Insight.kind == kind)
    if category:
        stmt = stmt.where(Insight.category == category)
    stmt = stmt.order_by(Insight.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    rows = (await db.scalars(stmt)).all()
    return {"items": [_insight_dto(i) for i in rows], "page": page, "per_page": per_page}


@router.get("/feed")
async def personalized_feed(
    user: User | None = Depends(optional_user),
    db: AsyncSession = Depends(get_db),
):
    tags: list[str] = []
    if user:
        tags = list(
            (await db.scalars(select(Interest.tag).where(Interest.user_id == user.id))).all()
        )
    items: list[dict] = []
    if tags:
        from sqlalchemy import func, or_
        stmt = (
            select(Insight)
            .where(or_(
                func.lower(Insight.related_commodity).in_(tags),
                func.lower(Insight.related_indicator).in_(tags),
                func.lower(Insight.category).in_(tags),
            ))
            .order_by(Insight.created_at.desc())
            .limit(30)
        )
        rows = (await db.scalars(stmt)).all()
        items = [_insight_dto(i) for i in rows]
    if items:
        return {"items": items, "personalized": True}
    fallback_rows = (
        await db.scalars(select(Insight).order_by(Insight.created_at.desc()).limit(20))
    ).all()
    return {"items": [_insight_dto(i) for i in fallback_rows], "personalized": False}


@router.get("/{insight_id}")
async def get_insight(insight_id: str, db: AsyncSession = Depends(get_db)):
    i = await db.get(Insight, insight_id)
    if i is None:
        raise HTTPException(404, "NOT_FOUND")
    return _insight_dto(i)
