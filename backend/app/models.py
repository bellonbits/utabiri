import uuid
from datetime import date, datetime, timezone

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
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
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    action: Mapped[str] = mapped_column(String(60), index=True)
    user_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    metadata_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Comment(Base):
    __tablename__ = "comments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    # legacy column from the prediction-market era; no longer written to
    market_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    insight_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("insights.id"), index=True, nullable=True
    )
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    text: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Follow(Base):
    __tablename__ = "follows"
    follower_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), primary_key=True)
    following_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Interest(Base):
    """A topic tag a user follows for personalized recommendations (e.g. 'maize', 'forex')."""

    __tablename__ = "user_interests"
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), primary_key=True)
    tag: Mapped[str] = mapped_column(String(40), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class CommodityPrice(Base):
    """A single KAMIS market-day price record for one commodity at one market."""

    __tablename__ = "commodity_prices"
    __table_args__ = (
        UniqueConstraint("commodity", "market", "price_date", name="uq_commodity_market_date"),
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    commodity: Mapped[str] = mapped_column(String(80), index=True)
    classification: Mapped[str | None] = mapped_column(String(80), nullable=True)
    grade: Mapped[str | None] = mapped_column(String(40), nullable=True)
    market: Mapped[str] = mapped_column(String(100), index=True)
    county: Mapped[str] = mapped_column(String(40), index=True)
    wholesale_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    retail_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    unit: Mapped[str | None] = mapped_column(String(20), nullable=True)
    supply_volume: Mapped[float | None] = mapped_column(Float, nullable=True)
    price_date: Mapped[date] = mapped_column(Date, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class MacroIndicator(Base):
    """A macroeconomic data point (inflation, CBR, forex rate, NSE index, ...)."""

    __tablename__ = "macro_indicators"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    name: Mapped[str] = mapped_column(String(80), index=True)
    value: Mapped[float] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String(20), default="")
    period: Mapped[str] = mapped_column(String(20))  # e.g. "2026-06" or "2026-06-22"
    source: Mapped[str] = mapped_column(String(20), default="Admin")  # CBK|KNBS|AI|Admin
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)


class Insight(Base):
    """An AI- or admin-generated piece of economic commentary, forecast, or recommendation."""

    __tablename__ = "insights"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    kind: Mapped[str] = mapped_column(String(20), index=True)  # commentary|forecast|recommendation
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(40), index=True, default="Macro")
    related_commodity: Mapped[str | None] = mapped_column(String(80), nullable=True)
    related_indicator: Mapped[str | None] = mapped_column(String(80), nullable=True)
    sentiment: Mapped[str | None] = mapped_column(String(10), nullable=True)  # bullish|bearish|neutral
    sources: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON list
    generated_by: Mapped[str] = mapped_column(String(10), default="ai")  # ai|admin
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)


class EconomicBriefing(Base):
    """One AI-generated daily 'Chief Economist' report. All structured
    sections are stored as JSON text — the schema is intentionally flexible
    since it mirrors a long-form report rather than a relational entity."""

    __tablename__ = "economic_briefings"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    briefing_date: Mapped[date] = mapped_column(Date, unique=True, index=True)
    health_score: Mapped[int] = mapped_column(Integer)
    previous_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    score_trend: Mapped[str] = mapped_column(String(10), default="flat")  # up|down|flat
    executive_summary: Mapped[str] = mapped_column(Text, default="")
    key_drivers: Mapped[str] = mapped_column(Text, default="[]")  # JSON list[str]
    country_comparison: Mapped[str] = mapped_column(Text, default="[]")  # JSON list[dict]
    kenya_strengths: Mapped[str] = mapped_column(Text, default="[]")  # JSON list[str]
    kenya_weaknesses: Mapped[str] = mapped_column(Text, default="[]")  # JSON list[str]
    sector_impacts: Mapped[str] = mapped_column(Text, default="[]")  # JSON list[dict]
    personal_finance: Mapped[str] = mapped_column(Text, default="{}")  # JSON dict
    investment_ideas: Mapped[str] = mapped_column(Text, default="{}")  # JSON dict
    austrian_view: Mapped[str] = mapped_column(Text, default="")
    classical_view: Mapped[str] = mapped_column(Text, default="")
    government_recommendations: Mapped[str] = mapped_column(Text, default="[]")  # JSON list[str]
    business_recommendations: Mapped[str] = mapped_column(Text, default="[]")  # JSON list[str]
    household_recommendations: Mapped[str] = mapped_column(Text, default="[]")  # JSON list[str]
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)


