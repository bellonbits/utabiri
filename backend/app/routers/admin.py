import asyncio
import json

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import ai
from ..database import get_db
from ..models import AuditLog, BillAnalysis, CommodityPrice, Insight, MacroIndicator, User
from ..security import require_admin
from ..services import bill_analysis, briefing, kamis
from .trends import fetch_headlines

router = APIRouter(prefix="/admin", tags=["admin"])


class GenerateIn(BaseModel):
    kind: str = Field(pattern="^(commentary|forecast|recommendation)$")
    category: str = ""
    commodity: str | None = None
    indicator: str | None = None
    interest_tags: list[str] = Field(default_factory=list)


class AnalyzeBillIn(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    source_url: str = Field(min_length=10)


@router.post("/kamis/ingest")
async def trigger_kamis_ingest(
    admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    try:
        result = await kamis.ingest_latest(db)
    except httpx.HTTPError as e:
        raise HTTPException(502, f"Could not reach KAMIS: {e!r}")
    db.add(AuditLog(action="admin.kamis_ingest", user_id=admin.id, metadata_json=json.dumps(result)))
    await db.commit()
    return result


@router.post("/insights/generate")
async def generate_insight(
    body: GenerateIn,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        headlines = await fetch_headlines()
    except Exception:
        headlines = []

    created: list[Insight] = []

    if body.kind == "commentary":
        prices = (
            await db.scalars(
                select(CommodityPrice).order_by(CommodityPrice.price_date.desc()).limit(40)
            )
        ).all()
        indicators = (
            await db.scalars(select(MacroIndicator).order_by(MacroIndicator.created_at.desc()).limit(20))
        ).all()
        try:
            items = await ai.generate_commentary(
                [
                    {"commodity": p.commodity, "market": p.market, "county": p.county,
                     "wholesale_price": p.wholesale_price, "retail_price": p.retail_price,
                     "price_date": p.price_date.isoformat()}
                    for p in prices
                ],
                [
                    {"name": i.name, "value": i.value, "unit": i.unit, "period": i.period, "source": i.source}
                    for i in indicators
                ],
                headlines,
                category=body.category,
            )
        except ai.AiError as e:
            raise HTTPException(502, f"AI: {e}")
        for item in items:
            created.append(Insight(kind="commentary", generated_by="ai", **item))

    elif body.kind == "forecast":
        if not body.commodity and not body.indicator:
            raise HTTPException(400, "commodity or indicator required for forecast")
        subject = body.commodity or body.indicator
        if body.commodity:
            rows = (
                await db.scalars(
                    select(CommodityPrice)
                    .where(CommodityPrice.commodity == body.commodity)
                    .order_by(CommodityPrice.price_date.desc())
                    .limit(30)
                )
            ).all()
            points = [{"date": r.price_date.isoformat(), "value": r.retail_price} for r in rows]
        else:
            rows = (
                await db.scalars(
                    select(MacroIndicator)
                    .where(MacroIndicator.name == body.indicator)
                    .order_by(MacroIndicator.created_at.desc())
                    .limit(30)
                )
            ).all()
            points = [{"period": r.period, "value": r.value} for r in rows]
        try:
            item = await ai.generate_forecast(subject, points, category=body.category)
        except ai.AiError as e:
            raise HTTPException(502, f"AI: {e}")
        if item:
            created.append(Insight(kind="forecast", generated_by="ai", **item))

    else:  # recommendation
        tags = body.interest_tags or []
        prices = (
            await db.scalars(
                select(CommodityPrice).order_by(CommodityPrice.price_date.desc()).limit(20)
            )
        ).all()
        context = {p.commodity: f"{p.retail_price} retail @ {p.market}" for p in prices}
        try:
            items = await ai.generate_recommendations(tags, context)
        except ai.AiError as e:
            raise HTTPException(502, f"AI: {e}")
        for item in items:
            created.append(Insight(kind="recommendation", generated_by="ai", **item))

    for c in created:
        db.add(c)
    db.add(AuditLog(action="admin.generate_insight", user_id=admin.id,
                    metadata_json=json.dumps({"kind": body.kind, "n": len(created)})))
    await db.commit()
    return {"created": len(created), "items": [
        {"id": c.id, "title": c.title, "kind": c.kind} for c in created
    ]}


@router.get("/insights")
async def list_insights_admin(
    admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    rows = (await db.scalars(select(Insight).order_by(Insight.created_at.desc()).limit(100))).all()
    return {"items": [{"id": i.id, "kind": i.kind, "title": i.title, "category": i.category,
                        "created_at": i.created_at.isoformat()} for i in rows]}


@router.delete("/insights/{insight_id}", status_code=204)
async def delete_insight(
    insight_id: str, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    row = await db.get(Insight, insight_id)
    if row is None:
        raise HTTPException(404, "NOT_FOUND")
    await db.delete(row)
    await db.commit()


@router.post("/briefing/generate")
async def trigger_briefing(
    admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    try:
        b = await briefing.generate_and_store(db)
    except ai.AiError as e:
        raise HTTPException(502, f"AI: {e}")
    db.add(AuditLog(action="admin.generate_briefing", user_id=admin.id,
                    metadata_json=json.dumps({"date": b.briefing_date.isoformat(), "score": b.health_score})))
    await db.commit()
    return {"id": b.id, "date": b.briefing_date.isoformat(), "health_score": b.health_score}


@router.post("/bills/analyze", status_code=202)
async def trigger_bill_analysis(
    body: AnalyzeBillIn,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    bill = BillAnalysis(title=body.title, source_url=body.source_url, status="processing")
    db.add(bill)
    db.add(AuditLog(action="admin.analyze_bill", user_id=admin.id,
                    metadata_json=json.dumps({"title": body.title})))
    await db.commit()
    asyncio.create_task(bill_analysis.run_analysis(bill.id, body.source_url))
    return {"id": bill.id, "status": bill.status}


@router.get("/stats")
async def stats(
    admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    users = await db.scalar(select(func.count(User.id)))
    insights = await db.scalar(select(func.count(Insight.id)))
    commodity_rows = await db.scalar(select(func.count(CommodityPrice.id)))
    last_ingest = await db.scalar(select(func.max(CommodityPrice.created_at)))
    return {
        "total_users": users,
        "total_insights": insights,
        "commodity_rows": commodity_rows,
        "last_ingest_at": last_ingest.isoformat() if last_ingest else None,
    }
