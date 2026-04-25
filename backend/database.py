"""Async database setup via SQLAlchemy 2.0. Supports SQLite (dev) and Postgres (Railway add-on)."""

import os
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase


def _normalize_db_url(url: str) -> str:
    """Coerce sync-style Postgres URLs (Railway/Heroku) to asyncpg driver."""
    if url.startswith("postgres://"):
        return "postgresql+asyncpg://" + url[len("postgres://"):]
    if url.startswith("postgresql://") and "+asyncpg" not in url:
        return "postgresql+asyncpg://" + url[len("postgresql://"):]
    return url


DB_PATH = _normalize_db_url(
    os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///./desert_tracker.db")
)

engine = create_async_engine(DB_PATH, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def init_db():
    """Create all tables if they don't exist."""
    from models.feature import Feature  # noqa: F401
    from models.news import NewsArticle  # noqa: F401
    from models.dashboard import DashboardSnapshot  # noqa: F401
    from models.user import User  # noqa: F401
    from models.alert import Alert  # noqa: F401
    from models.donation import Donation  # noqa: F401
    from models.recommendation import Recommendation  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    """FastAPI dependency — yields an async session."""
    async with async_session() as session:
        yield session
