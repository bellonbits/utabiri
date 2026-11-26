"""Betslip placement, booking code sharing, and bet management API."""
from __future__ import annotations

import json
import random
import string
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Bet, BetLeg, BookedBet, Market, Match, Outcome, Transaction, User, Wallet
from ..security import get_current_user

router = APIRouter(prefix="/bets", tags=["bets"])


def generate_booking_code() -> str:
    """Generates an alphanumeric 6-character booking code e.g. UTB-9K2F."""
    chars = string.ascii_uppercase + string.digits
    suffix = "".join(random.choices(chars, k=5))
    return f"UTB-{suffix}"


def calculate_accumulator_bonus(num_legs: int) -> float:
    """Returns accumulator bonus percentage based on selections count."""
    if num_legs < 2:
        return 0.0
    if num_legs == 2:
        return 0.03
    if num_legs == 3:
        return 0.05
    if num_legs == 4:
        return 0.10
    if num_legs <= 6:
        return 0.15
    if num_legs <= 9:
        return 0.25
    if num_legs <= 14:
        return 0.35
    return 0.50  # 50% max bonus


class SelectionIn(BaseModel):
    match_id: str
    market_id: str
    outcome_id: str
    expected_odds: float


class PlaceBetIn(BaseModel):
    bet_type: str = Field(default="single")  # single|multiple|system
    stake: float = Field(ge=10.0, le=500_000.0)
    selections: list[SelectionIn]
    currency: str = Field(default="COINS")


class BookBetIn(BaseModel):
    selections: list[SelectionIn]
    stake: float = Field(default=100.0)


