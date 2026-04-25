"""
SMAP soil moisture (NASA Soil Moisture Active Passive).

Dataset: NASA/SMAP/SPL3SMP_E/006 -- L3 Enhanced Daily 9 km, 2023-12 -> present.

Bands of interest:
  * soil_moisture_am  -- descending pass (~6am local), volumetric water content (m^3/m^3)
  * soil_moisture_pm  -- ascending  pass (~6pm local), volumetric water content (m^3/m^3)
  * retrieval_qual_flag_am / _pm -- bitmask; 0 = high-quality retrieval

Known gotchas honoured here:
  * V005 -> V006 transition in 2023-12 means historical (>2-year) trends require
    pulling V005 separately. We stick to V006 for "now / recent / anomaly" queries.
  * In the Taklimakan core, soil moisture often falls below the L-band sensitivity
    floor (~0.02 m^3/m^3); retrievals can be NaN. We mean-reduce to soak up gaps.
"""

import logging

from ._client import _ee_available

if _ee_available:
    import ee  # noqa: F401
else:
    ee = None

logger = logging.getLogger(__name__)

_ASSET = "NASA/SMAP/SPL3SMP_E/006"
# 9 km native resolution
_REDUCE_SCALE = 9000


def _latest_image_date(region):
    """Return the most-recent image start_time as an ee.Date."""
    coll = ee.ImageCollection(_ASSET).filterBounds(region)
    return ee.Date(coll.aggregate_max("system:time_start"))


def _mean_sm(image, region):
    """Mean of (am, pm) soil-moisture bands, spatially averaged over `region`."""
    sm_combined = image.select(["soil_moisture_am", "soil_moisture_pm"]).reduce(ee.Reducer.mean()).rename("sm")
    val = (
        sm_combined.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=region,
            scale=_REDUCE_SCALE,
            maxPixels=1e9,
        )
        .get("sm")
        .getInfo()
    )
    return float(val) if val is not None else None


def get_soil_moisture_now(geometry: dict) -> float:
    """
    Most recent soil-moisture value (volumetric m^3/m^3) over `geometry`.

    Pulls the latest scene in the L3 Enhanced collection, averages am+pm passes,
    then spatially averages across the geometry. Returns 0.0 if no retrieval.
    """
    region = ee.Geometry(geometry)
    latest = _latest_image_date(region)
    img = (
        ee.ImageCollection(_ASSET)
        .filterBounds(region)
        .filterDate(latest, latest.advance(1, "day"))
        .first()
    )
    val = _mean_sm(img, region)
    return round(val, 4) if val is not None else 0.0


def get_soil_moisture_trend(geometry: dict, days_back: int = 30) -> list:
    """
    Daily soil-moisture series over the last `days_back` days.

    Returns
    -------
    list[dict]
        [{"date": "YYYY-MM-DD", "sm": float | None}, ...] in chronological order.
    """
    region = ee.Geometry(geometry)
    latest = _latest_image_date(region)
    start = latest.advance(-days_back, "day")
    coll = (
        ee.ImageCollection(_ASSET)
        .filterBounds(region)
        .filterDate(start, latest.advance(1, "day"))
        .sort("system:time_start")
    )

    def per_image(img):
        sm_combined = img.select(["soil_moisture_am", "soil_moisture_pm"]).reduce(ee.Reducer.mean()).rename("sm")
        mean = sm_combined.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=region,
            scale=_REDUCE_SCALE,
            maxPixels=1e9,
        ).get("sm")
        return ee.Feature(None, {
            "date": img.date().format("YYYY-MM-dd"),
            "sm": mean,
        })

    fc = coll.map(per_image)
    results = []
    try:
        for f in fc.getInfo().get("features", []):
            props = f.get("properties", {})
            sm = props.get("sm")
            results.append({
                "date": props.get("date"),
                "sm": round(float(sm), 4) if sm is not None else None,
            })
    except Exception as e:
        logger.warning("SMAP trend sampling failed: %s", e)

    return results


def get_soil_moisture_anomaly(geometry: dict) -> float:
    """
    Z-score of current soil moisture relative to the past 365-day mean / std at the
    same geometry. Positive = wetter than normal, negative = drier.

    Returns 0.0 when the historical std is too small to score against.
    """
    region = ee.Geometry(geometry)
    latest = _latest_image_date(region)
    one_year_ago = latest.advance(-365, "day")

    coll = (
        ee.ImageCollection(_ASSET)
        .filterBounds(region)
        .filterDate(one_year_ago, latest.advance(1, "day"))
        .map(lambda img: img.select(["soil_moisture_am", "soil_moisture_pm"]).reduce(ee.Reducer.mean()).rename("sm"))
    )

    mean_img = coll.mean()
    std_img = coll.reduce(ee.Reducer.stdDev()).rename("sm_std")

    mean_val = mean_img.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=region,
        scale=_REDUCE_SCALE,
        maxPixels=1e9,
    ).get("sm").getInfo()

    std_val = std_img.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=region,
        scale=_REDUCE_SCALE,
        maxPixels=1e9,
    ).get("sm_std").getInfo()

    current = get_soil_moisture_now(geometry)

    if mean_val is None or std_val is None or float(std_val) < 1e-4:
        return 0.0
    z = (current - float(mean_val)) / float(std_val)
    return round(z, 2)
