import os
from collections.abc import AsyncIterator

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

engine = create_async_engine(DATABASE_URL, echo=False)
SessionFactory = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncIterator[AsyncSession]:
    async with SessionFactory() as session:
        yield session
