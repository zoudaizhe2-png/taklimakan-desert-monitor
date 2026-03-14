"""API routes for NDVI analysis — auto-switches between GEE and demo data."""

import os
import logging
import threading

from fastapi import APIRouter
from pydantic import BaseModel

from services.ndvi_service import (
    PRESET_REGIONS,
    generate_demo_change,
    generate_demo_grid,
    generate_demo_timeseries,
)

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


# ─── Models ──────────────────────────────────────

class TimeseriesRequest(BaseModel):
    geometry: dict
    start_year: int = 2015
    end_year: int = 2025


class AnalyzeRequest(BaseModel):
    geometry: dict
    year1: int
    year2: int


class GridRequest(BaseModel):
    geometry: dict
    year: int = 2024
    resolution: int = 40


# ─── Endpoints ───────────────────────────────────

@router.get("/data-source")
def get_data_source():
    """Return current data source status and configuration."""
    if _use_gee():
        return {"source": "gee", "status": "active", "description": "Real-time Sentinel-2 via Google Earth Engine"}
    err = None
    if USE_GEE:
        from services.gee_service import get_init_error
        err = get_init_error()
    return {"source": "demo", "status": "demo", "description": "Simulated demo data", "gee_configured": USE_GEE, "gee_error": err}


@router.get("/presets")
def get_presets():
    """Return all preset analysis regions."""
    return {
        key: {"name": val["name"], "description": val["description"], "geometry": val["geometry"]}
        for key, val in PRESET_REGIONS.items()
    }


@router.post("/timeseries")
def get_timeseries(request: TimeseriesRequest):
    """NDVI time series. Falls back to demo on GEE failure."""
    if _use_gee():
        try:
            from services.gee_service import get_ndvi_timeseries
            data = get_ndvi_timeseries(request.geometry, request.start_year, request.end_year)
            return {"data": data, "source": "gee"}
        except Exception as e:
            logger.error("GEE timeseries error: %s — demo fallback", e)

    return {"data": generate_demo_timeseries(request.start_year, request.end_year), "source": "demo"}


@router.post("/analyze")
def analyze_change(request: AnalyzeRequest):
    """NDVI change analysis. Falls back to demo on GEE failure."""
    if _use_gee():
        try:
            from services.gee_service import get_ndvi_change
            data = get_ndvi_change(request.geometry, request.year1, request.year2)
            return {"data": data, "source": "gee"}
        except Exception as e:
            logger.error("GEE change analysis error: %s — demo fallback", e)

    return {"data": generate_demo_change(request.year1, request.year2), "source": "demo"}


@router.post("/grid")
def get_ndvi_grid(request: GridRequest):
    """NDVI grid for heatmap. Falls back to demo on GEE failure."""
    if _use_gee():
        try:
            from services.gee_service import get_ndvi_grid as gee_grid
            grid = gee_grid(request.geometry, request.year, request.resolution)
            return {"data": grid, "year": request.year, "source": "gee"}
        except Exception as e:
            logger.error("GEE grid error: %s — demo fallback", e)

    return {"data": generate_demo_grid(request.geometry, request.year, request.resolution), "year": request.year, "source": "demo"}


# ─── Cached NDVI Grid for Map Tiles ──────────────

FULL_REGION = {
    "type": "Polygon",
    "coordinates": [[[75, 35.5], [90, 35.5], [90, 43], [75, 43], [75, 35.5]]],
}

_ndvi_cache = {"data": None, "loading": False, "source": None}


def _fetch_ndvi_grid_bg():
    """Background thread: fetch real NDVI grid from GEE and cache it."""
    global _ndvi_cache
    try:
        if _use_gee():
            from services.gee_service import get_ndvi_grid as gee_grid
            logger.info("Fetching real NDVI grid from GEE (15x15)...")
            data = gee_grid(FULL_REGION, 2024, 15)
            _ndvi_cache = {"data": data, "loading": False, "source": "gee"}
            logger.info("NDVI grid cached: %d points from GEE", len(data))
        else:
            data = generate_demo_grid(FULL_REGION, 2024, 15)
            _ndvi_cache = {"data": data, "loading": False, "source": "demo"}
            logger.info("NDVI grid cached: %d points (demo)", len(data))
    except Exception as e:
        logger.error("NDVI grid fetch failed: %s — using demo fallback", e)
        data = generate_demo_grid(FULL_REGION, 2024, 15)
        _ndvi_cache = {"data": data, "loading": False, "source": "demo"}


@router.get("/ndvi-grid-cache")
def get_ndvi_grid_cache():
    """
    Return cached NDVI grid for the full Taklimakan region.
    First call triggers a background fetch (~15-20s for GEE).
    Returns {"status": "loading"} while fetching.
    """
    if _ndvi_cache["data"] is not None:
        return {"status": "ready", "data": _ndvi_cache["data"], "source": _ndvi_cache["source"]}

    if not _ndvi_cache["loading"]:
        _ndvi_cache["loading"] = True
        thread = threading.Thread(target=_fetch_ndvi_grid_bg, daemon=True)
        thread.start()

    return {"status": "loading"}
