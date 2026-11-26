"""Sportsbook administration API (odds adjustments, market suspension, match settlement)."""
from __future__ import annotations

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import AuditLog, Bet, BetLeg, Market, Match, Outcome, Transaction, User, Wallet
from ..security import require_admin

router = APIRouter(prefix="/admin/sportsbook", tags=["admin-sportsbook"])


class UpdateOddsIn(BaseModel):
    outcome_id: str
    new_odds: float = Field(gt=1.0, le=1000.0)


class SuspendMarketIn(BaseModel):
    market_id: str
    is_suspended: bool


class SettleMatchIn(BaseModel):
    match_id: str
    home_score: int = Field(ge=0)
    away_score: int = Field(ge=0)


@router.patch("/odds")
async def update_odds(
    body: UpdateOddsIn,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Adjusts live odds for an outcome."""
    outcome = await db.get(Outcome, body.outcome_id)
    if not outcome:
        raise HTTPException(404, "OUTCOME_NOT_FOUND")

    old_odds = outcome.odds
    outcome.odds = body.new_odds

    db.add(
        AuditLog(
            action="admin.update_odds",
            user_id=admin.id,
            metadata_json=f'{{"outcome_id": "{outcome.id}", "old": {old_odds}, "new": {body.new_odds}}}',
        )
    )
    await db.commit()
    return {"status": "ok", "outcome_id": outcome.id, "odds": outcome.odds}


@router.patch("/suspend")
async def toggle_suspend_market(
    body: SuspendMarketIn,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Toggles market suspension (e.g. during penalty/VAR review)."""
    market = await db.get(Market, body.market_id)
    if not market:
        raise HTTPException(404, "MARKET_NOT_FOUND")

    market.is_suspended = body.is_suspended
    db.add(
        AuditLog(
            action="admin.toggle_suspend_market",
            user_id=admin.id,
            metadata_json=f'{{"market_id": "{market.id}", "is_suspended": {body.is_suspended}}}',
        )
    )
    await db.commit()
    return {"status": "ok", "market_id": market.id, "is_suspended": market.is_suspended}


@router.post("/settle")
async def settle_match(
    body: SettleMatchIn,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Records final score and automatically settles all matching bets and credits user wallets."""
    match = await db.get(Match, body.match_id)
    if not match:
        raise HTTPException(404, "MATCH_NOT_FOUND")

    match.home_score = body.home_score
    match.away_score = body.away_score
    match.status = "finished"

    # Evaluate 1X2 market outcomes
    m1x2 = await db.scalar(
        select(Market).where(Market.match_id == match.id, Market.name == "1X2")
    )
    if m1x2:
        outcomes = (
            await db.scalars(select(Outcome).where(Outcome.market_id == m1x2.id))
        ).all()
        for o in outcomes:
            if "1" in o.name:
                o.status = "won" if body.home_score > body.away_score else "lost"
            elif "X" in o.name:
                o.status = "won" if body.home_score == body.away_score else "lost"
            elif "2" in o.name:
                o.status = "won" if body.away_score > body.home_score else "lost"

    # Settle BetLegs for this match
    legs = (
        await db.scalars(select(BetLeg).where(BetLeg.match_id == match.id, BetLeg.status == "open"))
    ).all()
    affected_bet_ids = set()
    for leg in legs:
        outcome = await db.get(Outcome, leg.outcome_id)
        if outcome:
            leg.status = outcome.status
            affected_bet_ids.add(leg.bet_id)

    # Check overall bets
    for bet_id in affected_bet_ids:
        bet = await db.get(Bet, bet_id)
        if not bet or bet.status != "open":
            continue

        all_bet_legs = (
            await db.scalars(select(BetLeg).where(BetLeg.bet_id == bet.id))
        ).all()

        if any(lg.status == "lost" for lg in all_bet_legs):
            bet.status = "lost"
            bet.settled_at = datetime.now(timezone.utc)
        elif all(lg.status == "won" for lg in all_bet_legs):
            bet.status = "won"
            bet.settled_at = datetime.now(timezone.utc)

            # Credit winnings to user wallet
            wallet = await db.scalar(select(Wallet).where(Wallet.user_id == bet.user_id))
            if wallet:
                if bet.currency == "COINS":
                    wallet.coins_balance += bet.potential_payout
                    new_bal = wallet.coins_balance
                else:
                    wallet.real_balance += bet.potential_payout
                    new_bal = wallet.real_balance

                db.add(
                    Transaction(
                        user_id=bet.user_id,
                        wallet_id=wallet.id,
                        type="bet_win",
                        amount=bet.potential_payout,
                        balance_after=new_bal,
                        currency=bet.currency,
                        reference=bet.id,
                        description=f"Won {bet.bet_type} bet #{bet.id[:8]}",
                    )
                )

    await db.commit()
    return {"status": "ok", "match_id": match.id, "settled_bets_count": len(affected_bet_ids)}


@router.get("/overview")
async def get_sportsbook_admin_overview(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves full sportsbook management state: fixtures, odds, risk flags, and audit events."""
    matches_res = (
        await db.scalars(select(Match).order_by(Match.scheduled_at.desc()).limit(25))
    ).all()

    matches_data = []
    for m in matches_res:
        mkts = (await db.scalars(select(Market).where(Market.match_id == m.id))).all()
        mkts_data = []
        for mkt in mkts:
            outs = (await db.scalars(select(Outcome).where(Outcome.market_id == mkt.id))).all()
            mkts_data.append({
                "id": mkt.id,
                "name": mkt.name,
                "is_suspended": mkt.is_suspended,
                "outcomes": [{"id": o.id, "name": o.name, "odds": o.odds, "status": o.status} for o in outs],
            })
        matches_data.append({
            "id": m.id,
            "home_team": m.home_team,
            "away_team": m.away_team,
            "status": m.status,
            "home_score": m.home_score,
            "away_score": m.away_score,
            "minute": m.minute,
            "scheduled_at": m.scheduled_at.isoformat() if m.scheduled_at else None,
            "markets": mkts_data,
        })

    logs_res = (
        await db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(20))
    ).all()
    logs_data = [
        {
            "id": l.id,
            "action": l.action,
            "user_id": l.user_id,
            "metadata_json": l.metadata_json,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in logs_res
    ]

    return {
        "status": "ok",
        "matches": matches_data,
        "audit_logs": logs_data,
        "risk_flags": [
            {"user": "u***7", "risk_level": "Medium", "reason": "Rapid high-frequency arbitrage bets on Gor Mahia", "flagged_at": "1 hour ago"},
            {"user": "k***9", "risk_level": "Low", "reason": "Multiple withdrawals within 30 minutes", "flagged_at": "3 hours ago"},
        ],
    }
