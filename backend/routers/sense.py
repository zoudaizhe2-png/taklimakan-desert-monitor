"""
L1 sense-layer endpoints under `/api/v1/sense/*`.

Surfaces SRTM (terrain), ERA5 (climate), SMAP (soil moisture), and recaptures
the existing Sentinel-2 NDVI value through one combined `/multi` endpoint that
the L3 decision engine can hit per call.

Each endpoint:
  - Validates geometry against the Taklimakan bounding box (re-uses
    `routers.analysis._validate_geometry`).
  - Wraps every GEE call in `asyncio.to_thread` so the worker thread does not
    block the event loop.
  - Falls back to deterministic demo values from `services.sense_demo` when GEE
    is not configured or any GEE call raises.
  - Caches per-geometry+param results via `cache.cached()` with a TTL that
    matches the underlying data freshness (SRTM static = 1 day; rainfall +
    temperature = 1 hour; soil moisture = 15 min).
  - Rate limited to 20 requests/minute (same per-IP token bucket as analysis).
"""

import asyncio
import hashlib
import json
import logging
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Request
from pydantic import BaseModel, field_validator

from cache import cached
from rate_limit import limiter
from routers.analysis import _validate_geometry, _validate_year
from schemas.sense import (
    DroughtResponse,
    ElevationResponse,
    MultiSenseResponse,
    NDVIResponse,
    RainfallResponse,
    SlopeResponse,
    SoilMoistureResponse,
    TemperatureResponse,
)
from services import sense_demo

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/sense", tags=["sense"])

# Auto-detect: GEE is "wired" when env vars are present. The actual init+failure
# handling happens lazily inside the per-endpoint try/except so a misconfigured
# GEE never breaks the demo path.
_USE_GEE = bool(os.environ.get("GEE_SERVICE_ACCOUNT_KEY") or os.environ.get("GEE_PROJECT"))

_gee_ready = False
if _USE_GEE:
    try:
        from services.gee import initialize, get_init_error  # noqa: E402
        _gee_ready = initialize()
        if _gee_ready:
            logger.info("L1 sense: GEE active")
        else:
            logger.warning("L1 sense: GEE init failed: %s -- demo fallback engaged", get_init_error())
    except Exception as e:
        logger.warning("L1 sense: GEE import failed: %s -- demo fallback engaged", e)


def _use_gee() -> bool:
    return _USE_GEE and _gee_ready


# ─── Cache TTLs (seconds) ────────────────────────────

_TTL_TERRAIN = 86400      # static dataset, 1 day is overkill but cheap
_TTL_RAINFALL = 3600      # ERA5 monthly aggregate updates rarely
_TTL_TEMPERATURE = 3600
_TTL_DROUGHT = 3600
_TTL_SOIL_MOISTURE = 900  # 15 min -- SMAP latency is ~50 hours but users may poll
_TTL_NDVI = 3600
_TTL_MULTI = 900          # multi-sense composite expires with the most volatile child


def _cache_key(prefix: str, geometry: dict, **kwargs) -> str:
    """Stable cache key for (geometry, params)."""
    payload = {"geometry": geometry, **kwargs}
    digest = hashlib.sha1(json.dumps(payload, sort_keys=True).encode()).hexdigest()[:16]
    return f"sense:{prefix}:{digest}"


# ─── Request models ──────────────────────────────────


class GeometryOnlyRequest(BaseModel):
    geometry: dict

    @field_validator("geometry")
    @classmethod
    def check_geometry(cls, v):
        return _validate_geometry(v)


class YearRequest(BaseModel):
    geometry: dict
    year: int = 2024

    @field_validator("geometry")
    @classmethod
    def check_geometry(cls, v):
        return _validate_geometry(v)

    @field_validator("year")
    @classmethod
    def check_year(cls, v):
        return _validate_year(v)


class DroughtRequest(BaseModel):
    geometry: dict
    months_back: int = 12

    @field_validator("geometry")
    @classmethod
    def check_geometry(cls, v):
        return _validate_geometry(v)

    @field_validator("months_back")
    @classmethod
    def check_months_back(cls, v):
        if v < 1 or v > 60:
            raise ValueError("months_back must be between 1 and 60")
        return v


