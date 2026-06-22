import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import BillAnalysis

router = APIRouter(prefix="/bills", tags=["bills"])


@router.get("")
async def list_bills(db: AsyncSession = Depends(get_db)):
    rows = (
        await db.scalars(select(BillAnalysis).order_by(BillAnalysis.created_at.desc()).limit(50))
    ).all()
    return {
        "items": [
            {
                "id": b.id, "title": b.title, "status": b.status,
                "created_at": b.created_at.isoformat(),
            }
            for b in rows
        ]
    }


@router.get("/{bill_id}")
async def get_bill(bill_id: str, db: AsyncSession = Depends(get_db)):
    b = await db.get(BillAnalysis, bill_id)
    if b is None:
        raise HTTPException(404, "NOT_FOUND")
    return {
        "id": b.id,
        "title": b.title,
        "source_url": b.source_url,
        "status": b.status,
        "overall_summary": b.overall_summary,
        "clauses": json.loads(b.clauses),
        "error": b.error,
        "created_at": b.created_at.isoformat(),
    }
