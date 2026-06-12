import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from .database import Base, SessionFactory, engine
from .models import User, Wallet
from .routers import admin, auth, markets, nse, trading, trends, wallet
from .security import hash_password


async def ensure_admin() -> None:
    """Create the admin account from env on first boot. Markets are created
    by the admin through /admin/* — nothing else is seeded."""
    email = os.environ.get("ADMIN_EMAIL", "")
    password = os.environ.get("ADMIN_PASSWORD", "")
    if not (email and password):
        print("[utabiri] ADMIN_EMAIL/ADMIN_PASSWORD not set — "
              "no admin account; /admin endpoints will be unusable")
        return
    async with SessionFactory() as db:
        if await db.scalar(select(User.id).where(User.email == email)):
            return
        admin_user = User(
            email=email,
            password_hash=hash_password(password),
            display_name="Utabiri Admin",
            is_admin=True,
            is_verified=True,
        )
        db.add(admin_user)
        await db.flush()
        db.add(Wallet(user_id=admin_user.id))
        await db.commit()
        print(f"[utabiri] created admin account {email}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await ensure_admin()
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
          trends.router, nse.router, admin.router):
    app.include_router(r)


@app.get("/health")
async def health():
    return {"status": "ok"}
