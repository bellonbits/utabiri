from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import MacroIndicator, User
from ..security import require_admin

router = APIRouter(prefix="/macro", tags=["macro"])


class IndicatorIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    value: float
    unit: str = ""
    period: str = Field(min_length=4, max_length=20)
    source: str = "Admin"
    notes: str | None = None


@router.get("/indicators")
async def list_indicators(db: AsyncSession = Depends(get_db)):
    rows = (
        await db.scalars(select(MacroIndicator).order_by(MacroIndicator.created_at.desc()).limit(200))
    ).all()
    latest_by_name: dict[str, MacroIndicator] = {}
    history: dict[str, list[dict]] = {}
    for r in rows:
        history.setdefault(r.name, []).append(
            {"value": r.value, "unit": r.unit, "period": r.period, "created_at": r.created_at.isoformat()}
        )
        if r.name not in latest_by_name:
            latest_by_name[r.name] = r
    return {
        "items": [
            {
                "name": name,
                "value": r.value,
                "unit": r.unit,
                "period": r.period,
                "source": r.source,
                "notes": r.notes,
                "updated_at": r.created_at.isoformat(),
                "history": list(reversed(history[name])),
            }
            for name, r in latest_by_name.items()
        ]
    }


@router.post("/indicators", status_code=201)
async def create_indicator(
    body: IndicatorIn,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    row = MacroIndicator(
        name=body.name, value=body.value, unit=body.unit, period=body.period,
        source=body.source, notes=body.notes, created_by=admin.id,
    )
    db.add(row)
    await db.commit()
    return {"id": row.id, "name": row.name, "value": row.value}
