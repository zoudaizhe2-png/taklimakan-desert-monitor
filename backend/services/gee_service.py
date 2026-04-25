"""
Backward-compatibility shim.

Previously this file held the entire GEE pipeline (initialize + Sentinel-2 NDVI
helpers). After the L1 refactor the implementation lives in `services.gee` so we
can host SRTM / ERA5 / SMAP / Sentinel-2 alongside each other without growing a
single 700-line file.

Existing call sites such as

    from services.gee_service import initialize, get_ndvi_timeseries

continue to work unchanged via the re-export below.
"""

from .gee import *  # noqa: F401,F403
from .gee import __all__  # noqa: F401
