import os
from collections.abc import AsyncIterator

from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

# SQLite for local dev; set DATABASE_URL=postgresql+asyncpg://... in prod.
DATABASE_URL = os.environ.get(
    "DATABASE_URL", "sqlite+aiosqlite:///./utabiri.db"
)

_connect_args = {"timeout": 30} if DATABASE_URL.startswith("sqlite") else {}
engine = create_async_engine(DATABASE_URL, echo=False, connect_args=_connect_args)
SessionFactory = async_sessionmaker(engine, expire_on_commit=False)

if DATABASE_URL.startswith("sqlite"):
    # WAL lets the background KAMIS scraper write without blocking concurrent
    # request reads/writes for the whole transaction; busy_timeout makes any
    # remaining writer-vs-writer contention retry instead of failing instantly.
    @event.listens_for(engine.sync_engine, "connect")
    def _set_sqlite_pragmas(dbapi_conn, _record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=30000")
        cursor.close()


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncIterator[AsyncSession]:
    async with SessionFactory() as session:
        yield session
