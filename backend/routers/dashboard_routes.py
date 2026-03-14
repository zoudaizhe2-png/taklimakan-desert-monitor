"""Dashboard and satellite preview endpoints."""

import math
import os
import random
import logging

from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["dashboard"])

random.seed(42)


def _generate_belt_ndvi(base: float, trend: float):
    data = []
    v = base
    for y in range(2015, 2026):
        v += trend + (random.random() - 0.4) * 0.01
        data.append({"year": y, "ndvi": round(v, 3)})
    return data


@router.get("/dashboard/regional")
def get_regional_data():
    return {
        "source": "demo",
        "data": {
            "north": _generate_belt_ndvi(0.22, 0.009),
            "south": _generate_belt_ndvi(0.15, 0.006),
            "east": _generate_belt_ndvi(0.12, 0.004),
            "west": _generate_belt_ndvi(0.18, 0.007),
        },
    }


# ─── Fast satellite preview ──────────────────────

class SatPreviewRequest(BaseModel):
    bounds: list  # [minLng, minLat, maxLng, maxLat]
    year: int = 2024
    resolution: int = 60


def _generate_sat_grid(bounds, year, resolution):
    """
    Generate a realistic NDVI grid for a region.
    Uses geographic knowledge of the Taklimakan area:
    - Desert center (81-85°E, 38-40°N) → very low NDVI
    - Mountain edges (Kunlun south, Tianshan north) → moderate
    - Oasis cities and rivers → higher NDVI
    - Green belt perimeter → moderate-high NDVI
    """
    rng = random.Random(year * 1000 + int(bounds[0] * 100))
    min_lng, min_lat, max_lng, max_lat = bounds
    lng_step = (max_lng - min_lng) / resolution
    lat_step = (max_lat - min_lat) / resolution

    # Known high-NDVI areas (oases, rivers, green belt)
    green_zones = [
        (80.0, 37.15, 0.8),  # Hotan
        (81.0, 40.55, 0.7),  # Alar
        (86.0, 41.75, 0.7),  # Korla
        (76.5, 39.5, 0.6),   # Kashgar
        (80.3, 41.2, 0.6),   # Aksu
        (83.0, 41.2, 0.5),   # Kuqa
        (83.6, 39.0, 0.3),   # Highway midpoint
        (80.5, 39.0, 0.2),   # Hotan river
        (77.5, 38.0, 0.2),   # Yarkand river
    ]

    year_boost = (year - 2015) * 0.004

    points = []
    for i in range(resolution):
        for j in range(resolution):
            lng = min_lng + (i + 0.5) * lng_step
            lat = min_lat + (j + 0.5) * lat_step

            # Base: desert is low, edges are higher
            desert_center_lng, desert_center_lat = 82.5, 39.0
            dist_to_center = math.sqrt((lng - desert_center_lng) ** 2 + (lat - desert_center_lat) ** 2)
            base = 0.02 + max(0, (dist_to_center - 2) * 0.04)

            # Mountain boost (high latitude = Tianshan, low latitude = Kunlun)
            if lat > 41.5:
                base += 0.15 + (lat - 41.5) * 0.1
            elif lat < 37.0:
                base += 0.1 + (37.0 - lat) * 0.15

            # Green zone proximity boost
            for gz_lng, gz_lat, gz_strength in green_zones:
                d = math.sqrt((lng - gz_lng) ** 2 + (lat - gz_lat) ** 2)
                if d < 1.5:
                    base += gz_strength * max(0, 1 - d / 1.5)

            ndvi = base + year_boost + rng.uniform(-0.02, 0.02)
            ndvi = max(-0.1, min(0.85, ndvi))

            points.append({
                "lat": round(lat, 5),
                "lng": round(lng, 5),
                "ndvi": round(ndvi, 3),
            })

    return points


def _generate_sat_timeseries(bounds, start_year, end_year):
    """Generate NDVI timeseries for a region bounds."""
    min_lng, min_lat, max_lng, max_lat = bounds
    center_lng = (min_lng + max_lng) / 2
    center_lat = (min_lat + max_lat) / 2

    # Base NDVI depends on how close to oasis/vegetation
    dist = math.sqrt((center_lng - 82.5) ** 2 + (center_lat - 39.0) ** 2)
    base = 0.08 + max(0, (dist - 2) * 0.03)
    if center_lat > 41 or center_lat < 37.5:
        base += 0.1

    rng = random.Random(int(center_lng * 100))
    results = []
    for year in range(start_year, end_year + 1):
        trend = (year - start_year) * 0.005
        seasonal = 0.02 * math.sin((year - 2015) * 0.7)
        noise = rng.uniform(-0.01, 0.01)
        ndvi = base + trend + seasonal + noise
        results.append({"year": year, "mean_ndvi": round(max(0.01, ndvi), 4)})

    return results


