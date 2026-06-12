import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def uid() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(Text)
    display_name: Mapped[str] = mapped_column(String(50))
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    verification_code: Mapped[str | None] = mapped_column(String(6), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    wallet: Mapped["Wallet"] = relationship(back_populates="user", uselist=False)


class Wallet(Base):
    __tablename__ = "wallets"
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), primary_key=True
    )
    balance_cents: Mapped[int] = mapped_column(Integer, default=0)  # available
    locked_cents: Mapped[int] = mapped_column(Integer, default=0)  # pending wdrl
    total_deposits_cents: Mapped[int] = mapped_column(Integer, default=0)
    total_withdrawals_cents: Mapped[int] = mapped_column(Integer, default=0)

    user: Mapped[User] = relationship(back_populates="wallet")


class Withdrawal(Base):
    __tablename__ = "withdrawals"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    amount_cents: Mapped[int] = mapped_column(Integer)  # gross requested
    fee_cents: Mapped[int] = mapped_column(Integer, default=0)
    phone: Mapped[str] = mapped_column(String(15))
    status: Mapped[str] = mapped_column(String(12), default="pending", index=True)
    # pending -> approved -> completed | rejected
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class PlatformRevenue(Base):
    __tablename__ = "platform_revenue"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    source: Mapped[str] = mapped_column(String(20))  # trade_fee | withdrawal_fee
    amount_cents: Mapped[int] = mapped_column(Integer)
    reference: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    action: Mapped[str] = mapped_column(String(60), index=True)
    user_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    metadata_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    type: Mapped[str] = mapped_column(String(20))  # deposit|trade_buy|trade_sell|payout
    amount_cents: Mapped[int] = mapped_column(Integer)  # signed
    status: Mapped[str] = mapped_column(String(20), default="completed")
    lipana_transaction_id: Mapped[str | None] = mapped_column(
        String(64), unique=True, nullable=True
    )
    provider_tx_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    market_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Market(Base):
    __tablename__ = "markets"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)  # slug
    question: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(40), default="Markets")
    kind: Mapped[str] = mapped_column(String(10), default="multi")
    image: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(10), default="open", index=True)
    end_date: Mapped[datetime] = mapped_column(DateTime)
    volume_cents: Mapped[int] = mapped_column(Integer, default=0)
    is_new: Mapped[bool] = mapped_column(Boolean, default=False)
    live_status: Mapped[str | None] = mapped_column(String(10), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    outcomes: Mapped[list["Outcome"]] = relationship(
        back_populates="market", order_by="Outcome.sort"
    )


class Outcome(Base):
    """Each outcome is its own binary YES/NO LMSR pool (Polymarket-style)."""

    __tablename__ = "outcomes"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    market_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("markets.id"), index=True
    )
    label: Mapped[str] = mapped_column(String(80))
    sort: Mapped[int] = mapped_column(Integer, default=0)
    b: Mapped[float] = mapped_column(Float, default=1000.0)
    q_yes: Mapped[float] = mapped_column(Float, default=0.0)
    q_no: Mapped[float] = mapped_column(Float, default=0.0)
    price_yes: Mapped[float] = mapped_column(Float, default=0.5)

    market: Mapped[Market] = relationship(back_populates="outcomes")


class Position(Base):
    __tablename__ = "positions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    outcome_id: Mapped[str] = mapped_column(String(36), ForeignKey("outcomes.id"))
    side: Mapped[str] = mapped_column(String(3))  # YES|NO
    quantity: Mapped[float] = mapped_column(Float, default=0.0)
    cost_cents: Mapped[int] = mapped_column(Integer, default=0)
    realized_pnl_cents: Mapped[int] = mapped_column(Integer, default=0)
    settled: Mapped[bool] = mapped_column(Boolean, default=False)


class Trade(Base):
    __tablename__ = "trades"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    outcome_id: Mapped[str] = mapped_column(String(36), ForeignKey("outcomes.id"))
    side: Mapped[str] = mapped_column(String(3))
    type: Mapped[str] = mapped_column(String(4))  # buy|sell
    quantity: Mapped[float] = mapped_column(Float)
    amount_cents: Mapped[int] = mapped_column(Integer)
    price: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class PricePoint(Base):
    __tablename__ = "price_history"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    outcome_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("outcomes.id"), index=True
    )
    price_yes: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
