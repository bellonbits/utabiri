import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, text

from .database import Base, SessionFactory, engine
from .models import User, Wallet
from .routers import admin, auth, markets, nse, social, trading, trends, wallet
from .security import hash_password

UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "/data/uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


async def _migrate() -> None:
    """Add columns / tables that were added after the initial schema."""
    async with engine.begin() as conn:
        cols = {r[1] for r in await conn.execute(text("PRAGMA table_info(users)"))}
        if "avatar_url" not in cols:
            await conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url TEXT"))


async def ensure_admin() -> None:
    email = os.environ.get("ADMIN_EMAIL", "")
    password = os.environ.get("ADMIN_PASSWORD", "")
    if not (email and password):
        print("[utabiri] ADMIN_EMAIL/ADMIN_PASSWORD not set — no admin account")
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
    await _migrate()
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
          trends.router, nse.router, admin.router, social.router):
    app.include_router(r)

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.get("/health")
async def health():
    return {"status": "ok"}