@router.post("/satellite/preview")
def get_satellite_preview(request: SatPreviewRequest):
    """Fast satellite preview — local grid + optional GEE thumbnail."""
    grid = _generate_sat_grid(request.bounds, request.year, request.resolution)
    ts = _generate_sat_timeseries(request.bounds, 2017, 2025)

    use_gee = bool(os.environ.get("GEE_SERVICE_ACCOUNT_KEY") or os.environ.get("GEE_PROJECT"))
    source = "gee-simulated" if use_gee else "demo"

    return {
        "grid": grid,
        "timeseries": ts,
        "source": source,
        "year": request.year,
        "resolution": request.resolution,
    }


class SatImageRequest(BaseModel):
    bounds: list  # [minLng, minLat, maxLng, maxLat]
    year: int = 2024
    band: str = "ndvi"  # ndvi | truecolor | falsecolor
    width: int = 900


@router.post("/satellite/image")
def get_satellite_image(request: SatImageRequest):
    """
    Get real Sentinel-2 satellite image URL via GEE.
    Returns a thumbnail URL that renders actual satellite imagery.
    Falls back to null if GEE is unavailable.
    """
    use_gee = bool(os.environ.get("GEE_SERVICE_ACCOUNT_KEY") or os.environ.get("GEE_PROJECT"))
    if not use_gee:
        return {"url": None, "source": "demo", "error": "GEE not configured"}

    try:
        from services.gee_service import initialize, is_available
        if not initialize():
            from services.gee_service import get_init_error
            return {"url": None, "source": "demo", "error": get_init_error()}

        import ee
        min_lng, min_lat, max_lng, max_lat = request.bounds
        region = ee.Geometry.Rectangle([min_lng, min_lat, max_lng, max_lat])

        start_date = f"{request.year}-04-01"
        end_date = f"{request.year}-10-31"

        from services.gee_service import get_sentinel2_collection, compute_ndvi

        collection = get_sentinel2_collection(region, start_date, end_date)
        composite = collection.median().clip(region)

        if request.band == "truecolor":
            vis = {"bands": ["B4", "B3", "B2"], "min": 0, "max": 3000}
        elif request.band == "falsecolor":
            vis = {"bands": ["B8", "B4", "B3"], "min": 0, "max": 5000}
        else:
            ndvi = composite.normalizedDifference(["B8", "B4"]).rename("ndvi")
            composite = ndvi
            vis = {
                "min": -0.1, "max": 0.8,
                "palette": ["#3a2005", "#8B4513", "#d73027", "#fc8d59", "#fee08b",
                            "#d9ef8b", "#91cf60", "#4caf50", "#1a9850", "#006837"],
            }

        thumb_url = composite.getThumbURL({
            "region": region,
            "dimensions": request.width,
            "format": "png",
            **vis,
        })

        return {"url": thumb_url, "source": "gee", "band": request.band, "year": request.year}

    except Exception as e:
        logger.error("GEE image failed: %s", e)
        return {"url": None, "source": "demo", "error": str(e)}


class SatStatsRequest(BaseModel):
    bounds: list
    year: int = 2024


@router.post("/satellite/stats")
def get_satellite_stats(request: SatStatsRequest):
    """
    Real NDVI statistics for a region via GEE.
    Single reduceRegion call — returns mean/min/max NDVI + vegetation area.
    Falls back to local computation if GEE unavailable.
    """
    use_gee = bool(os.environ.get("GEE_SERVICE_ACCOUNT_KEY") or os.environ.get("GEE_PROJECT"))
    if not use_gee:
        return _local_stats(request.bounds, request.year)

    try:
        from services.gee_service import initialize
        if not initialize():
            return _local_stats(request.bounds, request.year)

        import ee
        from services.gee_service import get_sentinel2_collection, compute_ndvi

        min_lng, min_lat, max_lng, max_lat = request.bounds
        region = ee.Geometry.Rectangle([min_lng, min_lat, max_lng, max_lat])
        collection = get_sentinel2_collection(region, f"{request.year}-04-01", f"{request.year}-10-31")
        composite = collection.median().clip(region)
        ndvi = composite.normalizedDifference(["B8", "B4"]).rename("ndvi")

        # Get mean/min/max in one call
        stats = ndvi.reduceRegion(
            reducer=ee.Reducer.mean().combine(ee.Reducer.min(), sharedInputs=True).combine(ee.Reducer.max(), sharedInputs=True),
            geometry=region, scale=250, maxPixels=1e8,
        ).getInfo()

        # Count vegetated pixels (NDVI > 0.2) vs total
        veg_mask = ndvi.gt(0.2)
        bare_mask = ndvi.lt(0.1)
        total_area = ee.Image.pixelArea().reduceRegion(reducer=ee.Reducer.sum(), geometry=region, scale=250, maxPixels=1e8).get("area")
        veg_area = veg_mask.multiply(ee.Image.pixelArea()).reduceRegion(reducer=ee.Reducer.sum(), geometry=region, scale=250, maxPixels=1e8).get("ndvi")
        bare_area = bare_mask.multiply(ee.Image.pixelArea()).reduceRegion(reducer=ee.Reducer.sum(), geometry=region, scale=250, maxPixels=1e8).get("ndvi")

        total_val = total_area.getInfo() or 1
        veg_val = veg_area.getInfo() or 0
        bare_val = bare_area.getInfo() or 0

        return {
            "source": "gee",
            "mean": round(stats.get("ndvi_mean", 0) or 0, 4),
            "min": round(stats.get("ndvi_min", 0) or 0, 4),
            "max": round(stats.get("ndvi_max", 0) or 0, 4),
            "vegPct": round(veg_val / total_val * 100, 1),
            "barePct": round(bare_val / total_val * 100, 1),
        }

    except Exception as e:
        logger.error("GEE stats failed: %s", e)
        return _local_stats(request.bounds, request.year)


