"""
ERA5-Land climate reanalysis -- rainfall, temperature, drought baselines.

Datasets:
  - Monthly aggregates: ECMWF/ERA5_LAND/MONTHLY_AGGR (preferred for trend / climatology)
  - Hourly: ECMWF/ERA5_LAND/HOURLY (used for hot-day counting at 2m air temp)

Coverage: 1950 -> present, 0.1 deg (~11 km) over land, ~5 day latency.

Known gotchas honoured here:
  * total_precipitation_sum is in metres -> multiply by 1000 to get mm.
  * temperature_2m is in Kelvin -> subtract 273.15 for Celsius.
  * ERA5-Land underestimates short-duration convective rain over deserts; the absolute
    numbers should be treated as basin-scale baselines, not field-scale truth.
"""

import logging

from ._client import _ee_available

if _ee_available:
    import ee  # noqa: F401
else:
    ee = None

logger = logging.getLogger(__name__)

_MONTHLY_ASSET = "ECMWF/ERA5_LAND/MONTHLY_AGGR"
_HOURLY_ASSET = "ECMWF/ERA5_LAND/HOURLY"
# ERA5-Land is ~11 km; reduce at 11000 m to avoid wasted compute over native pixels.
_REDUCE_SCALE = 11000


def _mean_reduce(image, region, band_name, scale=_REDUCE_SCALE):
    """Helper -- mean-reduce a single band over a geometry."""
    val = (
        image.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=region,
            scale=scale,
            maxPixels=1e9,
        )
        .get(band_name)
        .getInfo()
    )
    return float(val) if val is not None else None


def get_annual_rainfall_mm(geometry: dict, year: int) -> float:
    """
    Total accumulated precipitation (mm) for the calendar year over `geometry`.

    Sum of monthly `total_precipitation_sum` values * 1000 (m -> mm), spatially
    averaged across the geometry.
    """
    region = ee.Geometry(geometry)
    coll = (
        ee.ImageCollection(_MONTHLY_ASSET)
        .filterBounds(region)
        .filterDate(f"{year}-01-01", f"{year + 1}-01-01")
        .select("total_precipitation_sum")
    )
    annual = coll.sum().multiply(1000.0).rename("precip_mm")
    val = _mean_reduce(annual, region, "precip_mm")
    return round(val, 1) if val is not None else 0.0


def get_temperature_extremes(geometry: dict, year: int) -> dict:
    """
    Annual temperature extremes over `geometry`:
      * max_c       -- annual max of monthly mean of daily-max 2m temperature
      * min_c       -- annual min of monthly mean of daily-min 2m temperature
      * hot_days_ge_40 -- count of hourly samples with 2m air temp >= 40 C, divided by 24
                       (a coarse approximation of ">=40 C days"; one hour above threshold
                       counts toward that day's tally).

    Hot-day counting uses HOURLY rather than MONTHLY because the monthly aggregates
    only carry mean/max statistics, not the count of hot hours.
    """
    region = ee.Geometry(geometry)

    monthly = (
        ee.ImageCollection(_MONTHLY_ASSET)
        .filterBounds(region)
        .filterDate(f"{year}-01-01", f"{year + 1}-01-01")
    )

    tmax_k = monthly.select("temperature_2m_max").max()
    tmin_k = monthly.select("temperature_2m_min").min()

    max_c_k = _mean_reduce(tmax_k, region, "temperature_2m_max")
    min_c_k = _mean_reduce(tmin_k, region, "temperature_2m_min")

    # Hot hours >= 40 C  -> 313.15 K
    hourly = (
        ee.ImageCollection(_HOURLY_ASSET)
        .filterBounds(region)
        .filterDate(f"{year}-01-01", f"{year + 1}-01-01")
        .select("temperature_2m")
    )
    hot_mask = hourly.map(lambda img: img.gte(313.15).rename("hot"))
    hot_hours_img = hot_mask.sum().rename("hot")
    hot_hours = _mean_reduce(hot_hours_img, region, "hot")
    hot_days = int(round((hot_hours or 0) / 24.0))

    return {
        "max_c": round((max_c_k - 273.15), 1) if max_c_k is not None else 0.0,
        "min_c": round((min_c_k - 273.15), 1) if min_c_k is not None else 0.0,
        "hot_days_ge_40": hot_days,
    }


def get_climatology_normal(geometry: dict, start_year: int = 1991, end_year: int = 2020) -> dict:
    """
    1991-2020 (or user-supplied window) WMO-style climatology baseline:
      * mean_annual_rainfall_mm
      * mean_max_c
      * mean_min_c

    Used as denominator/baseline by `get_recent_drought_index` and by L3 anomaly
    computations downstream.
    """
    region = ee.Geometry(geometry)

    monthly = (
        ee.ImageCollection(_MONTHLY_ASSET)
        .filterBounds(region)
        .filterDate(f"{start_year}-01-01", f"{end_year + 1}-01-01")
    )

    monthly_precip_mean = monthly.select("total_precipitation_sum").mean().multiply(1000.0).rename("precip_mm")
    annual_mean_precip = _mean_reduce(monthly_precip_mean, region, "precip_mm")
    annual_mean_precip = (annual_mean_precip * 12.0) if annual_mean_precip is not None else 0.0

    tmax_k = monthly.select("temperature_2m_max").mean()
    tmin_k = monthly.select("temperature_2m_min").mean()
    mean_max_c_k = _mean_reduce(tmax_k, region, "temperature_2m_max")
    mean_min_c_k = _mean_reduce(tmin_k, region, "temperature_2m_min")

    return {
        "start_year": start_year,
        "end_year": end_year,
        "mean_annual_rainfall_mm": round(annual_mean_precip, 1),
        "mean_max_c": round((mean_max_c_k - 273.15), 1) if mean_max_c_k is not None else 0.0,
        "mean_min_c": round((mean_min_c_k - 273.15), 1) if mean_min_c_k is not None else 0.0,
    }


def get_recent_drought_index(geometry: dict, months_back: int = 12) -> float:
    """
    Recent drought index in [0, 1], where 1 = severe drought (rainfall far below normal),
    0 = normal-or-wet conditions.

    Method: ratio of `months_back`-month accumulated rainfall to the 1991-2020 mean of the
    same window length, then clipped/inverted to a 0-1 deficit score.

      ratio  = recent_total / (climatology_annual / 12 * months_back)
      index  = clip(1 - ratio, 0, 1)
    """
    region = ee.Geometry(geometry)

    coll = ee.ImageCollection(_MONTHLY_ASSET).filterBounds(region).select("total_precipitation_sum")
    latest = ee.Date(coll.aggregate_max("system:time_start"))
    start = latest.advance(-months_back, "month")
    recent = coll.filterDate(start, latest.advance(1, "month")).sum().multiply(1000.0).rename("precip_mm")
    recent_val = _mean_reduce(recent, region, "precip_mm")

    clim = get_climatology_normal(geometry)
    monthly_norm = clim["mean_annual_rainfall_mm"] / 12.0
    expected = monthly_norm * months_back
    if expected <= 0:
        return 0.0

    ratio = (recent_val or 0.0) / expected
    deficit = max(0.0, min(1.0, 1.0 - ratio))
    return round(deficit, 3)
