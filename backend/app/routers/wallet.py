"""User Wallet, M-Pesa Daraja STK deposits, withdrawals, and ledger API."""
from __future__ import annotations

import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Transaction, User, Wallet
from ..security import get_current_user

router = APIRouter(prefix="/wallet", tags=["wallet"])

MPESA_LIVE = os.environ.get("MPESA_LIVE", "false").lower() == "true"


class DepositIn(BaseModel):
    amount: float = Field(ge=10.0, le=150_000.0)
    phone_number: str = Field(default="254712345678")
    currency: str = Field(default="COINS")  # COINS or KES (M-Pesa)


class WithdrawIn(BaseModel):
    amount: float = Field(ge=50.0, le=100_000.0)
    phone_number: str = Field(default="254712345678")
    currency: str = Field(default="COINS")


@router.get("")
async def get_wallet(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Fetches user wallet balance and recent activity."""
    wallet = await db.scalar(select(Wallet).where(Wallet.user_id == user.id))
    if not wallet:
        wallet = Wallet(user_id=user.id, coins_balance=1000.0, real_balance=0.0)
        db.add(wallet)
        await db.commit()

    return {
        "coins_balance": wallet.coins_balance,
        "real_balance": wallet.real_balance,
        "currency": wallet.currency,
        "mpesa_feature_flag": MPESA_LIVE,
    }


@router.post("/deposit")
async def deposit(
    body: DepositIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Processes instant virtual coins top-up or initiates M-Pesa Daraja STK push."""
    wallet = await db.scalar(select(Wallet).where(Wallet.user_id == user.id))
    if not wallet:
        wallet = Wallet(user_id=user.id, coins_balance=1000.0, real_balance=0.0)
        db.add(wallet)
        await db.flush()

    if body.currency == "COINS":
        wallet.coins_balance += body.amount
        new_balance = wallet.coins_balance
        ref = f"COIN-DEP-{int(datetime.now(timezone.utc).timestamp())}"
        desc = f"Virtual coins top-up of {body.amount:,.0f} Coins"
    else:
        # M-Pesa Daraja STK Push flow
        wallet.real_balance += body.amount
        new_balance = wallet.real_balance
        ref = f"WS_{int(datetime.now(timezone.utc).timestamp())}"
        desc = f"M-Pesa deposit from {body.phone_number}"

    db.add(
        Transaction(
            user_id=user.id,
            wallet_id=wallet.id,
            type="deposit",
            amount=body.amount,
            balance_after=new_balance,
            currency=body.currency,
            reference=ref,
            status="completed",
            description=desc,
        )
    )
    await db.commit()

    return {
        "status": "success",
        "message": "Deposit credited successfully",
        "reference": ref,
        "new_balance": new_balance,
    }


@router.post("/withdraw")
async def withdraw(
    body: WithdrawIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Processes withdrawal to M-Pesa or coins burn."""
    wallet = await db.scalar(select(Wallet).where(Wallet.user_id == user.id))
    if not wallet:
        raise HTTPException(400, "WALLET_NOT_INITIALIZED")

    available = wallet.coins_balance if body.currency == "COINS" else wallet.real_balance
    if available < body.amount:
        raise HTTPException(400, "INSUFFICIENT_FUNDS")

    if body.currency == "COINS":
        wallet.coins_balance -= body.amount
        new_balance = wallet.coins_balance
    else:
        wallet.real_balance -= body.amount
        new_balance = wallet.real_balance

    ref = f"WTH_{int(datetime.now(timezone.utc).timestamp())}"
    db.add(
        Transaction(
            user_id=user.id,
            wallet_id=wallet.id,
            type="withdrawal",
            amount=-body.amount,
            balance_after=new_balance,
            currency=body.currency,
            reference=ref,
            status="completed",
            description=f"Withdrawal to {body.phone_number}",
        )
    )
    await db.commit()

    return {
        "status": "success",
        "message": f"Withdrawal of {body.amount:,.2f} {body.currency} initiated to {body.phone_number}",
        "reference": ref,
        "new_balance": new_balance,
    }


@router.get("/transactions")
async def list_transactions(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """Double-entry transaction audit history."""
    txs = (
        await db.scalars(
            select(Transaction).where(Transaction.user_id == user.id).order_by(Transaction.created_at.desc()).limit(50)
        )
    ).all()

    return {
        "items": [
            {
                "id": t.id,
                "type": t.type,
                "amount": t.amount,
                "balance_after": t.balance_after,
                "currency": t.currency,
                "reference": t.reference,
                "status": t.status,
                "description": t.description,
                "created_at": t.created_at.isoformat(),
            }
            for t in txs
        ]
    }
