import hashlib
import hmac
import json
import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import payments
from ..database import get_db
from ..models import (
    AuditLog,
    PlatformRevenue,
    User,
    Wallet,
    WalletTransaction,
    Withdrawal,
)
from ..security import get_current_user

router = APIRouter(tags=["wallet"])

LIPANA_WEBHOOK_SECRET = os.environ.get("LIPANA_WEBHOOK_SECRET", "")
# Without Lipana credentials we run in dev mode: deposits credit instantly
# so the full trade loop is testable locally.
DEV_INSTANT_DEPOSITS = not payments.LIVE

MIN_WITHDRAWAL_CENTS = 10_000  # KES 100
WITHDRAWAL_FEE_PCT = 0.01  # configurable by admin later


class DepositIn(BaseModel):
    amount_cents: int = Field(ge=1_000, le=15_000_000)  # KES 10 .. 150k
    phone: str = Field(default="", max_length=15)


class WithdrawIn(BaseModel):
    amount_cents: int = Field(ge=MIN_WITHDRAWAL_CENTS)
    phone: str = Field(min_length=10, max_length=15)


async def get_wallet(db: AsyncSession, user_id: str) -> Wallet:
    w = await db.get(Wallet, user_id)
    if w is None:
        raise HTTPException(500, "wallet missing")
    return w