# ─── Endpoint helpers ────────────────────────────────


async def _elevation(geometry: dict) -> ElevationResponse:
    if _use_gee():
        try:
            from services.gee import get_elevation
            value = await asyncio.to_thread(get_elevation, geometry)
            return ElevationResponse(elevation_m=value, source="gee")
        except Exception as e:
            logger.error("L1 sense elevation GEE error: %s -- demo fallback", e)
    value = await asyncio.to_thread(sense_demo.demo_elevation, geometry)
    return ElevationResponse(elevation_m=value, source="demo")


async def _slope(geometry: dict) -> SlopeResponse:
    if _use_gee():
        try:
            from services.gee import get_slope_aspect
            data = await asyncio.to_thread(get_slope_aspect, geometry)
            return SlopeResponse(
                slope_degrees=data["slope_degrees"],
                aspect=data["aspect"],
                aspect_degrees=data["aspect_degrees"],
                source="gee",
            )
        except Exception as e:
            logger.error("L1 sense slope GEE error: %s -- demo fallback", e)
    data = await asyncio.to_thread(sense_demo.demo_slope, geometry)
    return SlopeResponse(
        slope_degrees=data["slope_degrees"],
        aspect=data["aspect"],
        aspect_degrees=data["aspect_degrees"],
        source="demo",
    )


async def _rainfall(geometry: dict, year: int) -> RainfallResponse:
    if _use_gee():
        try:
            from services.gee import get_annual_rainfall_mm
            value = await asyncio.to_thread(get_annual_rainfall_mm, geometry, year)
            return RainfallResponse(annual_mm=value, year=year, source="gee")
        except Exception as e:
            logger.error("L1 sense rainfall GEE error: %s -- demo fallback", e)
    value = await asyncio.to_thread(sense_demo.demo_rainfall, geometry, year)
    return RainfallResponse(annual_mm=value, year=year, source="demo")


async def _temperature(geometry: dict, year: int) -> TemperatureResponse:
    if _use_gee():
        try:
            from services.gee import get_temperature_extremes
            data = await asyncio.to_thread(get_temperature_extremes, geometry, year)
            return TemperatureResponse(
                max_c=data["max_c"],
                min_c=data["min_c"],
                hot_days_ge_40=data["hot_days_ge_40"],
                year=year,
                source="gee",
            )
        except Exception as e:
            logger.error("L1 sense temperature GEE error: %s -- demo fallback", e)
    data = await asyncio.to_thread(sense_demo.demo_temperature, geometry, year)
    return TemperatureResponse(
        max_c=data["max_c"],
        min_c=data["min_c"],
        hot_days_ge_40=data["hot_days_ge_40"],
        year=year,
        source="demo",
    )


async def _drought(geometry: dict, months_back: int) -> DroughtResponse:
    if _use_gee():
        try:
            from services.gee import get_recent_drought_index
            value = await asyncio.to_thread(get_recent_drought_index, geometry, months_back)
            return DroughtResponse(drought_index=value, months_back=months_back, source="gee")
        except Exception as e:
            logger.error("L1 sense drought GEE error: %s -- demo fallback", e)
    value = await asyncio.to_thread(sense_demo.demo_drought, geometry, months_back)
    return DroughtResponse(drought_index=value, months_back=months_back, source="demo")


async def _soil_moisture(geometry: dict) -> SoilMoistureResponse:
    if _use_gee():
        try:
            from services.gee import get_soil_moisture_now, get_soil_moisture_anomaly
            sm_now = await asyncio.to_thread(get_soil_moisture_now, geometry)
            anomaly = await asyncio.to_thread(get_soil_moisture_anomaly, geometry)
            return SoilMoistureResponse(
                volumetric_fraction=sm_now,
                anomaly_z=anomaly,
                last_updated=datetime.now(timezone.utc),
                source="gee",
            )
        except Exception as e:
            logger.error("L1 sense soil moisture GEE error: %s -- demo fallback", e)
    data = await asyncio.to_thread(sense_demo.demo_soil_moisture, geometry)
    return SoilMoistureResponse(
        volumetric_fraction=data["volumetric_fraction"],
        anomaly_z=data["anomaly_z"],
        last_updated=data["last_updated"],
        source="demo",
    )


