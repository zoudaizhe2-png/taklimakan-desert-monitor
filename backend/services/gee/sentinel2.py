"""
Sentinel-2 NDVI helpers.

Dataset: COPERNICUS/S2_SR_HARMONIZED
  - 10m spatial resolution, growing season April–October
  - Cloud masking via Scene Classification Layer (SCL)
"""

import logging

from ._client import _ee_available

if _ee_available:
    import ee  # noqa: F401  (re-imported by callers; kept here for type clarity)
else:
    ee = None

logger = logging.getLogger(__name__)


def get_sentinel2_collection(region, start_date, end_date):
    """Cloud-masked Sentinel-2 SR collection. Filters to <20% cloud cover."""
    collection = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(region)
        .filterDate(start_date, end_date)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
    )

    def mask_clouds(image):
        scl = image.select("SCL")
        mask = scl.neq(3).And(scl.neq(8)).And(scl.neq(9)).And(scl.neq(10))
        return image.updateMask(mask)

    return collection.map(mask_clouds)


def compute_ndvi(image):
    """NDVI = (B8 - B4) / (B8 + B4)"""
    return image.normalizedDifference(["B8", "B4"]).rename("ndvi")


def get_ndvi_composite(region_geojson, start_date, end_date):
    """Median NDVI composite for a region/date range. Reduces noise from single-date artifacts."""
    region = ee.Geometry(region_geojson)
    collection = get_sentinel2_collection(region, start_date, end_date)
    ndvi_col = collection.map(lambda img: compute_ndvi(img).copyProperties(img, ["system:time_start"]))
    return ndvi_col.median().clip(region)


def get_ndvi_timeseries(region_geojson, start_year, end_year):
    """Yearly mean NDVI for growing season (April–October). Returns [{year, mean_ndvi}, ...]."""
    region = ee.Geometry(region_geojson)
    results = []

    for year in range(start_year, end_year + 1):
        try:
            collection = get_sentinel2_collection(region, f"{year}-04-01", f"{year}-10-31")
            if collection.size().getInfo() == 0:
                results.append({"year": year, "mean_ndvi": None})
                continue

            ndvi_col = collection.map(lambda img: compute_ndvi(img).copyProperties(img, ["system:time_start"]))
            val = (
                ndvi_col.mean()
                .reduceRegion(reducer=ee.Reducer.mean(), geometry=region, scale=100, maxPixels=1e9)
                .get("ndvi")
                .getInfo()
            )
            results.append({"year": year, "mean_ndvi": round(val, 4) if val is not None else None})
        except Exception as e:
            logger.warning("NDVI timeseries year %d failed: %s", year, e)
            results.append({"year": year, "mean_ndvi": None})

    return results


def get_ndvi_change(region_geojson, year1, year2):
    """
    Change analysis between two years.
    Returns mean/min/max change + improved/degraded area in km².
    Significant change threshold: ±0.05 NDVI.
    """
    region = ee.Geometry(region_geojson)

    c1 = get_ndvi_composite(region_geojson, f"{year1}-04-01", f"{year1}-10-31")
    c2 = get_ndvi_composite(region_geojson, f"{year2}-04-01", f"{year2}-10-31")
    change = c2.subtract(c1).rename("ndvi_change")

    stats = change.reduceRegion(
        reducer=ee.Reducer.mean().combine(ee.Reducer.min(), sharedInputs=True).combine(ee.Reducer.max(), sharedInputs=True),
        geometry=region, scale=100, maxPixels=1e9,
    ).getInfo()

    improved_area = (
        change.gt(0.05).selfMask().multiply(ee.Image.pixelArea())
        .reduceRegion(reducer=ee.Reducer.sum(), geometry=region, scale=100, maxPixels=1e9)
        .get("ndvi_change")
    )
    degraded_area = (
        change.lt(-0.05).selfMask().multiply(ee.Image.pixelArea())
        .reduceRegion(reducer=ee.Reducer.sum(), geometry=region, scale=100, maxPixels=1e9)
        .get("ndvi_change")
    )

    return {
        "year1": year1,
        "year2": year2,
        "mean_change": round(stats.get("ndvi_change_mean", 0) or 0, 4),
        "min_change": round(stats.get("ndvi_change_min", 0) or 0, 4),
        "max_change": round(stats.get("ndvi_change_max", 0) or 0, 4),
        "improved_area_sqkm": round((improved_area.getInfo() or 0) / 1e6, 1),
        "degraded_area_sqkm": round((degraded_area.getInfo() or 0) / 1e6, 1),
    }


def get_ndvi_grid(region_geojson, year, resolution=40):
    """
    Sample NDVI on a grid for heatmap visualization.
    Returns [{lat, lng, ndvi}, ...] points.
    """
    composite = get_ndvi_composite(region_geojson, f"{year}-04-01", f"{year}-10-31")

    coords = region_geojson["coordinates"][0]
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
    sampled = composite.sampleRegions(collection=fc, scale=100, geometries=True)

    results = []
    try:
        for f in sampled.getInfo()["features"]:
            c = f["geometry"]["coordinates"]
            ndvi = f["properties"].get("ndvi")
            if ndvi is not None:
                results.append({"lat": round(c[1], 5), "lng": round(c[0], 5), "ndvi": round(ndvi, 3)})
    except Exception as e:
        logger.warning("NDVI grid sampling failed: %s", e)

    return results


def get_ndvi_tile_url(region_geojson, start_date, end_date):
    """Tile URL for rendering NDVI layer on a web map. Returns {z}/{x}/{y} URL template."""
    composite = get_ndvi_composite(region_geojson, start_date, end_date)
    vis_params = {
        "min": -0.1, "max": 0.8,
        "palette": ["#d73027", "#fc8d59", "#fee08b", "#d9ef8b", "#91cf60", "#1a9850"],
    }
    return composite.getMapId(vis_params)["tile_fetcher"].url_format
