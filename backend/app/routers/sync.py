"""Live sync and data ingestion endpoints.
Fetches real data from KAMIS / UN WFP and synchronizes database state.
"""
import os
from datetime import date

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from ..database import SessionFactory
from ..live_bootstrap import bootstrap_live_data
from ..services.kamis import upsert_rows

router = APIRouter(prefix="/sync", tags=["sync"])

SYNC_SECRET = os.environ.get("KAMIS_SYNC_SECRET", "")


class RowIn(BaseModel):
    commodity: str
    classification: str | None = None
    grade: str | None = None
    market: str
    county: str
    wholesale_price: float | None = None
    retail_price: float | None = None
    unit: str | None = None
    supply_volume: float | None = None
    price_date: date


class IngestRowsIn(BaseModel):
    rows: list[RowIn] = Field(max_length=2000)


@router.post("/kamis")
async def sync_kamis_rows(
    body: IngestRowsIn,
    x_sync_secret: str = Header(default=""),
):
    if not SYNC_SECRET or x_sync_secret != SYNC_SECRET:
        raise HTTPException(401, "INVALID_SYNC_SECRET")
    rows = [r.model_dump() for r in body.rows]
    async with SessionFactory() as db:
        inserted = await upsert_rows(db, rows)
    return {"rows_received": len(rows), "rows_inserted": inserted}


@router.get("/bootstrap")
@router.post("/bootstrap")
async def trigger_live_bootstrap():
    """Trigger live platform data synchronization on demand."""
    await bootstrap_live_data()
    return {"status": "ok", "message": "Live platform data synchronization completed"}