class BillAnalysis(Base):
    """An AI clause-by-clause breakdown of a Finance Bill (or similar), run
    on-demand by an admin since the source PDF only changes occasionally."""

    __tablename__ = "bill_analyses"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    title: Mapped[str] = mapped_column(String(200))
    source_url: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(12), default="processing", index=True)  # processing|done|failed
    overall_summary: Mapped[str] = mapped_column(Text, default="")
    clauses: Mapped[str] = mapped_column(Text, default="[]")  # JSON list[dict]
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)


# ============================================================================
# Utabiri Bet (Sportsbook, Wallet, Bets, Predictions & Responsible Gaming)
# ============================================================================

class Wallet(Base):
    __tablename__ = "wallets"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), unique=True, index=True)
    coins_balance: Mapped[float] = mapped_column(Float, default=1000.0)
    real_balance: Mapped[float] = mapped_column(Float, default=0.0)
    currency: Mapped[str] = mapped_column(String(10), default="COINS")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Transaction(Base):
    __tablename__ = "wallet_transactions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    wallet_id: Mapped[str] = mapped_column(String(36), ForeignKey("wallets.id"), index=True)
    type: Mapped[str] = mapped_column(String(24), index=True)  # deposit|withdrawal|bet_stake|bet_win|cashout|refund|daily_bonus
    amount: Mapped[float] = mapped_column(Float)
    balance_after: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(10), default="COINS")
    reference: Mapped[str] = mapped_column(String(64), index=True, default="")
    status: Mapped[str] = mapped_column(String(16), default="completed")  # completed|pending|failed
    description: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)


class Sport(Base):
    __tablename__ = "sports"
    id: Mapped[str] = mapped_column(String(32), primary_key=True)  # football, basketball, tennis, rugby, cricket, virtuals
    name: Mapped[str] = mapped_column(String(50))
    slug: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Category(Base):
    """Country / Region grouping, e.g. England, Kenya, Spain, International."""
    __tablename__ = "sports_categories"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    sport_id: Mapped[str] = mapped_column(String(32), ForeignKey("sports.id"), index=True)
    name: Mapped[str] = mapped_column(String(60))
    country_code: Mapped[str | None] = mapped_column(String(4), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)


class Tournament(Base):
    """League / Competition, e.g. Premier League, FKF Premier League, Champions League."""
    __tablename__ = "sports_tournaments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    category_id: Mapped[str] = mapped_column(String(36), ForeignKey("sports_categories.id"), index=True)
    sport_id: Mapped[str] = mapped_column(String(32), ForeignKey("sports.id"), index=True)
    name: Mapped[str] = mapped_column(String(100), index=True)
    slug: Mapped[str] = mapped_column(String(100), index=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)


