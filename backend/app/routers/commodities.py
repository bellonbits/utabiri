from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import CommodityPrice

router = APIRouter(prefix="/commodities", tags=["commodities"])


@router.get("")
async def list_commodities(db: AsyncSession = Depends(get_db)):
    rows = (
        await db.scalars(
            select(CommodityPrice.commodity).distinct().order_by(CommodityPrice.commodity)
        )
    ).all()
    return {"items": list(rows)}


@router.get("/prices")
async def list_prices(
    commodity: str = "",
    county: str = "",
    market: str = "",
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(CommodityPrice)
    if commodity:
        stmt = stmt.where(CommodityPrice.commodity == commodity)
    if county:
        stmt = stmt.where(CommodityPrice.county == county)
    if market:
        stmt = stmt.where(CommodityPrice.market == market)
    stmt = stmt.order_by(CommodityPrice.price_date.desc()).offset((page - 1) * per_page).limit(per_page)
    rows = (await db.scalars(stmt)).all()
    return {
        "items": [
            {
                "id": r.id,
                "commodity": r.commodity,
                "classification": r.classification,
                "grade": r.grade,
                "market": r.market,
                "county": r.county,
                "wholesale_price": r.wholesale_price,
                "retail_price": r.retail_price,
                "unit": r.unit,
                "supply_volume": r.supply_volume,
                "price_date": r.price_date.isoformat(),
            }
            for r in rows
        ],
        "page": page,
        "per_page": per_page,
    }


@router.get("/{commodity}/trend")
async def commodity_trend(
    commodity: str,
    days: int = Query(default=90, ge=7, le=365),
    db: AsyncSession = Depends(get_db),
):
    cutoff = date.today().toordinal() - days
    cutoff_date = date.fromordinal(cutoff)
    rows = (
        await db.execute(
            select(
                CommodityPrice.price_date,
                func.avg(CommodityPrice.wholesale_price),
                func.avg(CommodityPrice.retail_price),
            )
            .where(CommodityPrice.commodity == commodity, CommodityPrice.price_date >= cutoff_date)
            .group_by(CommodityPrice.price_date)
            .order_by(CommodityPrice.price_date)
        )
    ).all()
    return {
        "commodity": commodity,
        "points": [
            {
                "date": d.isoformat(),
                "avg_wholesale": round(w, 2) if w is not None else None,
                "avg_retail": round(r, 2) if r is not None else None,
            }
            for d, w, r in rows
        ],
    }