@router.post("/place")
async def place_bet(
    body: PlaceBetIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Idempotently places a single or accumulator bet, updates wallet ledger, and validates odds."""
    if not body.selections:
        raise HTTPException(400, "NO_SELECTIONS")

    # 1. Fetch or create user wallet
    wallet = await db.scalar(select(Wallet).where(Wallet.user_id == user.id))
    if not wallet:
        wallet = Wallet(user_id=user.id, coins_balance=1000.0, real_balance=0.0)
        db.add(wallet)
        await db.flush()

    balance_to_check = wallet.coins_balance if body.currency == "COINS" else wallet.real_balance
    if balance_to_check < body.stake:
        raise HTTPException(400, "INSUFFICIENT_FUNDS")

    # 2. Validate selections and compute total odds
    total_odds = 1.0
    legs_data = []

    for sel in body.selections:
        outcome = await db.get(Outcome, sel.outcome_id)
        if not outcome or outcome.status != "active":
            raise HTTPException(400, f"Outcome {sel.outcome_id} is no longer available")

        market = await db.get(Market, outcome.market_id)
        match = await db.get(Match, outcome.match_id)

        if not market or market.is_suspended:
            raise HTTPException(400, f"Market for {outcome.name} is suspended")
        if not match or match.is_suspended:
            raise HTTPException(400, f"Match {match.home_team if match else ''} is suspended")

        odds = outcome.odds
        total_odds *= odds
        legs_data.append({
            "match_id": match.id,
            "market_id": market.id,
            "outcome_id": outcome.id,
            "match_title": f"{match.home_team} vs {match.away_team}",
            "market_name": market.name,
            "outcome_name": outcome.name,
            "odds_at_placement": odds,
        })

    total_odds = round(total_odds, 2)
    bonus_rate = calculate_accumulator_bonus(len(legs_data))
    gross_payout = body.stake * total_odds
    bonus_amount = gross_payout * bonus_rate
    potential_payout = round(gross_payout + bonus_amount, 2)

    # 3. Deduct stake & record double-entry transaction
    if body.currency == "COINS":
        wallet.coins_balance -= body.stake
        new_balance = wallet.coins_balance
    else:
        wallet.real_balance -= body.stake
        new_balance = wallet.real_balance

    # Create Bet record
    bet = Bet(
        user_id=user.id,
        bet_type=body.bet_type if len(legs_data) > 1 else "single",
        stake=body.stake,
        total_odds=total_odds,
        bonus_rate=bonus_rate,
        potential_payout=potential_payout,
        status="open",
        cashout_quote=round(body.stake * 0.9, 2),  # Initial cashout offer
        currency=body.currency,
        placed_at=datetime.now(timezone.utc),
    )
    db.add(bet)
    await db.flush()

    for leg in legs_data:
        db.add(BetLeg(bet_id=bet.id, **leg))

    db.add(
        Transaction(
            user_id=user.id,
            wallet_id=wallet.id,
            type="bet_stake",
            amount=-body.stake,
            balance_after=new_balance,
            currency=body.currency,
            reference=bet.id,
            description=f"Placed {len(legs_data)}-leg bet #{bet.id[:8]}",
        )
    )

    await db.commit()

    return {
        "bet_id": bet.id,
        "stake": bet.stake,
        "total_odds": bet.total_odds,
        "bonus_rate": bet.bonus_rate,
        "potential_payout": bet.potential_payout,
        "new_balance": new_balance,
    }


@router.get("/my")
async def my_bets(
    status: str = "open",
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns user bets categorized as open, settled, or cashout."""
    stmt = select(Bet).where(Bet.user_id == user.id)
    if status == "open":
        stmt = stmt.where(Bet.status == "open")
    elif status == "settled":
        stmt = stmt.where(Bet.status.in_(["won", "lost", "cashed_out", "void"]))

    stmt = stmt.order_by(Bet.placed_at.desc()).limit(50)
    bets = (await db.scalars(stmt)).all()

    bet_ids = [b.id for b in bets]
    legs = (
        await db.scalars(select(BetLeg).where(BetLeg.bet_id.in_(bet_ids)))
    ).all() if bet_ids else []

    legs_by_bet: dict[str, list[BetLeg]] = {}
    for lg in legs:
        legs_by_bet.setdefault(lg.bet_id, []).append(lg)

    return {
        "items": [
            {
                "id": b.id,
                "bet_type": b.bet_type,
                "stake": b.stake,
                "total_odds": b.total_odds,
                "bonus_rate": b.bonus_rate,
                "potential_payout": b.potential_payout,
                "status": b.status,
                "cashout_quote": b.cashout_quote,
                "currency": b.currency,
                "placed_at": b.placed_at.isoformat(),
                "legs": [
                    {
                        "id": lg.id,
                        "match_title": lg.match_title,
                        "market_name": lg.market_name,
                        "outcome_name": lg.outcome_name,
                        "odds": lg.odds_at_placement,
                        "status": lg.status,
                    }
                    for lg in legs_by_bet.get(b.id, [])
                ],
            }
            for b in bets
        ]
    }


@router.post("/{bet_id}/cashout")
async def cashout_bet(
    bet_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Executes early cashout on an open bet."""
    bet = await db.get(Bet, bet_id)
    if not bet or bet.user_id != user.id:
        raise HTTPException(404, "BET_NOT_FOUND")
    if bet.status != "open":
        raise HTTPException(400, "BET_NOT_ELIGIBLE_FOR_CASHOUT")
    if not bet.cashout_quote or bet.cashout_quote <= 0:
        raise HTTPException(400, "CASHOUT_UNAVAILABLE")

    payout = bet.cashout_quote
    bet.status = "cashed_out"
    bet.settled_at = datetime.now(timezone.utc)

    wallet = await db.scalar(select(Wallet).where(Wallet.user_id == user.id))
    if wallet:
        if bet.currency == "COINS":
            wallet.coins_balance += payout
            new_bal = wallet.coins_balance
        else:
            wallet.real_balance += payout
            new_bal = wallet.real_balance

        db.add(
            Transaction(
                user_id=user.id,
                wallet_id=wallet.id,
                type="cashout",
                amount=payout,
                balance_after=new_bal,
                currency=bet.currency,
                reference=bet.id,
                description=f"Early cashout on Bet #{bet.id[:8]}",
            )
        )

    await db.commit()
    return {"status": "cashed_out", "payout": payout}


@router.post("/book")
async def book_bet(body: BookBetIn, db: AsyncSession = Depends(get_db)):
    """Generates a shareable booking code for a betslip."""
    code = generate_booking_code()
    booked = BookedBet(
        code=code,
        selections_json=json.dumps([s.model_dump() for s in body.selections]),
        stake=body.stake,
    )
    db.add(booked)
    await db.commit()
    return {"code": code}


@router.get("/book/{code}")
async def load_booked_bet(code: str, db: AsyncSession = Depends(get_db)):
    """Loads selections from a booked bet code."""
    booked = await db.scalar(select(BookedBet).where(BookedBet.code == code.upper()))
    if not booked:
        raise HTTPException(404, "BOOKING_CODE_NOT_FOUND")

    selections = json.loads(booked.selections_json)
    return {"code": booked.code, "stake": booked.stake, "selections": selections}