class Match(Base):
    __tablename__ = "sports_matches"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    tournament_id: Mapped[str] = mapped_column(String(36), ForeignKey("sports_tournaments.id"), index=True)
    sport_id: Mapped[str] = mapped_column(String(32), ForeignKey("sports.id"), index=True)
    home_team: Mapped[str] = mapped_column(String(80), index=True)
    away_team: Mapped[str] = mapped_column(String(80), index=True)
    start_time: Mapped[datetime] = mapped_column(DateTime, index=True)
    status: Mapped[str] = mapped_column(String(16), default="upcoming", index=True)  # upcoming|live|finished|postponed
    minute: Mapped[int | None] = mapped_column(Integer, nullable=True)
    home_score: Mapped[int] = mapped_column(Integer, default=0)
    away_score: Mapped[int] = mapped_column(Integer, default=0)
    is_suspended: Mapped[bool] = mapped_column(Boolean, default=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Market(Base):
    __tablename__ = "sports_markets"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    match_id: Mapped[str] = mapped_column(String(36), ForeignKey("sports_matches.id"), index=True)
    name: Mapped[str] = mapped_column(String(60), index=True)  # 1X2, Over/Under 2.5, BTTS, Double Chance, Draw No Bet
    market_type: Mapped[str] = mapped_column(String(32), default="1x2")
    is_suspended: Mapped[bool] = mapped_column(Boolean, default=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0)


class Outcome(Base):
    __tablename__ = "sports_outcomes"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    market_id: Mapped[str] = mapped_column(String(36), ForeignKey("sports_markets.id"), index=True)
    match_id: Mapped[str] = mapped_column(String(36), ForeignKey("sports_matches.id"), index=True)
    name: Mapped[str] = mapped_column(String(60))  # 1, X, 2, Over 2.5, Under 2.5, Yes, No
    odds: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(12), default="active")  # active|won|lost|void


class Bet(Base):
    __tablename__ = "bets"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    bet_type: Mapped[str] = mapped_column(String(16), default="single")  # single|multiple|system
    stake: Mapped[float] = mapped_column(Float)
    total_odds: Mapped[float] = mapped_column(Float)
    bonus_rate: Mapped[float] = mapped_column(Float, default=0.0)  # accumulator bonus percentage
    potential_payout: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(16), default="open", index=True)  # open|won|lost|cashed_out|void
    cashout_quote: Mapped[float | None] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="COINS")
    booked_code: Mapped[str | None] = mapped_column(String(16), nullable=True, index=True)
    placed_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    settled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class BetLeg(Base):
    __tablename__ = "bet_legs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    bet_id: Mapped[str] = mapped_column(String(36), ForeignKey("bets.id"), index=True)
    match_id: Mapped[str] = mapped_column(String(36), ForeignKey("sports_matches.id"), index=True)
    market_id: Mapped[str] = mapped_column(String(36), ForeignKey("sports_markets.id"))
    outcome_id: Mapped[str] = mapped_column(String(36), ForeignKey("sports_outcomes.id"))
    match_title: Mapped[str] = mapped_column(String(180))
    market_name: Mapped[str] = mapped_column(String(60))
    outcome_name: Mapped[str] = mapped_column(String(60))
    odds_at_placement: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(12), default="open")  # open|won|lost|void


class BookedBet(Base):
    __tablename__ = "booked_bets"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    code: Mapped[str] = mapped_column(String(16), unique=True, index=True)
    selections_json: Mapped[str] = mapped_column(Text)  # JSON list of legs
    stake: Mapped[float] = mapped_column(Float, default=100.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)


class SportsPrediction(Base):
    __tablename__ = "sports_predictions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    match_id: Mapped[str] = mapped_column(String(36), ForeignKey("sports_matches.id"), unique=True, index=True)
    model_version: Mapped[str] = mapped_column(String(20), default="poisson-elo-v2.1")
    home_win_prob: Mapped[float] = mapped_column(Float)
    draw_prob: Mapped[float] = mapped_column(Float)
    away_win_prob: Mapped[float] = mapped_column(Float)
    expected_home_goals: Mapped[float] = mapped_column(Float)
    expected_away_goals: Mapped[float] = mapped_column(Float)
    most_likely_score: Mapped[str] = mapped_column(String(12))  # e.g. "2-1"
    value_pick: Mapped[str | None] = mapped_column(String(24), nullable=True)  # e.g. "Home Win", "Over 2.5"
    value_edge_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence_pct: Mapped[float] = mapped_column(Float)
    backtest_accuracy: Mapped[float] = mapped_column(Float, default=68.4)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class UserResponsibleGaming(Base):
    __tablename__ = "user_responsible_gaming"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), unique=True, index=True)
    daily_deposit_limit: Mapped[float | None] = mapped_column(Float, nullable=True)
    daily_loss_limit: Mapped[float | None] = mapped_column(Float, nullable=True)
    session_time_limit_mins: Mapped[int | None] = mapped_column(Integer, nullable=True)
    self_exclusion_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

