"""News API routes."""

from fastapi import APIRouter, HTTPException, Query, Request, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from rate_limit import limiter
from database import get_db
from models.news import NewsArticle

router = APIRouter(prefix="/api/v1", tags=["news"])


@router.get("/news")
@limiter.limit("60/minute")
async def list_news(
    request: Request,
    category: str = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """List news articles, optionally filtered by category."""
    stmt = select(NewsArticle).order_by(NewsArticle.date.desc())
    if category:
        stmt = stmt.where(NewsArticle.category == category)
    result = await db.execute(stmt)
    articles = result.scalars().all()
    return [a.to_dict() for a in articles]


@router.get("/news/{news_id}")
@limiter.limit("60/minute")
async def get_news(news_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    """Get a single news article by ID."""
    result = await db.execute(select(NewsArticle).where(NewsArticle.id == news_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article.to_dict()
