from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import Market, Outcome, Position, PricePoint, Trade, User

router = APIRouter(tags=["markets"])


def outcome_dto(o: Outcome) -> dict:
    return {
        "id": o.id,
        "label": o.label,
        "price_yes": round(o.price_yes, 4),
        "price_no": round(1 - o.price_yes, 4),
    }


def market_dto(m: Market) -> dict:
    return {
        "id": m.id,
        "question": m.question,
        "category": m.category,
        "kind": m.kind,
        "image": m.image,
        "status": m.status,
        "end_date": m.end_date.isoformat(),
        "volume_cents": m.volume_cents,
        "is_new": m.is_new,
        "live_status": m.live_status,
        "outcomes": [outcome_dto(o) for o in m.outcomes],
    }


@router.get("/markets")
async def list_markets(
    category: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(Market)
        .options(selectinload(Market.outcomes))
        .where(Market.status == "open")
        .order_by(Market.volume_cents.desc())
    )
    if category:
        q = q.where(func.lower(Market.category) == category.lower())
    rows = (await db.scalars(q)).all()
    return {"items": [market_dto(m) for m in rows]}


@router.get("/markets/{market_id}")
async def market_detail(market_id: str, db: AsyncSession = Depends(get_db)):
    m = await db.scalar(
        select(Market)
        .options(selectinload(Market.outcomes))
        .where(Market.id == market_id)
    )
    if m is None:
        raise HTTPException(404, "MARKET_NOT_FOUND")
    return market_dto(m)


@router.get("/markets/{market_id}/history")
async def market_history(market_id: str, db: AsyncSession = Depends(get_db)):
    m = await db.scalar(
        select(Market)
        .options(selectinload(Market.outcomes))
        .where(Market.id == market_id)
    )
    if m is None:
        raise HTTPException(404, "MARKET_NOT_FOUND")

    out = []
    for o in m.outcomes:
        points = (
            await db.scalars(
                select(PricePoint)
                .where(PricePoint.outcome_id == o.id)
                .order_by(PricePoint.created_at)
                .limit(500)
            )
        ).all()
        out.append(
            {
                "outcome_id": o.id,
                "label": o.label,
                "points": [
                    {"t": p.created_at.isoformat(), "price_yes": round(p.price_yes, 4)}
                    for p in points
                ],
            }
        )
    return {"series": out}


@router.get("/leaderboard")
async def leaderboard(db: AsyncSession = Depends(get_db)):
    pnl = (
        select(
            Position.user_id,
            func.sum(Position.realized_pnl_cents).label("profit"),
        )
        .group_by(Position.user_id)
        .subquery()
    )
    vol = (
        select(
            Trade.user_id,
            func.sum(Trade.amount_cents).label("volume"),
            func.count(Trade.id).label("trades"),
        )
        .group_by(Trade.user_id)
        .subquery()
    )
    rows = (
        await db.execute(
            select(
                User.id,
                User.display_name,
                User.avatar_url,
                func.coalesce(pnl.c.profit, 0),
                func.coalesce(vol.c.volume, 0),
                func.coalesce(vol.c.trades, 0),
            )
            .outerjoin(pnl, pnl.c.user_id == User.id)
            .outerjoin(vol, vol.c.user_id == User.id)
            .order_by(func.coalesce(pnl.c.profit, 0).desc())
            .limit(100)
        )
    ).all()
    return {
        "items": [
            {
                "rank": i + 1,
                "user_id": uid,
                "display_name": name,
                "avatar_url": avatar,
                "profit_cents": int(profit),
                "volume_cents": int(volume),
                "total_trades": int(trades),
            }
            for i, (uid, name, avatar, profit, volume, trades) in enumerate(rows)
        ]
    }
