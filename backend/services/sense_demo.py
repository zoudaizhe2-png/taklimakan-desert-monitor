"""
Demo-mode fallbacks for the L1 sense layer.

Returned when GEE is not configured / GEE call fails. Numbers are anchored to
the Taklimakan basin physical envelope and to the existing `_generate_sat_grid`
"green zones" logic in routers/dashboard_routes.py:

  - Desert centre (~82.5 E, 39.0 N) sits at 800-1500 m elevation.
  - Mountain edges (Kunlun south, Tianshan north) climb past 2000-4000 m.
  - Annual rainfall < 100 mm across the desert proper, 200-400 mm in foothill belts.
  - Hot days >= 40 C: 30-60 per year is typical for the basin floor in summer.
  - Soil moisture sits at 0.05-0.15 m^3/m^3 across the desert.

These values let downstream code (and the L3 engine) exercise the full pipeline
without GEE credentials -- they should never be presented to end users as truth.
"""

import math
import random
from datetime import datetime, timezone


# Centre point of the Taklimakan Desert basin
_BASIN_CENTER_LNG = 82.5
_BASIN_CENTER_LAT = 39.0

# Known oasis / green zones, mirrored from routers/dashboard_routes.py
_GREEN_ZONES = [
    (80.0, 37.15, 0.8),  # Hotan
    (81.0, 40.55, 0.7),  # Alar
    (86.0, 41.75, 0.7),  # Korla
    (76.5, 39.5, 0.6),   # Kashgar
    (80.3, 41.2, 0.6),   # Aksu
    (83.0, 41.2, 0.5),   # Kuqa
]


def _centroid(geometry: dict) -> tuple:
    """Approximate centroid of a GeoJSON Polygon/Point as (lng, lat)."""
    if geometry.get("type") == "Point":
        c = geometry["coordinates"]
        return float(c[0]), float(c[1])
    coords = geometry["coordinates"][0]
    lngs = [c[0] for c in coords]
    lats = [c[1] for c in coords]
    return sum(lngs) / len(lngs), sum(lats) / len(lats)


def _green_zone_proximity(lng: float, lat: float) -> float:
    """0..1 boost for proximity to known oasis centres (max strength 0.8)."""
    boost = 0.0
    for gz_lng, gz_lat, gz_strength in _GREEN_ZONES:
        d = math.sqrt((lng - gz_lng) ** 2 + (lat - gz_lat) ** 2)
        if d < 1.5:
            boost += gz_strength * max(0.0, 1.0 - d / 1.5)
    return min(boost, 1.0)


def demo_elevation(geometry: dict) -> float:
    """
    800-1500 m on basin floor; rises to 2000-4000 m+ near Kunlun (south) /
    Tianshan (north). Pure deterministic function of centroid.
    """
    lng, lat = _centroid(geometry)
    base = 1100.0  # mid-basin baseline
    # Mountain proximity boost: Tianshan north (lat > 41), Kunlun south (lat < 37)
    if lat > 41.5:
        base += (lat - 41.5) * 800
    elif lat < 37.0:
        base += (37.0 - lat) * 1500
    # Tiny noise so unit tests don't see identical numbers across regions
    rng = random.Random(int(lng * 100 + lat * 1000))
    base += rng.uniform(-50.0, 50.0)
    return round(max(50.0, base), 1)


def demo_slope(geometry: dict) -> dict:
    """
    Basin floor: ~0.5 deg, mostly south-facing. Mountain edges: 5-15 deg.
    """
    lng, lat = _centroid(geometry)
    if lat > 41.5 or lat < 37.0:
        slope = 8.0 + abs(lat - 39.0) * 0.5
        aspect_label = "S" if lat > 39 else "N"
        aspect_deg = 180.0 if aspect_label == "S" else 0.0
    else:
        slope = 0.5
        aspect_label = "flat"
        aspect_deg = -1.0
    return {"slope_degrees": round(slope, 2), "aspect": aspect_label, "aspect_degrees": aspect_deg}


def demo_rainfall(geometry: dict, year: int) -> float:
    """
    < 100 mm across desert proper; 200-400 mm in foothill belts.
    Year-to-year jitter +- 15 % seeded by year so calls are reproducible.
    """
    lng, lat = _centroid(geometry)
    if lat > 41.5 or lat < 37.0:
        base = 250.0
    elif _green_zone_proximity(lng, lat) > 0.3:
        base = 80.0
    else:
        base = 30.0
    rng = random.Random(year)
    base *= 1.0 + rng.uniform(-0.15, 0.15)
    return round(base, 1)


def demo_temperature(geometry: dict, year: int) -> dict:
    """
    Basin floor summers can hit 45 C; winters drop to -15 C; ~40-60 hot days/year.
    """
    lng, lat = _centroid(geometry)
    if lat > 41.5 or lat < 37.0:
        max_c, min_c, hot_days = 32.0, -25.0, 5
    else:
        max_c, min_c, hot_days = 45.0, -15.0, 50
    rng = random.Random(year)
    max_c += rng.uniform(-1.5, 1.5)
    min_c += rng.uniform(-2.0, 2.0)
    hot_days += rng.randint(-10, 10)
    return {"max_c": round(max_c, 1), "min_c": round(min_c, 1), "hot_days_ge_40": max(0, hot_days)}


def demo_drought(geometry: dict, months_back: int = 12) -> float:
    """
    Deficit score 0..1; deserts default 0.3-0.6 (mildly to moderately deficient).
    """
    lng, lat = _centroid(geometry)
    rng = random.Random(int(lng * 1000 + lat * 100 + months_back))
    if lat > 41.5 or lat < 37.0:
        base = 0.2
    else:
        base = 0.5
    return round(min(1.0, max(0.0, base + rng.uniform(-0.1, 0.15))), 3)


def demo_soil_moisture(geometry: dict) -> dict:
    """
    0.05-0.15 m^3/m^3 in desert proper; up to 0.3 in oasis edges. Anomaly ~0 +- 1.
    """
    lng, lat = _centroid(geometry)
    gz_boost = _green_zone_proximity(lng, lat)
    if lat > 41.5 or lat < 37.0:
        base = 0.18
    else:
        base = 0.07
    base += gz_boost * 0.15
    rng = random.Random(int(lng * 100 + lat * 1000))
    base += rng.uniform(-0.02, 0.02)
    anomaly = rng.uniform(-1.0, 1.0)
    return {
        "volumetric_fraction": round(min(0.45, max(0.0, base)), 4),
        "anomaly_z": round(anomaly, 2),
        "last_updated": datetime.now(timezone.utc),
    }


def demo_ndvi(geometry: dict, year: int) -> float:
    """
    NDVI: 0.05-0.15 across desert proper; up to 0.4-0.6 in oasis belts. Slow
    upward trend year over year mirrors the existing demo timeseries logic.
    """
    lng, lat = _centroid(geometry)
    gz_boost = _green_zone_proximity(lng, lat)
    if lat > 41.5 or lat < 37.0:
        base = 0.2
    else:
        base = 0.08
    base += gz_boost * 0.4
    base += (year - 2015) * 0.005
    return round(min(0.85, max(0.01, base)), 4)
