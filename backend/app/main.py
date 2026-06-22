import asyncio
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, text

from . import ai
from .database import Base, SessionFactory, engine
from .models import User
from .routers import admin, auth, bills, briefing as briefing_router, commodities, insights, macro, nse, social, trends
from .security import hash_password
from .services import briefing, kamis

UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "/data/uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

KAMIS_INGEST_INTERVAL_SECONDS = 12 * 60 * 60
BRIEFING_INTERVAL_SECONDS = 24 * 60 * 60


async def _migrate() -> None:
    """Add columns / tables that were added after the initial schema."""
    async with engine.begin() as conn:
        cols = {r[1] for r in await conn.execute(text("PRAGMA table_info(users)"))}
        if "avatar_url" not in cols:
            await conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url TEXT"))

        comment_cols = {r[1] for r in await conn.execute(text("PRAGMA table_info(comments)"))}
        if "insight_id" not in comment_cols:
            await conn.execute(text("ALTER TABLE comments ADD COLUMN insight_id VARCHAR(36)"))


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
        await db.commit()
        print(f"[utabiri] created admin account {email}")


async def _kamis_scheduler() -> None:
    while True:
        try:
            async with SessionFactory() as db:
                result = await kamis.ingest_latest(db)
            print(f"[utabiri] KAMIS ingest: {result}")
        except Exception as e:
            print(f"[utabiri] KAMIS ingest failed: {e!r}")
        await asyncio.sleep(KAMIS_INGEST_INTERVAL_SECONDS)


async def _briefing_scheduler() -> None:
    while True:
        if ai.ENABLED:
            try:
                async with SessionFactory() as db:
                    b = await briefing.generate_and_store(db)
                print(f"[utabiri] economic briefing generated: score={b.health_score}")
            except Exception as e:
                print(f"[utabiri] briefing generation failed: {e!r}")
        await asyncio.sleep(BRIEFING_INTERVAL_SECONDS)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await _migrate()
    await ensure_admin()
    kamis_task = asyncio.create_task(_kamis_scheduler())
    briefing_task = asyncio.create_task(_briefing_scheduler())
    yield
    kamis_task.cancel()
    briefing_task.cancel()


app = FastAPI(title="Utabiri API", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get(
        "CORS_ORIGINS", "http://localhost:3000,http://localhost:3100"
    ).split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth.router, commodities.router, macro.router, insights.router,
          trends.router, nse.router, admin.router, social.router,
          briefing_router.router, bills.router):
    app.include_router(r)

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.get("/health")
async def health():
    return {"status": "ok"}
