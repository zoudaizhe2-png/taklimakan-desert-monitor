"""
SRTM Global 1 arc-second elevation / slope / aspect.

Dataset: USGS/SRTMGL1_003
  - 30m spatial resolution, near-global coverage 60 N - 56 S
  - Static (collected 2000-02), already void-filled with ASTER GDEM2 / GMTED2010 / NED
  - Built-in ee.Terrain.slope / aspect / hillshade for derived layers

The Taklimakan Desert main body sits at 800-1500 m; surrounding Kunlun and Tianshan
ranges climb past 7000 m. SRTM quality is good across the basin, with minor data
voids over active dune fields (already void-filled in V003).
"""

import logging

from ._client import _ee_available

if _ee_available:
    import ee  # noqa: F401
else:
    ee = None

logger = logging.getLogger(__name__)

_SRTM_ASSET = "USGS/SRTMGL1_003"
_DEFAULT_SCALE = 30  # native SRTM resolution


def _aspect_to_compass(degrees):
    """Convert aspect azimuth (0-360, 0=North) into 8-point compass label."""
    if degrees is None:
        return "flat"
    if degrees < 0:
        return "flat"
    sectors = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    idx = int(((degrees % 360) + 22.5) // 45) % 8
    return sectors[idx]


def get_elevation(geometry: dict) -> float:
    """
    Mean elevation (meters above sea level) over the supplied geometry.
    """
    region = ee.Geometry(geometry)
    dem = ee.Image(_SRTM_ASSET)
    val = (
        dem.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=region,
            scale=_DEFAULT_SCALE,
            maxPixels=1e9,
        )
        .get("elevation")
        .getInfo()
    )
    return round(float(val), 1) if val is not None else 0.0


def get_slope_aspect(geometry: dict) -> dict:
    """
    Mean slope (degrees) and dominant aspect (compass label) over the supplied geometry.

    Returns
    -------
    dict
        {"slope_degrees": float, "aspect_degrees": float, "aspect": str}
        Aspect label is one of N/NE/E/SE/S/SW/W/NW or "flat".
    """
    region = ee.Geometry(geometry)
    dem = ee.Image(_SRTM_ASSET)

    slope = ee.Terrain.slope(dem)
    aspect = ee.Terrain.aspect(dem)

    slope_val = (
        slope.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=region,
            scale=_DEFAULT_SCALE,
            maxPixels=1e9,
        )
        .get("slope")
        .getInfo()
    )

    aspect_val = (
        aspect.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=region,
            scale=_DEFAULT_SCALE,
            maxPixels=1e9,
        )
        .get("aspect")
        .getInfo()
    )

    return {
        "slope_degrees": round(float(slope_val), 2) if slope_val is not None else 0.0,
        "aspect_degrees": round(float(aspect_val), 2) if aspect_val is not None else -1.0,
        "aspect": _aspect_to_compass(aspect_val),
    }


def get_terrain_grid(geometry: dict, resolution: int = 30) -> list:
    """
    Sample elevation/slope on a grid across the bounding box of `geometry`.

    Returns
    -------
    list[dict]
        [{"lat": float, "lng": float, "elevation_m": float, "slope_degrees": float}, ...]
    """
    region = ee.Geometry(geometry)
    dem = ee.Image(_SRTM_ASSET)
    slope = ee.Terrain.slope(dem)
    combined = dem.addBands(slope).rename(["elevation", "slope"])

    coords = geometry["coordinates"][0]
    min_lng = min(c[0] for c in coords)
    max_lng = max(c[0] for c in coords)
    min_lat = min(c[1] for c in coords)
    max_lat = max(c[1] for c in coords)

    lng_step = (max_lng - min_lng) / resolution
    lat_step = (max_lat - min_lat) / resolution

    points = []
    for i in range(resolution):
        for j in range(resolution):
            lng = min_lng + (i + 0.5) * lng_step
            lat = min_lat + (j + 0.5) * lat_step
            points.append(ee.Feature(ee.Geometry.Point([lng, lat])))

    fc = ee.FeatureCollection(points)
    sampled = combined.sampleRegions(collection=fc, scale=_DEFAULT_SCALE, geometries=True)

    results = []
    try:
        for f in sampled.getInfo()["features"]:
            c = f["geometry"]["coordinates"]
            elev = f["properties"].get("elevation")
            slp = f["properties"].get("slope")
            results.append({
                "lat": round(c[1], 5),
                "lng": round(c[0], 5),
                "elevation_m": round(float(elev), 1) if elev is not None else None,
                "slope_degrees": round(float(slp), 2) if slp is not None else None,
            })
    except Exception as e:
        logger.warning("SRTM terrain grid sampling failed: %s", e)

    return results
