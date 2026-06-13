import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import ai, engine
from ..database import get_db
from ..models import (
    AuditLog,
    Market,
    Outcome,
    PlatformRevenue,
    Position,
    Trade,
    User,
    Wallet,
    WalletTransaction,
    Withdrawal,
)
from ..security import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(403, "FORBIDDEN")
    return user


class OutcomeIn(BaseModel):
    label: str
    initial_price: float = Field(default=0.5, gt=0.0, lt=1.0)


class MarketIn(BaseModel):
    id: str = Field(min_length=3, max_length=64, pattern=r"^[a-z0-9-]+$")
    question: str = Field(min_length=5, max_length=200)
    category: str = "Markets"
    kind: str = Field(default="multi", pattern="^(binary|multi|matchup)$")
    image: str = ""
    end_date: datetime
    b: float = Field(default=1000.0, ge=100, le=100_000)
    outcomes: list[OutcomeIn] = Field(min_length=1, max_length=10)


class ResolveIn(BaseModel):
    market_id: str
    winning_outcome_id: str | None = None  # which outcome resolved YES
    evidence: str = Field(min_length=5)


class WithdrawalAction(BaseModel):
    withdrawal_id: str
    approve: bool


class HeadlineIn(BaseModel):
    title: str = Field(max_length=300)
    source: str = ""
    category: str = "General"


class SuggestIn(BaseModel):
    headlines: list[HeadlineIn] = Field(min_length=1, max_length=40)
    category: str = ""


@router.post("/markets", status_code=201)
async def create_market(
    body: MarketIn,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if await db.get(Market, body.id):
        raise HTTPException(409, "MARKET_EXISTS")
    m = Market(
        id=body.id, question=body.question, category=body.category,
        kind=body.kind, image=body.image, end_date=body.end_date,
    )
    db.add(m)
    for i, o in enumerate(body.outcomes):
        db.add(Outcome(
            market_id=body.id, label=o.label, sort=i, b=body.b,
            q_yes=engine.seed_q_for_price(body.b, o.initial_price),
            price_yes=o.initial_price,
        ))
    db.add(AuditLog(action="market.create", user_id=admin.id,
                    metadata_json=json.dumps({"market": body.id})))
    await db.commit()
    return {"id": body.id, "status": "open"}


@router.post("/resolve-market")
async def resolve_market(
    body: ResolveIn,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    m = await db.get(Market, body.market_id)
    if m is None:
        raise HTTPException(404, "MARKET_NOT_FOUND")
    if m.status == "resolved":
        raise HTTPException(409, "ALREADY_RESOLVED")

    outcomes = (
        await db.scalars(select(Outcome).where(Outcome.market_id == m.id))
    ).all()
    winners_count = 0
    payout_total = 0

    for o in outcomes:
        won_side = "YES" if o.id == body.winning_outcome_id else "NO"
        positions = (
            await db.scalars(
                select(Position).where(
                    Position.outcome_id == o.id,
                    Position.settled == False,  # noqa: E712
                )
            )
        ).all()
        for pos in positions:
            if pos.side == won_side and pos.quantity > 0:
                payout = int(pos.quantity * engine.PAYOUT_CENTS)
                w = await db.get(Wallet, pos.user_id)
                w.balance_cents += payout
                db.add(WalletTransaction(
                    user_id=pos.user_id, type="payout",
                    amount_cents=payout, market_id=m.id,
                ))
                pos.realized_pnl_cents += payout - pos.cost_cents
                winners_count += 1
                payout_total += payout
            else:
                pos.realized_pnl_cents -= pos.cost_cents
            pos.settled = True
            pos.quantity = 0.0
            pos.cost_cents = 0

    m.status = "resolved"
    db.add(AuditLog(
        action="market.resolve", user_id=admin.id,
        metadata_json=json.dumps({
            "market": m.id, "winner": body.winning_outcome_id,
            "evidence": body.evidence,
        }),
    ))
    await db.commit()
    return {
        "market_id": m.id,
        "winners_count": winners_count,
        "payout_total_cents": payout_total,
    }


@router.get("/withdrawals")
async def list_withdrawals(
    admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    rows = (
        await db.scalars(
            select(Withdrawal).order_by(Withdrawal.created_at.desc()).limit(100)
        )
    ).all()
    return {"items": [
        {"id": w.id, "user_id": w.user_id, "amount_cents": w.amount_cents,
         "fee_cents": w.fee_cents, "phone": w.phone, "status": w.status,
         "created_at": w.created_at.isoformat()}
        for w in rows
    ]}


@router.post("/withdrawals/action")
async def act_on_withdrawal(
    body: WithdrawalAction,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    wd = await db.get(Withdrawal, body.withdrawal_id)
    if wd is None or wd.status != "pending":
        raise HTTPException(400, "NOT_PENDING")
    wallet = await db.get(Wallet, wd.user_id)

    if body.approve:
        wallet.locked_cents -= wd.amount_cents
        wallet.total_withdrawals_cents += wd.amount_cents
        wd.status = "completed"  # payout provider integration goes here
        db.add(WalletTransaction(
            user_id=wd.user_id, type="withdrawal",
            amount_cents=-wd.amount_cents,
        ))
        if wd.fee_cents:
            db.add(PlatformRevenue(
                source="withdrawal_fee", amount_cents=wd.fee_cents,
                reference=wd.id,
            ))
    else:
        wallet.locked_cents -= wd.amount_cents
        wallet.balance_cents += wd.amount_cents  # refund
        wd.status = "rejected"

    db.add(AuditLog(action="admin.withdrawal_" + wd.status, user_id=admin.id,
                    metadata_json=json.dumps({"withdrawal": wd.id})))
    await db.commit()
    return {"id": wd.id, "status": wd.status}


@router.post("/suggest-markets")
async def suggest_markets(
    body: SuggestIn,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """AI (Groq) turns today's headlines into draft market suggestions."""
    try:
        result = await ai.suggest_markets(
            [h.model_dump() for h in body.headlines], category=body.category
        )
    except ai.AiError as e:
        raise HTTPException(502, f"AI: {e}")
    db.add(AuditLog(action="admin.ai_suggest", user_id=admin.id,
                    metadata_json=json.dumps({"n": len(body.headlines), "category": body.category})))
    await db.commit()
    return result


@router.get("/stats")
async def stats(
    admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    users = await db.scalar(select(func.count(User.id)))
    trades = await db.scalar(select(func.count(Trade.id)))
    volume = await db.scalar(select(func.coalesce(func.sum(Trade.amount_cents), 0)))
    revenue = await db.scalar(
        select(func.coalesce(func.sum(PlatformRevenue.amount_cents), 0))
    )
    deposits = await db.scalar(
        select(func.coalesce(func.sum(WalletTransaction.amount_cents), 0)).where(
            WalletTransaction.type == "deposit",
            WalletTransaction.status == "completed",
        )
    )
    open_markets = await db.scalar(
        select(func.count(Market.id)).where(Market.status == "open")
    )
    return {
        "total_users": users,
        "total_trades": trades,
        "trading_volume_cents": int(volume),
        "revenue_cents": int(revenue),
        "deposits_cents": int(deposits),
        "open_markets": open_markets,
    }
