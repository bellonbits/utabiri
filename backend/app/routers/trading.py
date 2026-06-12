import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import engine
from ..database import get_db
from ..models import (
    AuditLog,
    Market,
    Outcome,
    PlatformRevenue,
    Position,
    PricePoint,
    Trade,
    User,
    Wallet,
    WalletTransaction,
)
from ..security import get_current_user

router = APIRouter(tags=["trading"])

TRADE_FEE_PCT = 0.02  # platform revenue per trade


class QuoteIn(BaseModel):
    outcome_id: str
    side: str = Field(pattern="^(YES|NO)$")
    amount_cents: int = Field(ge=engine.MIN_TRADE_CENTS)


class SellIn(BaseModel):
    outcome_id: str
    side: str = Field(pattern="^(YES|NO)$")
    quantity: float = Field(gt=0)


async def open_outcome(db: AsyncSession, outcome_id: str) -> tuple[Outcome, Market]:
    o = await db.get(Outcome, outcome_id)
    if o is None:
        raise HTTPException(404, "OUTCOME_NOT_FOUND")
    m = await db.get(Market, o.market_id)
    if m is None or m.status != "open":
        raise HTTPException(400, "MARKET_CLOSED")
    return o, m


def fee_split(amount_cents: int) -> tuple[int, int]:
    """Returns (fee, net) — fee is platform revenue, net hits the pool."""
    fee = int(amount_cents * TRADE_FEE_PCT)
    return fee, amount_cents - fee


@router.post("/trade/quote")
async def quote(body: QuoteIn, db: AsyncSession = Depends(get_db)):
    o, _ = await open_outcome(db, body.outcome_id)
    fee, net = fee_split(body.amount_cents)
    try:
        q = engine.buy_quote(engine.Pool(o.b, o.q_yes, o.q_no), body.side, net)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {
        "shares": q.shares,
        "avg_price": round(q.avg_price, 4),
        "price_yes_after": round(q.price_yes_after, 4),
        "fee_cents": fee,
        "potential_payout_cents": int(q.shares * engine.PAYOUT_CENTS),
    }


