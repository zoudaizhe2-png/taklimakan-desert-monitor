"""Tests for the L3 recommendation engine and API.

Covers:
    - Vocabulary integrity (all 17 actions loaded)
    - NDVI-only data → only 4 actionable actions evaluate triggers (rest pending)
    - PLANT_HALOXYLON triggers when full L1 data is present
    - Sudden NDVI drop triggers ALERT_NDVI_DEGRADATION + INSPECT_SNAKE_ROBOT
    - Data completeness lowers confidence
    - Region area drives cost estimate
    - POST /evaluate returns the documented schema
    - POST /decision requires auth and updates the row
    - GET /recommendations supports status filter
    - GET /actions returns 17 entries
    - Trigger evaluator handles missing/borderline values gracefully
"""

import asyncio
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi.testclient import TestClient

from auth import create_access_token
from database import async_session, init_db
from main import app
from models.user import User
from services.action_vocabulary import (
    ACTIONS,
    NDVI_ONLY_ACTIONABLE,
)
from services.recommendation_engine import (
    compute_confidence,
    estimate_cost_yuan,
    evaluate_region,
    evaluate_trigger,
    region_area_hm2,
)


# ─── Fixtures ────────────────────────────────────────────────────────────────


@pytest.fixture(scope="module", autouse=True)
def _init_db_tables():
    """Ensure tables exist before any test runs.

    TestClient does NOT trigger lifespan in the version used here, so we
    create tables explicitly. Idempotent.
    """
    asyncio.run(init_db())


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def small_polygon():
    """~100 hm² polygon inside the Taklimakan bbox."""
    return {
        "type": "Polygon",
        "coordinates": [
            [
                [80.00, 37.00],
                [80.01, 37.00],
                [80.01, 37.01],
                [80.00, 37.01],
                [80.00, 37.00],
            ]
        ],
    }


@pytest.fixture
def medium_polygon():
    """~2500 hm² polygon."""
    return {
        "type": "Polygon",
        "coordinates": [
            [
                [80.00, 37.00],
                [80.05, 37.00],
                [80.05, 37.05],
                [80.00, 37.05],
                [80.00, 37.00],
            ]
        ],
    }


@pytest.fixture
def auth_user_token():
    """Create a test user and return a valid JWT.

    NOTE: python-jose requires `sub` to be a string. The existing auth.py
    encodes user.id as int — works for jwt.encode but jwt.decode raises
    "Subject must be a string". Stringify here to keep this test decoupled
    from that upstream bug.
    """
    async def _make():
        async with async_session() as s:
            from sqlalchemy import select
            existing = await s.execute(select(User).where(User.email == "test-l3@example.com"))
            user = existing.scalar_one_or_none()
            if user is None:
                user = User(
                    email="test-l3@example.com",
                    display_name="L3 Tester",
                    hashed_password="x",
                )
                s.add(user)
                await s.commit()
                await s.refresh(user)
            return user.id

    user_id = asyncio.run(_make())
    return create_access_token({"sub": str(user_id)})


# ─── Tests ───────────────────────────────────────────────────────────────────


def test_vocabulary_has_17_actions():
    """All 17 actions from L3-action-vocabulary.md are loaded."""
    assert len(ACTIONS) == 17
    by_cat = {}
    for a in ACTIONS.values():
        by_cat[a.category] = by_cat.get(a.category, 0) + 1
    assert by_cat == {"planting": 6, "irrigation": 4, "inspection": 4, "alert": 3}
    # PLANT_* and IRRIGATION_FLOOD_ECOLOGICAL must never auto-execute (doc §6).
    for a in ACTIONS.values():
        if a.code.startswith("PLANT_") or a.code == "IRRIGATION_FLOOD_ECOLOGICAL":
            assert a.can_autonomous_phase_c is False, f"{a.code} must stay manual"


def test_ndvi_only_data_yields_pending_for_13_actions(small_polygon):
    """Per docs §3, only 4/17 actions are actionable on NDVI alone.
    The other 13 must surface as pending-with-engine_note."""
    async def _run():
        async with async_session() as s:
            l1 = {"ndvi": 0.10, "ndvi_low_months": 7, "ndvi_drop_periods": 3}
            return await evaluate_region(
                feature_id=None,
                region_geojson=small_polygon,
                l1_data=l1,
                user_id=None,
                db=s,
                persist=False,
            )

    recs, meta = asyncio.run(_run())
    pending_with_note = [r for r in recs if r.engine_note]
    assert len(pending_with_note) == 13, (
        f"Expected 13 pending-L1 rows (17 - 4 actionable), got {len(pending_with_note)}"
    )
    assert meta["actions_pending_l1"] == 13
    assert meta["total_actions_in_catalog"] == 17
    pending_codes = {r.action_code for r in pending_with_note}
    for actionable in NDVI_ONLY_ACTIONABLE:
        assert actionable not in pending_codes


