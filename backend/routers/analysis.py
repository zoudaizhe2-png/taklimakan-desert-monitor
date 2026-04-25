"""API routes for NDVI analysis — auto-switches between GEE and demo data."""

import asyncio
import os
import logging
from datetime import datetime

from fastapi import APIRouter, Request
from pydantic import BaseModel, field_validator, model_validator

from cache import cached
from services.ndvi_service import (
    PRESET_REGIONS,
    generate_demo_change,
    generate_demo_grid,
    generate_demo_timeseries,
)

from rate_limit import limiter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["analysis"])

# Auto-detect: use GEE when credentials are configured via env vars
USE_GEE = bool(os.environ.get("GEE_SERVICE_ACCOUNT_KEY") or os.environ.get("GEE_PROJECT"))

_gee_ready = False
if USE_GEE:
    try:
        from services.gee_service import initialize, is_available, get_init_error
        _gee_ready = initialize()
        if _gee_ready:
            logger.info("GEE active — real satellite data enabled")
        else:
            logger.warning("GEE failed to init: %s — using demo data", get_init_error())
    except Exception as e:
        logger.warning("GEE import failed: %s — using demo data", e)


def _use_gee():
    return USE_GEE and _gee_ready


# ─── Validators ──────────────────────────────────

# Taklimakan bounding box (generous)
_TAK_BBOX = {"min_lng": 73, "max_lng": 92, "min_lat": 34, "max_lat": 45}
_MAX_COORD_POINTS = 500
_CURRENT_YEAR = datetime.now().year


def _validate_geometry(geometry: dict) -> dict:
    """Validate GeoJSON structure and coordinates within Taklimakan region."""
    if not isinstance(geometry, dict):
        raise ValueError("geometry must be a GeoJSON object")
    geo_type = geometry.get("type")
    if geo_type not in ("Polygon", "MultiPolygon", "Point"):
        raise ValueError("geometry.type must be Polygon, MultiPolygon, or Point")
    coords = geometry.get("coordinates")
    if not coords:
        raise ValueError("geometry.coordinates is required")
    # Flatten to check individual points
    flat = []
    def _flatten(c):
        if isinstance(c, (list, tuple)) and len(c) >= 2 and isinstance(c[0], (int, float)):
            flat.append(c)
        elif isinstance(c, (list, tuple)):
            for item in c:
                _flatten(item)
    _flatten(coords)
    if len(flat) == 0:
        raise ValueError("geometry contains no coordinate points")
    if len(flat) > _MAX_COORD_POINTS:
        raise ValueError(f"geometry has too many points ({len(flat)} > {_MAX_COORD_POINTS})")
    for lng, lat, *_ in flat:
        if not (_TAK_BBOX["min_lng"] <= lng <= _TAK_BBOX["max_lng"]):
            raise ValueError(f"longitude {lng} outside Taklimakan region [{_TAK_BBOX['min_lng']}, {_TAK_BBOX['max_lng']}]")
        if not (_TAK_BBOX["min_lat"] <= lat <= _TAK_BBOX["max_lat"]):
            raise ValueError(f"latitude {lat} outside Taklimakan region [{_TAK_BBOX['min_lat']}, {_TAK_BBOX['max_lat']}]")
    return geometry


def _validate_year(year: int, field_name: str = "year") -> int:
    if year < 2015 or year > _CURRENT_YEAR:
        raise ValueError(f"{field_name} must be between 2015 and {_CURRENT_YEAR}")
    return year


# ─── Models ──────────────────────────────────────

class TimeseriesRequest(BaseModel):
    geometry: dict
    start_year: int = 2015
    end_year: int = 2025

    @field_validator("geometry")
    @classmethod
    def check_geometry(cls, v):
        return _validate_geometry(v)

    @field_validator("start_year", "end_year")
    @classmethod
    def check_years(cls, v, info):
        return _validate_year(v, info.field_name)

    @model_validator(mode="after")
    def check_year_range(self):
        if self.start_year > self.end_year:
            raise ValueError("start_year must be ≤ end_year")
        return self


class AnalyzeRequest(BaseModel):
    geometry: dict
    year1: int
    year2: int

    @field_validator("geometry")
    @classmethod
    def check_geometry(cls, v):
        return _validate_geometry(v)

    @field_validator("year1", "year2")
    @classmethod
    def check_years(cls, v, info):
        return _validate_year(v, info.field_name)


class GridRequest(BaseModel):
    geometry: dict
    year: int = 2024
    resolution: int = 40

    @field_validator("geometry")
    @classmethod
    def check_geometry(cls, v):
        return _validate_geometry(v)

    @field_validator("year")
    @classmethod
    def check_year(cls, v):
        return _validate_year(v)

    @field_validator("resolution")
    @classmethod
    def check_resolution(cls, v):
        if v < 5 or v > 100:
            raise ValueError("resolution must be between 5 and 100")
        return v


# ─── Endpoints ───────────────────────────────────

