"""L3 Recommendation API routes.

Endpoints:
    POST   /api/v1/recommendations/evaluate   — run engine on a region
    GET    /api/v1/recommendations            — list with filters
    POST   /api/v1/recommendations/{id}/decision — approve/reject/defer
    GET    /api/v1/actions                    — list the 17-action vocabulary

Phase A: only the decision endpoint requires auth (it records who decided).
The evaluation and listing endpoints are open for the demo flow per L3 spec.
"""

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import require_user
from database import get_db
from models.recommendation import STATUSES, Recommendation
from models.user import User
from rate_limit import limiter
from services.action_vocabulary import ACTIONS, list_actions
from services.recommendation_engine import evaluate_region

router = APIRouter(prefix="/api/v1", tags=["recommendations"])


# ─── Request / response models ────────────────────────────────────────────────


class EvaluateRequest(BaseModel):
    feature_id: str | None = None
    region_geojson: dict | None = None
    # If provided, used directly as L1 data dict (NDVI, soil_moisture, ...).
    # Lets the demo flow show all 17 actions without real GEE plumbing.
    override_data: dict | None = None


class DecisionRequest(BaseModel):
    decision: str = Field(..., description="approved | rejected | deferred")
    notes: str | None = None


_VALID_DECISIONS = {"approved", "rejected", "deferred"}


# ─── Helpers ──────────────────────────────────────────────────────────────────


def _resolve_l1_data(req: EvaluateRequest) -> dict[str, Any]:
    """Return the dict that will be passed to evaluate_region as l1_data.

    Phase A: if override_data is given, use it. Otherwise fall back to the
    minimal Phase-3-stubbed snapshot (NDVI-only, everything else None) so the
    engine returns mostly pending-L1 placeholders.
    """
    if req.override_data:
        return req.override_data
    # Defaults: a typical degraded zone with NDVI data only.
    return {
        "ndvi": 0.12,
        "ndvi_low_months": 7,
        "ndvi_drop": 0.08,
        "ndvi_drop_periods": 3,
    }


def _validate_decision(value: str) -> str:
    if value not in _VALID_DECISIONS:
        raise HTTPException(
            status_code=400,
            detail=f"decision must be one of {sorted(_VALID_DECISIONS)}",
        )
    return value


# ─── Routes ───────────────────────────────────────────────────────────────────


@router.post("/recommendations/evaluate")
@limiter.limit("30/minute")
async def evaluate_recommendations(
    request: Request,
    body: EvaluateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Run the L3 engine and return any recommendations produced.

    Persists each emitted recommendation to the DB (status=pending).
    """
    if body.feature_id is None and body.region_geojson is None:
        raise HTTPException(
            status_code=400,
            detail="either feature_id or region_geojson is required",
        )

    l1_data = _resolve_l1_data(body)

    recs, meta = await evaluate_region(
        feature_id=body.feature_id,
        region_geojson=body.region_geojson,
        l1_data=l1_data,
        user_id=None,
        db=db,
        persist=True,
    )

    return {
        "recommendations": [r.to_dict() for r in recs],
        **meta,
    }


@router.get("/recommendations")
@limiter.limit("60/minute")
async def list_recommendations(
    request: Request,
    db: AsyncSession = Depends(get_db),
    status: str | None = Query(default=None),
    action_code: str | None = Query(default=None),
    approval_level: str | None = Query(default=None),
    feature_id: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
):
    """List recommendations, optionally filtered."""
    if status and status not in STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"status must be one of {list(STATUSES)}",
        )

    stmt = select(Recommendation).order_by(Recommendation.created_at.desc()).limit(limit)
    if status:
        stmt = stmt.where(Recommendation.status == status)
    if action_code:
        stmt = stmt.where(Recommendation.action_code == action_code)
    if approval_level:
        stmt = stmt.where(Recommendation.approval_level == approval_level)
    if feature_id:
        stmt = stmt.where(Recommendation.feature_id == feature_id)

    result = await db.execute(stmt)
    rows = result.scalars().all()
    return [r.to_dict() for r in rows]


@router.post("/recommendations/{rec_id}/decision")
@limiter.limit("30/minute")
async def record_decision(
    rec_id: int,
    request: Request,
    body: DecisionRequest,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Record approve/reject/defer decision. Requires authentication."""
    decision = _validate_decision(body.decision)

    result = await db.execute(
        select(Recommendation).where(Recommendation.id == rec_id)
    )
    rec = result.scalar_one_or_none()
    if rec is None:
        raise HTTPException(status_code=404, detail="recommendation not found")

    # Map decision -> stored status. "approved" -> approved (still awaits exec),
    # "rejected" -> rejected, "deferred" -> deferred.
    rec.status = decision
    rec.decided_at = datetime.utcnow()
    rec.decided_by_user_id = user.id
    rec.decision_notes = body.notes
    await db.commit()
    await db.refresh(rec)
    return rec.to_dict()


@router.get("/actions")
@limiter.limit("60/minute")
async def get_actions(
    request: Request,
    category: str | None = Query(default=None),
):
    """Expose the 17-action static vocabulary to the frontend.

    Sources are omitted from the list response (large) — fetch a single
    action for full citations.
    """
    actions = list_actions(category=category)
    return {
        "total": len(actions),
        "actions": [a.to_dict(include_sources=False) for a in actions],
    }


@router.get("/actions/{code}")
@limiter.limit("60/minute")
async def get_action_detail(code: str, request: Request):
    """Single action with full sources."""
    action = ACTIONS.get(code)
    if action is None:
        raise HTTPException(status_code=404, detail=f"unknown action code: {code}")
    return action.to_dict(include_sources=True)