def test_plant_haloxylon_triggers_with_full_l1_data(medium_polygon):
    """When all required L1 data is present and conditions are met,
    PLANT_HALOXYLON's trigger fires."""
    async def _run():
        async with async_session() as s:
            l1 = {
                "ndvi": 0.10,
                "ndvi_low_years": 4,
                "annual_rainfall_mm": 100,
                "soil_type": "sandy",
                "elevation_m": 1200,
                "species_map": "haloxylon",
            }
            return await evaluate_region(
                feature_id=None,
                region_geojson=medium_polygon,
                l1_data=l1,
                user_id=None,
                db=s,
                persist=False,
            )

    recs, meta = asyncio.run(_run())
    matched_codes = {r.action_code for r in recs if not r.engine_note}
    assert "PLANT_HALOXYLON" in matched_codes
    haloxylon = next(r for r in recs if r.action_code == "PLANT_HALOXYLON" and not r.engine_note)
    assert haloxylon.confidence >= 0.5


def test_ndvi_sudden_drop_triggers_degradation_and_robot():
    """Sudden NDVI drop on a tiny dune patch should fire ALERT_NDVI_DEGRADATION
    and INSPECT_SNAKE_ROBOT (whose area max is 5 hm²)."""
    tiny_poly = {
        "type": "Polygon",
        "coordinates": [
            [
                [80.0000, 37.0000],
                [80.0015, 37.0000],
                [80.0015, 37.0015],
                [80.0000, 37.0015],
                [80.0000, 37.0000],
            ]
        ],
    }

    async def _run():
        async with async_session() as s:
            l1 = {
                "ndvi": 0.08,
                "ndvi_drop": 0.18,
                "ndvi_drop_periods": 4,
                "ndvi_low_months": 8,
                "terrain": "sand_dune",
                "slope_degrees": 20,
                "rainfall": 30,
                "elevation_m": 1100,
            }
            recs, _ = await evaluate_region(
                feature_id=None,
                region_geojson=tiny_poly,
                l1_data=l1,
                user_id=None,
                db=s,
                persist=False,
            )
            return recs

    recs = asyncio.run(_run())
    matched = {r.action_code for r in recs if not r.engine_note}
    assert "ALERT_NDVI_DEGRADATION" in matched
    assert "INSPECT_SNAKE_ROBOT" in matched


def test_data_completeness_lowers_confidence():
    """Same baseline action with partial data → lower confidence."""
    a = ACTIONS["PLANT_HALOXYLON"]
    high = compute_confidence(a, completeness=1.0, uncertainty_penalty=0.0)
    low = compute_confidence(a, completeness=0.4, uncertainty_penalty=0.0)
    assert high > low
    assert low == pytest.approx(a.confidence_baseline * 0.4)
    penalized = compute_confidence(a, completeness=1.0, uncertainty_penalty=0.5)
    assert penalized < high


def test_region_area_drives_cost(small_polygon, medium_polygon):
    """Larger polygon → larger cost estimate when cost_per_hm2 is defined."""
    small_area = region_area_hm2(small_polygon)
    medium_area = region_area_hm2(medium_polygon)
    assert medium_area > small_area > 0

    a = ACTIONS["PLANT_HALOXYLON"]
    small_cost = estimate_cost_yuan(a, small_area)
    medium_cost = estimate_cost_yuan(a, medium_area)
    assert medium_cost > small_cost > 0

    a_inspect = ACTIONS["INSPECT_HUMAN"]
    assert estimate_cost_yuan(a_inspect, medium_area) is None


def test_evaluate_endpoint_returns_documented_schema(client, medium_polygon):
    """POST /api/v1/recommendations/evaluate returns the documented response."""
    res = client.post(
        "/api/v1/recommendations/evaluate",
        json={
            "region_geojson": medium_polygon,
            "override_data": {
                "ndvi": 0.10,
                "ndvi_drop": 0.12,
                "ndvi_drop_periods": 4,
                "ndvi_low_months": 8,
                "needs_planting_judgment": True,
            },
        },
    )
    assert res.status_code == 200
    data = res.json()
    for key in ("recommendations", "evaluated_at", "data_completeness",
                "actions_matched", "actions_pending_l1"):
        assert key in data
    assert isinstance(data["recommendations"], list)
    matched = [r for r in data["recommendations"] if r["engine_note"] is None]
    assert len(matched) >= 1
    for r in data["recommendations"]:
        for key in ("action_code", "status", "confidence", "approval_level", "created_at"):
            assert key in r


