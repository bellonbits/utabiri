"""Receives pre-scraped KAMIS rows from the Vercel-side sync route.

kamis.kilimo.go.ke blocks the backend VPS's datacenter IP at the TCP level
(confirmed: connections from the VPS time out while general HTTPS egress
works fine), so the scrape has to happen from somewhere KAMIS doesn't block
— the frontend's Vercel deployment — which then pushes parsed rows here.
Authenticated with a shared secret rather than a user JWT since the caller
is a server-to-server cron job, not a logged-in admin.
"""
import os
from datetime import date

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from ..database import SessionFactory
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
