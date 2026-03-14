"""NDVI analysis service with demo data fallback."""

import math
import random

# Preset regions around the Taklimakan Desert
PRESET_REGIONS = {
    "hotan_green_belt": {
        "name": "Hotan Green Belt",
        "description": "Southern Taklimakan afforestation zone near Hotan city",
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [
                    [79.8, 37.0],
                    [80.2, 37.0],
                    [80.2, 37.3],
                    [79.8, 37.3],
                    [79.8, 37.0],
                ]
            ],
        },
    },
    "alar_shelterbelt": {
        "name": "Alar Shelterbelt",
        "description": "Northern Taklimakan shelterbelt near Alar city",
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [
                    [80.8, 40.4],
                    [81.2, 40.4],
                    [81.2, 40.7],
                    [80.8, 40.7],
                    [80.8, 40.4],
                ]
            ],
        },
    },
    "desert_highway": {
        "name": "Tarim Desert Highway",
        "description": "Green corridor along the Tarim Desert Highway",
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [
                    [83.5, 38.5],
                    [83.8, 38.5],
                    [83.8, 39.0],
                    [83.5, 39.0],
                    [83.5, 38.5],
                ]
            ],
        },
    },
    "korla_oasis": {
        "name": "Korla Oasis Edge",
        "description": "Eastern Taklimakan desert-oasis boundary near Korla",
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [
                    [85.8, 41.6],
                    [86.2, 41.6],
                    [86.2, 41.9],
                    [85.8, 41.9],
                    [85.8, 41.6],
                ]
            ],
        },
    },
}


def generate_demo_timeseries(start_year, end_year, base_ndvi=0.15, trend=0.008):
    """Generate realistic-looking demo NDVI timeseries data."""
    random.seed(42)
    results = []
    for year in range(start_year, end_year + 1):
        years_offset = year - start_year
        ndvi = base_ndvi + trend * years_offset
        ndvi += 0.02 * math.sin(years_offset * 0.5)
        ndvi += random.uniform(-0.015, 0.015)
        ndvi = max(0.01, min(0.9, ndvi))
        results.append({"year": year, "mean_ndvi": round(ndvi, 4)})
    return results


def generate_demo_change(year1, year2):
    """Generate demo NDVI change statistics."""
    years_diff = year2 - year1
    mean_change = 0.008 * years_diff + random.uniform(-0.01, 0.01)
    return {
        "year1": year1,
        "year2": year2,
        "mean_change": round(mean_change, 4),
        "min_change": round(mean_change - 0.15, 4),
        "max_change": round(mean_change + 0.2, 4),
        "improved_area_sqkm": round(abs(years_diff) * 120 + random.uniform(-30, 30), 1),
        "degraded_area_sqkm": round(abs(years_diff) * 35 + random.uniform(-10, 10), 1),
    }


def generate_demo_grid(region_geojson, year, resolution=50):
    """
    Generate a grid of demo NDVI values for map visualization.
    Returns a list of {lat, lng, ndvi} points.
    """
    random.seed(year)
    coords = region_geojson["coordinates"][0]
    min_lng = min(c[0] for c in coords)
    max_lng = max(c[0] for c in coords)
    min_lat = min(c[1] for c in coords)
    max_lat = max(c[1] for c in coords)

    lng_step = (max_lng - min_lng) / resolution
    lat_step = (max_lat - min_lat) / resolution

    points = []
    center_lng = (min_lng + max_lng) / 2
    center_lat = (min_lat + max_lat) / 2

    for i in range(resolution):
        for j in range(resolution):
            lng = min_lng + i * lng_step
            lat = min_lat + j * lat_step

            dist = math.sqrt((lng - center_lng) ** 2 + (lat - center_lat) ** 2)
            max_dist = math.sqrt(
                (max_lng - center_lng) ** 2 + (max_lat - center_lat) ** 2
            )
            normalized_dist = dist / max_dist

            base = 0.4 * (1 - normalized_dist) + 0.05
            year_boost = (year - 2015) * 0.006
            noise = random.uniform(-0.05, 0.05)
            ndvi = max(0.0, min(1.0, base + year_boost + noise))

            points.append({"lat": round(lat, 5), "lng": round(lng, 5), "ndvi": round(ndvi, 3)})

    return points
