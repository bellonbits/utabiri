import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select

from . import engine as lmsr
from .database import Base, SessionFactory, engine
from .models import Market, Outcome, PricePoint, User, Wallet
from .routers import admin, auth, markets, trading, trends, wallet
from .security import hash_password

# Mirrors frontend/lib/data.ts so both layers show the same markets.
SEED_MARKETS = [
    ("afcon-winner", "AFCON 2027 Winner", "Football", "multi",
     [("Senegal", 0.21), ("Morocco", 0.18), ("Kenya", 0.06)]),
    ("finance-bill", "Finance Bill signed into law by July 31?", "Politics",
     "binary", [("Yes", 0.60)]),
    ("mashemeji-derby", "Mashemeji Derby", "FKF PL", "matchup",
     [("Gor Mahia", 0.55), ("AFC Leopards", 0.46)]),
    ("harambee-stars", "Harambee Stars qualify for AFCON 2027 by...?",
     "Football", "multi", [("Matchday 5", 0.38), ("Matchday 6", 0.62)]),
    ("cbk-rate", "CBK rate decision in August?", "Economy", "multi",
     [("Cut 50+ bps", 0.08), ("Cut 25 bps", 0.47), ("Hold", 0.41)]),
    ("btc-price", "What price will Bitcoin hit in June?", "Crypto", "multi",
     [("$120,000", 0.88), ("$150,000", 0.76), ("$200,000", 0.24)]),
    ("digital-tax", "Digital content tax passed before May 2027?", "Politics",
     "binary", [("Yes", 0.59)]),
    ("kipchoge", "Kipchoge podium at Berlin Marathon?", "Athletics",
     "binary", [("Yes", 0.71)]),
    ("maize", "Maize flour below KES 130 by October?", "Economy",
     "binary", [("Yes", 0.33)]),
    ("eurobond", "Kenya Eurobond yield below 9% by...?", "Economy", "multi",
     [("August 31", 0.35), ("September 30", 0.52), ("December 31", 0.74)]),
    ("gor-title", "Gor Mahia wins the FKF Premier League?", "FKF PL",
     "binary", [("Yes", 0.40)]),
    ("el-nino", "El Niño rains declared before November?", "Weather",
     "binary", [("Yes", 0.52)]),
]


async def seed() -> None:
    async with SessionFactory() as db:
        if await db.scalar(select(func.count(User.id))):
            return  # already seeded

        admin_user = User(
            email="admin@utabiri.co.ke",
            password_hash=hash_password("admin1234"),
            display_name="Utabiri Admin",
            is_admin=True,
            is_verified=True,
        )
        demo = User(
            email="demo@utabiri.co.ke",
            password_hash=hash_password("demo1234"),
            display_name="Demo Trader",
            is_verified=True,
        )
        db.add_all([admin_user, demo])
        await db.flush()
        db.add(Wallet(user_id=admin_user.id))
        db.add(Wallet(user_id=demo.id, balance_cents=10_000_000))  # KES 100k

        end = datetime.now(timezone.utc) + timedelta(days=180)
        for mid, question, category, kind, outcomes in SEED_MARKETS:
            db.add(Market(
                id=mid, question=question, category=category, kind=kind,
                end_date=end,
            ))
            for i, (label, price) in enumerate(outcomes):
                b = 1000.0
                o = Outcome(
                    market_id=mid, label=label, sort=i, b=b,
                    q_yes=lmsr.seed_q_for_price(b, price), price_yes=price,
                )
                db.add(o)
                await db.flush()
                db.add(PricePoint(outcome_id=o.id, price_yes=price))
        await db.commit()
        print("[utabiri] seeded 12 markets, admin + demo users")


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed()
    yield


app = FastAPI(title="Utabiri API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get(
        "CORS_ORIGINS", "http://localhost:3000,http://localhost:3100"
    ).split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth.router, wallet.router, markets.router, trading.router,
          trends.router, admin.router):
    app.include_router(r)


@app.get("/health")
async def health():
    return {"status": "ok"}