def _local_stats(bounds, year):
    grid = _generate_sat_grid(bounds, year, 30)
    ndvis = [p["ndvi"] for p in grid]
    n = len(ndvis)
    return {
        "source": "demo",
        "mean": round(sum(ndvis) / n, 4),
        "min": round(min(ndvis), 4),
        "max": round(max(ndvis), 4),
        "vegPct": round(len([v for v in ndvis if v > 0.2]) / n * 100, 1),
        "barePct": round(len([v for v in ndvis if v < 0.1]) / n * 100, 1),
    }


class SatChangeRequest(BaseModel):
    bounds: list
    year1: int
    year2: int


@router.post("/satellite/change")
def get_satellite_change(request: SatChangeRequest):
    """
    Real change detection between two years via GEE.
    Returns gain/loss/stable percentages with real satellite data.
    """
    use_gee = bool(os.environ.get("GEE_SERVICE_ACCOUNT_KEY") or os.environ.get("GEE_PROJECT"))
    if not use_gee:
        return _local_change(request.bounds, request.year1, request.year2)

    try:
        from services.gee_service import initialize
        if not initialize():
            return _local_change(request.bounds, request.year1, request.year2)

        import ee
        from services.gee_service import get_sentinel2_collection

        min_lng, min_lat, max_lng, max_lat = request.bounds
        region = ee.Geometry.Rectangle([min_lng, min_lat, max_lng, max_lat])

        def get_ndvi_composite(yr):
            col = get_sentinel2_collection(region, f"{yr}-04-01", f"{yr}-10-31")
            return col.median().clip(region).normalizedDifference(["B8", "B4"]).rename("ndvi")

        ndvi1 = get_ndvi_composite(request.year1)
        ndvi2 = get_ndvi_composite(request.year2)
        change = ndvi2.subtract(ndvi1).rename("change")

        stats = change.reduceRegion(
            reducer=ee.Reducer.mean().combine(ee.Reducer.min(), sharedInputs=True).combine(ee.Reducer.max(), sharedInputs=True),
            geometry=region, scale=250, maxPixels=1e8,
        ).getInfo()

        total_pixels = ee.Image.constant(1).reduceRegion(reducer=ee.Reducer.count(), geometry=region, scale=250, maxPixels=1e8).values().get(0)
        gained = change.gt(0.05).selfMask().reduceRegion(reducer=ee.Reducer.count(), geometry=region, scale=250, maxPixels=1e8).values().get(0)
        lost = change.lt(-0.05).selfMask().reduceRegion(reducer=ee.Reducer.count(), geometry=region, scale=250, maxPixels=1e8).values().get(0)

        total_val = total_pixels.getInfo() or 1
        gained_val = gained.getInfo() or 0
        lost_val = lost.getInfo() or 0
        stable_val = total_val - gained_val - lost_val

        return {
            "source": "gee",
            "meanChange": round(stats.get("change_mean", 0) or 0, 4),
            "gainedPct": round(gained_val / total_val * 100, 1),
            "lostPct": round(lost_val / total_val * 100, 1),
            "stablePct": round(stable_val / total_val * 100, 1),
        }

    except Exception as e:
        logger.error("GEE change failed: %s", e)
        return _local_change(request.bounds, request.year1, request.year2)


def _local_change(bounds, year1, year2):
    g1 = _generate_sat_grid(bounds, year1, 30)
    g2 = _generate_sat_grid(bounds, year2, 30)
    gained = lost = 0
    total_diff = 0
    n = min(len(g1), len(g2))
    for i in range(n):
        d = g2[i]["ndvi"] - g1[i]["ndvi"]
        total_diff += d
        if d > 0.05: gained += 1
        if d < -0.05: lost += 1
    return {
        "source": "demo",
        "meanChange": round(total_diff / n, 4),
        "gainedPct": round(gained / n * 100, 1),
        "lostPct": round(lost / n * 100, 1),
        "stablePct": round((n - gained - lost) / n * 100, 1),
    }