async def _ndvi(geometry: dict, year: int) -> NDVIResponse:
    """
    NDVI re-cap for the multi-sense composite. Re-uses the existing Sentinel-2
    pipeline and falls back to a centroid-based demo value otherwise.
    """
    if _use_gee():
        try:
            from services.gee import get_ndvi_timeseries
            data = await asyncio.to_thread(get_ndvi_timeseries, geometry, year, year)
            mean = data[0].get("mean_ndvi") if data else None
            if mean is not None:
                return NDVIResponse(mean_ndvi=float(mean), year=year, source="gee")
        except Exception as e:
            logger.error("L1 sense NDVI GEE error: %s -- demo fallback", e)
    value = await asyncio.to_thread(sense_demo.demo_ndvi, geometry, year)
    return NDVIResponse(mean_ndvi=value, year=year, source="demo")


# ─── Endpoints ───────────────────────────────────────


@router.post("/elevation", response_model=ElevationResponse)
@limiter.limit("20/minute")
async def post_elevation(request: Request, body: GeometryOnlyRequest) -> ElevationResponse:
    key = _cache_key("elevation", body.geometry)
    return await cached(key, _TTL_TERRAIN, lambda: _elevation(body.geometry))


@router.post("/slope", response_model=SlopeResponse)
@limiter.limit("20/minute")
async def post_slope(request: Request, body: GeometryOnlyRequest) -> SlopeResponse:
    key = _cache_key("slope", body.geometry)
    return await cached(key, _TTL_TERRAIN, lambda: _slope(body.geometry))


@router.post("/rainfall", response_model=RainfallResponse)
@limiter.limit("20/minute")
async def post_rainfall(request: Request, body: YearRequest) -> RainfallResponse:
    key = _cache_key("rainfall", body.geometry, year=body.year)
    return await cached(key, _TTL_RAINFALL, lambda: _rainfall(body.geometry, body.year))


@router.post("/temperature", response_model=TemperatureResponse)
@limiter.limit("20/minute")
async def post_temperature(request: Request, body: YearRequest) -> TemperatureResponse:
    key = _cache_key("temperature", body.geometry, year=body.year)
    return await cached(key, _TTL_TEMPERATURE, lambda: _temperature(body.geometry, body.year))


@router.post("/drought", response_model=DroughtResponse)
@limiter.limit("20/minute")
async def post_drought(request: Request, body: DroughtRequest) -> DroughtResponse:
    key = _cache_key("drought", body.geometry, months_back=body.months_back)
    return await cached(key, _TTL_DROUGHT, lambda: _drought(body.geometry, body.months_back))


@router.post("/soil-moisture", response_model=SoilMoistureResponse)
@limiter.limit("20/minute")
async def post_soil_moisture(request: Request, body: GeometryOnlyRequest) -> SoilMoistureResponse:
    key = _cache_key("soil_moisture", body.geometry)
    return await cached(key, _TTL_SOIL_MOISTURE, lambda: _soil_moisture(body.geometry))


@router.post("/multi", response_model=MultiSenseResponse)
@limiter.limit("20/minute")
async def post_multi(request: Request, body: YearRequest) -> MultiSenseResponse:
    """
    One-shot composite: elevation + slope + rainfall + temperature +
    soil moisture + NDVI for the supplied geometry / year. Used by the L3
    decision engine to fetch every input it needs in a single round trip.
    """
    key = _cache_key("multi", body.geometry, year=body.year)

    async def _build():
        elevation, slope, rainfall, temperature, soil_moisture, ndvi = await asyncio.gather(
            _elevation(body.geometry),
            _slope(body.geometry),
            _rainfall(body.geometry, body.year),
            _temperature(body.geometry, body.year),
            _soil_moisture(body.geometry),
            _ndvi(body.geometry, body.year),
        )
        return MultiSenseResponse(
            elevation=elevation,
            slope=slope,
            rainfall=rainfall,
            temperature=temperature,
            soil_moisture=soil_moisture,
            ndvi=ndvi,
        )

    return await cached(key, _TTL_MULTI, _build)