@router.get("/data-source")
@limiter.limit("60/minute")
def get_data_source(request: Request):
    """Return current data source status and configuration."""
    if _use_gee():
        return {"source": "gee", "status": "active", "description": "Real-time Sentinel-2 via Google Earth Engine"}
    err = None
    if USE_GEE:
        from services.gee_service import get_init_error
        err = get_init_error()
    return {"source": "demo", "status": "demo", "description": "Simulated demo data", "gee_configured": USE_GEE, "gee_error": err}


@router.get("/presets")
@limiter.limit("60/minute")
def get_presets(request: Request):
    """Return all preset analysis regions."""
    return {
        key: {"name": val["name"], "description": val["description"], "geometry": val["geometry"]}
        for key, val in PRESET_REGIONS.items()
    }


@router.post("/timeseries")
@limiter.limit("30/minute")
async def get_timeseries(request: Request, body: TimeseriesRequest):
    """NDVI time series. Falls back to demo on GEE failure."""
    if _use_gee():
        try:
            from services.gee_service import get_ndvi_timeseries
            data = await asyncio.to_thread(get_ndvi_timeseries, body.geometry, body.start_year, body.end_year)
            return {"data": data, "source": "gee"}
        except Exception as e:
            logger.error("GEE timeseries error: %s — demo fallback", e)

    data = await asyncio.to_thread(generate_demo_timeseries, body.start_year, body.end_year)
    return {"data": data, "source": "demo"}


@router.post("/analyze")
@limiter.limit("30/minute")
async def analyze_change(request: Request, body: AnalyzeRequest):
    """NDVI change analysis. Falls back to demo on GEE failure."""
    if _use_gee():
        try:
            from services.gee_service import get_ndvi_change
            data = await asyncio.to_thread(get_ndvi_change, body.geometry, body.year1, body.year2)
            return {"data": data, "source": "gee"}
        except Exception as e:
            logger.error("GEE change analysis error: %s — demo fallback", e)

    data = await asyncio.to_thread(generate_demo_change, body.year1, body.year2)
    return {"data": data, "source": "demo"}


@router.post("/grid")
@limiter.limit("30/minute")
async def get_ndvi_grid(request: Request, body: GridRequest):
    """NDVI grid for heatmap. Falls back to demo on GEE failure."""
    if _use_gee():
        try:
            from services.gee_service import get_ndvi_grid as gee_grid
            grid = await asyncio.to_thread(gee_grid, body.geometry, body.year, body.resolution)
            return {"data": grid, "year": body.year, "source": "gee"}
        except Exception as e:
            logger.error("GEE grid error: %s — demo fallback", e)

    grid = await asyncio.to_thread(generate_demo_grid, body.geometry, body.year, body.resolution)
    return {"data": grid, "year": body.year, "source": "demo"}


# ─── Cached NDVI Grid for Map Tiles ──────────────

FULL_REGION = {
    "type": "Polygon",
    "coordinates": [[[75, 35.5], [90, 35.5], [90, 43], [75, 43], [75, 35.5]]],
}

_NDVI_CACHE_KEY = "ndvi_grid_full"
_NDVI_CACHE_TTL = 3600  # 1 hour
_ndvi_grid_task: asyncio.Task | None = None


async def _fetch_ndvi_grid_full():
    """Fetch full-region NDVI grid (GEE or demo). Called via cache.cached()."""
    if _use_gee():
        try:
            from services.gee_service import get_ndvi_grid as gee_grid
            logger.info("Fetching real NDVI grid from GEE (15x15)...")
            data = await asyncio.to_thread(gee_grid, FULL_REGION, 2024, 15)
            logger.info("NDVI grid cached: %d points from GEE", len(data))
            return {"data": data, "source": "gee"}
        except Exception as e:
            logger.error("NDVI grid fetch failed: %s — using demo fallback", e)
    data = await asyncio.to_thread(generate_demo_grid, FULL_REGION, 2024, 15)
    logger.info("NDVI grid cached: %d points (demo)", len(data))
    return {"data": data, "source": "demo"}


@router.get("/ndvi-grid-cache")
@limiter.limit("60/minute")
async def get_ndvi_grid_cache(request: Request):
    """
    Return cached NDVI grid for the full Taklimakan region.
    First call triggers a background fetch (~15-20s for GEE).
    Returns {"status": "loading"} while fetching.

    Concurrency: cache.cached() uses an asyncio.Lock per key so concurrent
    requests during the first fetch coalesce into a single GEE call.
    """
    global _ndvi_grid_task

    # If we've previously completed a fetch, the cached() call is effectively
    # instant — return ready immediately.
    if _ndvi_grid_task is not None and _ndvi_grid_task.done():
        try:
            result = _ndvi_grid_task.result()
            return {"status": "ready", "data": result["data"], "source": result["source"]}
        except Exception:
            # Previous attempt failed — clear so we retry below.
            _ndvi_grid_task = None

    # Kick off (or attach to) the background fetch and return immediately.
    if _ndvi_grid_task is None or _ndvi_grid_task.done():
        _ndvi_grid_task = asyncio.create_task(
            cached(_NDVI_CACHE_KEY, _NDVI_CACHE_TTL, _fetch_ndvi_grid_full)
        )

    return {"status": "loading"}
