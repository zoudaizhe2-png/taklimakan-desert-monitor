"""Donation routes — list and create."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from rate_limit import limiter
from database import get_db
from models.donation import Donation

router = APIRouter(prefix="/api/v1", tags=["donations"])


class CreateDonationRequest(BaseModel):
    display_name: str
    amount: float
    tier: str = "supporter"
    adopted_zone: str | None = None
    message: str = ""


@router.get("/donations")
@limiter.limit("60/minute")
async def list_donations(request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Donation).order_by(Donation.created_at.desc()).limit(100)
    )
    return [d.to_dict() for d in result.scalars().all()]


@router.post("/donations")
@limiter.limit("10/minute")
async def create_donation(request: Request, body: CreateDonationRequest, db: AsyncSession = Depends(get_db)):
    donation = Donation(
        display_name=body.display_name,
        amount=body.amount,
        tier=body.tier,
        adopted_zone=body.adopted_zone,
        message=body.message,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(donation)
    await db.commit()
    await db.refresh(donation)
    return donation.to_dict()