@router.get("/wallet")
async def wallet(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    w = await get_wallet(db, user.id)
    return {
        "balance_cents": w.balance_cents,
        "locked_cents": w.locked_cents,
        "total_deposits_cents": w.total_deposits_cents,
        "total_withdrawals_cents": w.total_withdrawals_cents,
        "currency": "KES",
    }


@router.post("/wallet/deposit")
async def deposit(
    body: DepositIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tx = WalletTransaction(
        user_id=user.id,
        type="deposit",
        amount_cents=body.amount_cents,
        status="pending",
    )
    db.add(tx)

    if DEV_INSTANT_DEPOSITS:
        # simulate the Lipana webhook landing immediately
        w = await get_wallet(db, user.id)
        w.balance_cents += body.amount_cents
        w.total_deposits_cents += body.amount_cents
        tx.status = "completed"
        tx.lipana_transaction_id = f"DEV{uuid.uuid4().hex[:10].upper()}"
        db.add(AuditLog(action="wallet.deposit_credited", user_id=user.id,
                        metadata_json=json.dumps({"cents": body.amount_cents})))
        await db.commit()
        return {"transaction_id": tx.id, "status": "completed",
                "new_balance_cents": w.balance_cents, "mode": "dev_instant"}

    # live path: M-Pesa STK push via Lipana; webhook or polling completes it
    if not body.phone or len(body.phone) < 10:
        raise HTTPException(400, "PHONE_REQUIRED")
    await db.flush()
    try:
        data = await payments.stk_push(
            amount_kes=body.amount_cents // 100,
            phone=body.phone,
            reference=tx.id,
        )
    except payments.LipanaError as e:
        tx.status = "failed"
        await db.commit()
        raise HTTPException(502, f"LIPANA: {e}")
    tx.provider_tx_id = payments.tx_id_of(data)
    db.add(AuditLog(action="wallet.stk_initiated", user_id=user.id,
                    metadata_json=json.dumps({"tx": tx.id, "cents": body.amount_cents})))
    await db.commit()
    return {"transaction_id": tx.id, "status": "pending", "mode": "stk_push",
            "message": "Check your phone and enter your M-Pesa PIN"}


async def _credit_deposit(db: AsyncSession, tx: WalletTransaction,
                          receipt: str | None) -> None:
    """Idempotent: unique index on lipana_transaction_id is the hard stop."""
    if tx.status == "completed":
        return
    w = await get_wallet(db, tx.user_id)
    w.balance_cents += tx.amount_cents
    w.total_deposits_cents += tx.amount_cents
    tx.status = "completed"
    tx.lipana_transaction_id = receipt or f"LIP-{tx.id[:12]}"
    db.add(AuditLog(action="wallet.deposit_credited", user_id=tx.user_id,
                    metadata_json=json.dumps({"cents": tx.amount_cents})))


@router.post("/wallet/transactions/{tx_id}/check")
async def check_deposit(
    tx_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Poll fallback for environments where the webhook can't reach us."""
    tx = await db.get(WalletTransaction, tx_id)
    if tx is None or tx.user_id != user.id or tx.type != "deposit":
        raise HTTPException(404, "NOT_FOUND")
    if tx.status == "pending" and tx.provider_tx_id and payments.LIVE:
        data = await payments.get_transaction(tx.provider_tx_id)
        if data and payments.is_paid(data):
            await _credit_deposit(db, tx, payments.receipt_of(data))
            await db.commit()
        elif data and str(data.get("status", "")).lower() in {"failed", "cancelled"}:
            tx.status = "failed"
            await db.commit()
    return {"transaction_id": tx.id, "status": tx.status}


@router.get("/wallet/transactions")
async def transactions(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    rows = (
        await db.scalars(
            select(WalletTransaction)
            .where(WalletTransaction.user_id == user.id)
            .order_by(WalletTransaction.created_at.desc())
            .limit(50)
        )
    ).all()
    return {
        "items": [
            {
                "id": t.id,
                "type": t.type,
                "amount_cents": t.amount_cents,
                "status": t.status,
                "market_id": t.market_id,
                "created_at": t.created_at.isoformat(),
            }
            for t in rows
        ]
    }


@router.post("/wallet/withdraw")
async def withdraw(
    body: WithdrawIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    w = await get_wallet(db, user.id)
    if w.balance_cents < body.amount_cents:
        raise HTTPException(400, "INSUFFICIENT_BALANCE")

    fee = int(body.amount_cents * WITHDRAWAL_FEE_PCT)
    # move to locked until admin approves
    w.balance_cents -= body.amount_cents
    w.locked_cents += body.amount_cents
    wd = Withdrawal(
        user_id=user.id, amount_cents=body.amount_cents, fee_cents=fee,
        phone=body.phone,
    )
    db.add(wd)
    db.add(AuditLog(action="wallet.withdrawal_requested", user_id=user.id,
                    metadata_json=json.dumps({"cents": body.amount_cents})))
    await db.commit()
    return {
        "withdrawal_id": wd.id,
        "status": "pending",
        "fee_cents": fee,
        "payout_cents": body.amount_cents - fee,
        "available_cents": w.balance_cents,
        "locked_cents": w.locked_cents,
    }


@router.post("/webhooks/lipana")
async def lipana_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    raw = await request.body()
    sig = request.headers.get("X-Lipana-Signature", "")
    expected = hmac.new(
        LIPANA_WEBHOOK_SECRET.encode(), raw, hashlib.sha256
    ).hexdigest()
    if not LIPANA_WEBHOOK_SECRET or not hmac.compare_digest(sig, expected):
        raise HTTPException(400, "invalid signature")

    payload = json.loads(raw)
    event = payload.get("event", "")
    # Lipana sends transaction.success/.failed (payment.* kept for compat)
    if event not in {"transaction.success", "payment.success",
                     "transaction.failed", "payment.failed"}:
        return {"status": "ignored"}

    data = payload.get("data", payload)
    ref = data.get("reference") or data.get("metadata", {}).get("reference", "")
    tx = await db.get(WalletTransaction, ref)
    if tx is None:
        raise HTTPException(400, "unknown reference")

    if event.endswith(".failed"):
        if tx.status == "pending":
            tx.status = "failed"
            await db.commit()
        return {"status": "ok"}

    amount_kes = data.get("amount")
    if amount_kes is not None and int(float(amount_kes)) != tx.amount_cents // 100:
        raise HTTPException(400, "amount mismatch")

    await _credit_deposit(db, tx, payments.receipt_of(data))
    await db.commit()
    return {"status": "ok"}