def test_evaluate_requires_feature_or_region(client):
    """Body with neither feature_id nor region_geojson must 400."""
    res = client.post("/api/v1/recommendations/evaluate", json={})
    assert res.status_code == 400


def test_decision_endpoint_requires_auth_and_updates(client, medium_polygon, auth_user_token):
    """POST /decision must 401 without auth, 200 + update row with auth."""
    res = client.post(
        "/api/v1/recommendations/evaluate",
        json={
            "region_geojson": medium_polygon,
            "override_data": {
                "ndvi": 0.10, "ndvi_drop": 0.12,
                "ndvi_drop_periods": 4, "ndvi_low_months": 8,
            },
        },
    )
    assert res.status_code == 200
    rec_id = res.json()["recommendations"][0]["id"]

    # No auth → 401
    res_noauth = client.post(
        f"/api/v1/recommendations/{rec_id}/decision",
        json={"decision": "approved", "notes": "test"},
    )
    assert res_noauth.status_code == 401

    # With auth → 200
    res_auth = client.post(
        f"/api/v1/recommendations/{rec_id}/decision",
        json={"decision": "approved", "notes": "looks good"},
        headers={"Authorization": f"Bearer {auth_user_token}"},
    )
    assert res_auth.status_code == 200
    body = res_auth.json()
    assert body["status"] == "approved"
    assert body["decision_notes"] == "looks good"
    assert body["decided_at"] is not None
    assert body["decided_by_user_id"] is not None

    # Invalid decision string → 400
    res_bad = client.post(
        f"/api/v1/recommendations/{rec_id}/decision",
        json={"decision": "yolo"},
        headers={"Authorization": f"Bearer {auth_user_token}"},
    )
    assert res_bad.status_code == 400


def test_list_recommendations_supports_status_filter(client, medium_polygon, auth_user_token):
    """GET /recommendations?status=approved returns only approved rows."""
    # Create + approve a recommendation
    res = client.post(
        "/api/v1/recommendations/evaluate",
        json={
            "region_geojson": medium_polygon,
            "override_data": {
                "ndvi": 0.10, "ndvi_drop": 0.12,
                "ndvi_drop_periods": 4, "ndvi_low_months": 8,
            },
        },
    )
    rec_id = res.json()["recommendations"][0]["id"]
    res_dec = client.post(
        f"/api/v1/recommendations/{rec_id}/decision",
        json={"decision": "approved"},
        headers={"Authorization": f"Bearer {auth_user_token}"},
    )
    assert res_dec.status_code == 200, res_dec.json()

    # List approved
    res = client.get("/api/v1/recommendations?status=approved&limit=100")
    assert res.status_code == 200
    rows = res.json()
    assert len(rows) >= 1
    for r in rows:
        assert r["status"] == "approved"

    # Bogus status → 400
    assert client.get("/api/v1/recommendations?status=invalid").status_code == 400


def test_actions_endpoint_returns_17_actions(client):
    """GET /api/v1/actions returns full vocab; sources omitted on list."""
    res = client.get("/api/v1/actions")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 17
    assert len(data["actions"]) == 17
    for a in data["actions"]:
        assert "sources" not in a
        assert "code" in a and "category" in a

    res_one = client.get("/api/v1/actions/PLANT_HALOXYLON")
    assert res_one.status_code == 200
    detail = res_one.json()
    assert detail["code"] == "PLANT_HALOXYLON"
    assert "sources" in detail
    assert len(detail["sources"]) > 0

    assert client.get("/api/v1/actions/NOT_A_REAL_CODE").status_code == 404


def test_trigger_evaluator_handles_missing_data():
    """A trigger condition referencing a missing field must fail closed."""
    cond = {"ndvi_threshold": 0.15, "annual_rainfall_mm_min": 50}
    matched, _ = evaluate_trigger(cond, {"ndvi": 0.10})  # rainfall missing
    assert matched is False

    matched, _ = evaluate_trigger(cond, {"ndvi": 0.10, "annual_rainfall_mm": 80})
    assert matched is True

    # Empty conditions → vacuously true
    assert evaluate_trigger({}, {})[0] is True
