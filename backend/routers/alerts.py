"""Alert routes — list, create, acknowledge."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from rate_limit import limiter
from database import get_db
from models.alert import Alert

router = APIRouter(prefix="/api/v1", tags=["alerts"])


class CreateAlertRequest(BaseModel):
    type: str
    severity: str = "warning"
    title_en: str
    title_zh: str = ""
    body: str = ""
    geometry_json: str | None = None


@router.get("/alerts")
@limiter.limit("60/minute")
async def list_alerts(request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Alert).where(Alert.acknowledged == False).order_by(Alert.created_at.desc()).limit(50)
    )
    return [a.to_dict() for a in result.scalars().all()]


@router.post("/alerts")
@limiter.limit("30/minute")
async def create_alert(request: Request, body: CreateAlertRequest, db: AsyncSession = Depends(get_db)):
    alert = Alert(
        type=body.type,
        severity=body.severity,
        title_en=body.title_en,
        title_zh=body.title_zh,
        body=body.body,
        geometry_json=body.geometry_json,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    return alert.to_dict()


@router.post("/alerts/{alert_id}/acknowledge")
@limiter.limit("60/minute")
async def acknowledge_alert(alert_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.acknowledged = True
    await db.commit()
    return {"ok": True}
