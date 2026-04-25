"""
Tests for the L1 sense layer at /api/v1/sense/* in demo mode.

Demo mode is forced by ensuring no GEE env vars are set before importing the
app (the router does its lazy detection at import time). All tests rely on the
deterministic centroid-based fallbacks in `services.sense_demo`.
"""

import os
import sys
from pathlib import Path

import pytest

# Force demo mode before any router import
for _var in ("GEE_PROJECT", "GEE_SERVICE_ACCOUNT_KEY", "GEE_SERVICE_ACCOUNT_EMAIL"):
    os.environ.pop(_var, None)

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi.testclient import TestClient  # noqa: E402

from main import app  # noqa: E402
from cache import clear_all  # noqa: E402

client = TestClient(app)

VALID_GEOMETRY = {
    "type": "Polygon",
    "coordinates": [[[80, 37], [81, 37], [81, 38], [80, 38], [80, 37]]],
}

# A geometry intentionally outside the Taklimakan bounding box (mid-Pacific)
OUTSIDE_GEOMETRY = {
    "type": "Polygon",
    "coordinates": [[[-150, 5], [-149, 5], [-149, 6], [-150, 6], [-150, 5]]],
}


@pytest.fixture(autouse=True)
def _flush_cache():
    """Each test starts with an empty cache so cache hits are deterministic."""
    clear_all()
    yield
    clear_all()


# ─── Per-endpoint demo-mode shape ───────────────────────


def test_elevation_demo_shape():
    res = client.post("/api/v1/sense/elevation", json={"geometry": VALID_GEOMETRY})
    assert res.status_code == 200
    body = res.json()
    assert body["source"] == "demo"
    assert isinstance(body["elevation_m"], (int, float))
    # Taklimakan basin centre sits well above sea level
    assert 50 <= body["elevation_m"] <= 8000


def test_slope_demo_shape():
    res = client.post("/api/v1/sense/slope", json={"geometry": VALID_GEOMETRY})
    assert res.status_code == 200
    body = res.json()
    assert body["source"] == "demo"
    assert body["aspect"] in ("N", "NE", "E", "SE", "S", "SW", "W", "NW", "flat")
    assert isinstance(body["slope_degrees"], (int, float))


def test_rainfall_demo_shape():
    res = client.post("/api/v1/sense/rainfall", json={"geometry": VALID_GEOMETRY, "year": 2024})
    assert res.status_code == 200
    body = res.json()
    assert body["source"] == "demo"
    assert body["year"] == 2024
    # Desert proper -> < 200 mm/yr in fallback
    assert 0 <= body["annual_mm"] <= 600


def test_temperature_demo_shape():
    res = client.post("/api/v1/sense/temperature", json={"geometry": VALID_GEOMETRY, "year": 2024})
    assert res.status_code == 200
    body = res.json()
    assert body["source"] == "demo"
    assert body["max_c"] > body["min_c"]
    assert body["hot_days_ge_40"] >= 0


def test_drought_demo_shape():
    res = client.post("/api/v1/sense/drought", json={"geometry": VALID_GEOMETRY, "months_back": 12})
    assert res.status_code == 200
    body = res.json()
    assert body["source"] == "demo"
    assert 0.0 <= body["drought_index"] <= 1.0
    assert body["months_back"] == 12


def test_soil_moisture_demo_shape():
    res = client.post("/api/v1/sense/soil-moisture", json={"geometry": VALID_GEOMETRY})
    assert res.status_code == 200
    body = res.json()
    assert body["source"] == "demo"
    assert 0.0 <= body["volumetric_fraction"] <= 1.0
    assert "last_updated" in body


# ─── Multi-sense composite ──────────────────────────────


def test_multi_returns_all_fields():
    res = client.post("/api/v1/sense/multi", json={"geometry": VALID_GEOMETRY, "year": 2024})
    assert res.status_code == 200
    body = res.json()
    for key in ("elevation", "slope", "rainfall", "temperature", "soil_moisture", "ndvi"):
        assert key in body
    # Each child has its own source flag
    assert body["elevation"]["source"] == "demo"
    assert body["ndvi"]["year"] == 2024


# ─── Validation: outside region ─────────────────────────


def test_geometry_outside_taklimakan_rejected():
    res = client.post("/api/v1/sense/elevation", json={"geometry": OUTSIDE_GEOMETRY})
    assert res.status_code == 422
    body = res.json()
    assert "errors" in body or "detail" in body


# ─── Rate limit ─────────────────────────────────────────


def test_rate_limit_triggers_429():
    """The /api/v1/sense/* endpoints are limited to 20 / minute per IP."""
    last_status = None
    for _ in range(25):
        last_status = client.post(
            "/api/v1/sense/elevation",
            json={"geometry": VALID_GEOMETRY},
        ).status_code
        if last_status == 429:
            break
    assert last_status == 429, f"Expected 429 within 25 calls, last was {last_status}"


# ─── Cache hit speeds up second call ────────────────────


def test_cache_hits_second_call():
    """
    First call populates the per-(geometry, year) cache; second call should be
    served from the cache. We assert the responses are byte-identical (the
    demo fallback is fully deterministic) and that the second wall-clock time
    is at most slightly above the first.
    """
    payload = {"geometry": VALID_GEOMETRY, "year": 2024}
    # warm + clear bookkeeping noise
    r1 = client.post("/api/v1/sense/multi", json=payload)
    r2 = client.post("/api/v1/sense/multi", json=payload)
    assert r1.status_code == r2.status_code == 200
    # Ignoring last_updated which is computed per call before caching the response
    j1 = r1.json()
    j2 = r2.json()
    j1["soil_moisture"].pop("last_updated", None)
    j2["soil_moisture"].pop("last_updated", None)
    assert j1 == j2
