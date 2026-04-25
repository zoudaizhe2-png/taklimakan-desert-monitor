"""
Google Earth Engine data-source package.

Public surface:
  * Auth / status helpers (re-exported from `_client`):
        initialize, is_available, get_init_error
  * Sentinel-2 NDVI helpers (re-exported from `sentinel2`):
        get_sentinel2_collection, compute_ndvi, get_ndvi_composite,
        get_ndvi_timeseries, get_ndvi_change, get_ndvi_grid, get_ndvi_tile_url
  * SRTM elevation helpers (re-exported from `srtm`):
        get_elevation, get_slope_aspect, get_terrain_grid
  * ERA5 climate helpers (re-exported from `era5`):
        get_annual_rainfall_mm, get_temperature_extremes,
        get_climatology_normal, get_recent_drought_index

Subsequent commits add the SMAP module under this package.

The legacy `services.gee_service` module re-exports everything here for
backward compatibility — existing call sites do not need to change.
"""

from ._client import initialize, is_available, get_init_error  # noqa: F401
from .sentinel2 import (  # noqa: F401
    get_sentinel2_collection,
    compute_ndvi,
    get_ndvi_composite,
    get_ndvi_timeseries,
    get_ndvi_change,
    get_ndvi_grid,
    get_ndvi_tile_url,
)
from .srtm import (  # noqa: F401
    get_elevation,
    get_slope_aspect,
    get_terrain_grid,
)
from .era5 import (  # noqa: F401
    get_annual_rainfall_mm,
    get_temperature_extremes,
    get_climatology_normal,
    get_recent_drought_index,
)

__all__ = [
    # auth
    "initialize",
    "is_available",
    "get_init_error",
    # sentinel-2
    "get_sentinel2_collection",
    "compute_ndvi",
    "get_ndvi_composite",
    "get_ndvi_timeseries",
    "get_ndvi_change",
    "get_ndvi_grid",
    "get_ndvi_tile_url",
    # srtm
    "get_elevation",
    "get_slope_aspect",
    "get_terrain_grid",
    # era5
    "get_annual_rainfall_mm",
    "get_temperature_extremes",
    "get_climatology_normal",
    "get_recent_drought_index",
]
