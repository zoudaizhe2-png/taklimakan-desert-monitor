"""
Response schemas for `/api/v1/sense/*` endpoints.

Each model carries a `source` discriminator string ("gee" | "demo") so callers --
including the L3 decision engine -- can tell whether the value came from real
satellite data or from the static demo fallback.
"""

from datetime import datetime

from pydantic import BaseModel, Field


# ─── Single-variable responses ───────────────────────────


class ElevationResponse(BaseModel):
    elevation_m: float = Field(..., description="Mean elevation above sea level (m).")
    source: str = Field(..., description="'gee' | 'demo'")


class SlopeResponse(BaseModel):
    slope_degrees: float = Field(..., description="Mean terrain slope (deg).")
    aspect: str = Field(..., description="Dominant compass aspect: N/NE/E/SE/S/SW/W/NW or 'flat'.")
    aspect_degrees: float | None = Field(None, description="Raw aspect azimuth (0-360 deg, -1 = flat).")
    source: str


class RainfallResponse(BaseModel):
    annual_mm: float = Field(..., description="Total annual rainfall (mm).")
    year: int
    source: str


class TemperatureResponse(BaseModel):
    max_c: float = Field(..., description="Annual max of monthly mean of daily-max 2 m temp (C).")
    min_c: float = Field(..., description="Annual min of monthly mean of daily-min 2 m temp (C).")
    hot_days_ge_40: int = Field(..., description="Approx days with hourly 2 m temp >= 40 C.")
    year: int
    source: str


class DroughtResponse(BaseModel):
    drought_index: float = Field(..., ge=0.0, le=1.0, description="0 = normal/wet, 1 = severe drought.")
    months_back: int
    source: str


class SoilMoistureResponse(BaseModel):
    volumetric_fraction: float = Field(..., description="Soil moisture (m^3/m^3).")
    anomaly_z: float = Field(..., description="Z-score vs trailing 365-day mean/std.")
    last_updated: datetime
    source: str


# ─── NDVI re-cap (so multi-sense can carry the existing Sentinel-2 signal) ───


class NDVIResponse(BaseModel):
    mean_ndvi: float = Field(..., description="Annual growing-season mean NDVI [-1, 1].")
    year: int
    source: str


# ─── Combined multi-sense response ───────────────────────


class MultiSenseResponse(BaseModel):
    elevation: ElevationResponse
    slope: SlopeResponse
    rainfall: RainfallResponse
    temperature: TemperatureResponse
    soil_moisture: SoilMoistureResponse
    ndvi: NDVIResponse