@router.post("/trade/buy")
async def buy(
    body: QuoteIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    o, m = await open_outcome(db, body.outcome_id)
    wallet = await db.get(Wallet, user.id)
    if wallet is None or wallet.balance_cents < body.amount_cents:
        raise HTTPException(400, "INSUFFICIENT_BALANCE")

    fee, net = fee_split(body.amount_cents)
    try:
        q = engine.buy_quote(engine.Pool(o.b, o.q_yes, o.q_no), body.side, net)
    except ValueError as e:
        raise HTTPException(400, str(e))

    # money out of wallet (gross), fee to platform, net into the pool
    wallet.balance_cents -= body.amount_cents
    db.add(WalletTransaction(
        user_id=user.id, type="trade_buy", amount_cents=-body.amount_cents,
        market_id=m.id,
    ))
    if fee:
        db.add(PlatformRevenue(source="trade_fee", amount_cents=fee, reference=m.id))

    o.q_yes, o.q_no, o.price_yes = q.q_yes_after, q.q_no_after, q.price_yes_after
    m.volume_cents += body.amount_cents
    db.add(PricePoint(outcome_id=o.id, price_yes=o.price_yes))

    pos = await db.scalar(
        select(Position).where(
            Position.user_id == user.id,
            Position.outcome_id == o.id,
            Position.side == body.side,
            Position.settled == False,  # noqa: E712
        )
    )
    if pos is None:
        pos = Position(
            user_id=user.id, outcome_id=o.id, side=body.side,
            quantity=0.0, cost_cents=0, realized_pnl_cents=0, settled=False,
        )
        db.add(pos)
    pos.quantity += q.shares
    pos.cost_cents += body.amount_cents

    trade = Trade(
        user_id=user.id, outcome_id=o.id, side=body.side, type="buy",
        quantity=q.shares, amount_cents=body.amount_cents, price=q.avg_price,
    )
    db.add(trade)
    db.add(AuditLog(action="trade.buy", user_id=user.id,
                    metadata_json=json.dumps({"outcome": o.id, "cents": body.amount_cents})))
    await db.commit()

    return {
        "trade_id": trade.id,
        "shares": q.shares,
        "avg_price": round(q.avg_price, 4),
        "price_yes_after": round(q.price_yes_after, 4),
        "fee_cents": fee,
        "new_balance_cents": wallet.balance_cents,
        "position": {
            "side": pos.side,
            "quantity": round(pos.quantity, 4),
            "cost_cents": pos.cost_cents,
        },
    }


@router.post("/trade/sell")
async def sell(
    body: SellIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    o, m = await open_outcome(db, body.outcome_id)
    pos = await db.scalar(
        select(Position).where(
            Position.user_id == user.id,
            Position.outcome_id == o.id,
            Position.side == body.side,
            Position.settled == False,  # noqa: E712
        )
    )
    if pos is None or pos.quantity + 1e-9 < body.quantity:
        raise HTTPException(400, "INSUFFICIENT_SHARES")

    try:
        q = engine.sell_quote(
            engine.Pool(o.b, o.q_yes, o.q_no), body.side, body.quantity
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    fee = int(q.amount_cents * TRADE_FEE_PCT)
    proceeds = q.amount_cents - fee

    wallet = await db.get(Wallet, user.id)
    wallet.balance_cents += proceeds
    db.add(WalletTransaction(
        user_id=user.id, type="trade_sell", amount_cents=proceeds, market_id=m.id,
    ))
    if fee:
        db.add(PlatformRevenue(source="trade_fee", amount_cents=fee, reference=m.id))

    # reduce position; cost basis released proportionally
    frac = body.quantity / pos.quantity
    released_cost = int(pos.cost_cents * frac)
    pos.quantity -= body.quantity
    pos.cost_cents -= released_cost
    pos.realized_pnl_cents += proceeds - released_cost

    o.q_yes, o.q_no, o.price_yes = q.q_yes_after, q.q_no_after, q.price_yes_after
    m.volume_cents += q.amount_cents
    db.add(PricePoint(outcome_id=o.id, price_yes=o.price_yes))

    trade = Trade(
        user_id=user.id, outcome_id=o.id, side=body.side, type="sell",
        quantity=body.quantity, amount_cents=proceeds, price=q.avg_price,
    )
    db.add(trade)
    db.add(AuditLog(action="trade.sell", user_id=user.id,
                    metadata_json=json.dumps({"outcome": o.id, "qty": body.quantity})))
    await db.commit()

    return {
        "trade_id": trade.id,
        "proceeds_cents": proceeds,
        "fee_cents": fee,
        "avg_price": round(q.avg_price, 4),
        "price_yes_after": round(q.price_yes_after, 4),
        "new_balance_cents": wallet.balance_cents,
        "realized_pnl_cents": pos.realized_pnl_cents,
    }


@router.get("/positions")
async def positions(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    rows = (
        await db.execute(
            select(Position, Outcome, Market)
            .join(Outcome, Outcome.id == Position.outcome_id)
            .join(Market, Market.id == Outcome.market_id)
            .where(Position.user_id == user.id, Position.quantity > 0)
        )
    ).all()
    items = []
    for pos, o, m in rows:
        price = o.price_yes if pos.side == "YES" else 1 - o.price_yes
        value = int(pos.quantity * price * engine.PAYOUT_CENTS)
        items.append({
            "market": {"id": m.id, "question": m.question, "status": m.status},
            "outcome": o.label,
            "side": pos.side,
            "quantity": round(pos.quantity, 4),
            "cost_cents": pos.cost_cents,
            "current_price": round(price, 4),
            "current_value_cents": value,
            "unrealized_pnl_cents": value - pos.cost_cents,
            "realized_pnl_cents": pos.realized_pnl_cents,
        })
    return {"items": items}
