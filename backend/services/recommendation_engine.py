"""L3 Recommendation Engine — Phase A rules-based decision logic.

Evaluates a region against the 17 actions in services/action_vocabulary.ACTIONS,
producing a list of Recommendation rows. No ML, no inference — every match is
deterministic from the trigger_conditions in the vocabulary.

Phase B/C will swap or wrap this with model-based scoring; the function
signature is stable.

See docs/L3-action-vocabulary.md §3 for the data-requirements matrix and §4
for the confidence formula.
"""

import json
import math
from datetime import datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from models.recommendation import Recommendation
from services.action_vocabulary import (
    ACTIONS,
    NDVI_ONLY_ACTIONABLE,
    ActionDefinition,
)

# ─── Region area calculation ──────────────────────────────────────────────────

# Earth radius in km — for spherical-excess polygon area approximation.
# Accurate enough for Phase A cost estimates; switch to shapely + projected
# CRS if sub-percent accuracy needed later.
_EARTH_RADIUS_KM = 6371.0


def _ring_area_km2(ring: list[list[float]]) -> float:
    """Spherical polygon area for a single ring (lng, lat in degrees).

    Uses spherical excess. Returns absolute area in km².
    Reference: Chamberlain & Duquette NASA 2007.
    """
    if len(ring) < 4:
        return 0.0
    total = 0.0
    n = len(ring) - 1  # last point repeats the first in GeoJSON
    for i in range(n):
        lon1, lat1 = math.radians(ring[i][0]), math.radians(ring[i][1])
        lon2, lat2 = math.radians(ring[(i + 1) % n][0]), math.radians(ring[(i + 1) % n][1])
        total += (lon2 - lon1) * (2 + math.sin(lat1) + math.sin(lat2))
    return abs(total * _EARTH_RADIUS_KM ** 2 / 2.0)


def region_area_hm2(geojson: dict | None) -> float:
    """Compute area in hectares (1 hm² = 0.01 km²) from a GeoJSON Polygon/MultiPolygon.

    Returns 0.0 for None/Point/invalid input — engine then can't compute cost.
    """
    if not geojson or not isinstance(geojson, dict):
        return 0.0
    geo_type = geojson.get("type")
    coords = geojson.get("coordinates")
    if not coords:
        return 0.0
    km2 = 0.0
    try:
        if geo_type == "Polygon":
            km2 = _ring_area_km2(coords[0])
            for hole in coords[1:]:
                km2 -= _ring_area_km2(hole)
        elif geo_type == "MultiPolygon":
            for poly in coords:
                km2 += _ring_area_km2(poly[0])
                for hole in poly[1:]:
                    km2 -= _ring_area_km2(hole)
        else:
            return 0.0
    except (TypeError, ValueError, IndexError):
        return 0.0
    return max(km2, 0.0) * 100.0  # km² → hm²


# ─── Trigger evaluator ────────────────────────────────────────────────────────

# Explicit per-condition spec: (l1_data_field, operator).
#
# Operators:
#   ge   - actual ≥ cond_val   (typical "_min" / persistence counts)
#   le   - actual ≤ cond_val   (typical "_max")
#   lt   - actual < cond_val   (typical "_threshold" semantics — "below = bad")
#   in   - actual ∈ cond_val   (categorical sets)
#   eq   - actual == cond_val  (booleans / equality)
#
# This explicit table replaces suffix-based parsing and makes the spec
# directly traceable to docs/L3-action-vocabulary.md.
_TRIGGER_SPEC: dict[str, tuple[str, str]] = {
    # NDVI quantitative
    "ndvi_threshold":                       ("ndvi", "lt"),
    "ndvi_persistent_low_years":            ("ndvi_low_years", "ge"),
    "ndvi_drop_min":                        ("ndvi_drop", "ge"),
    "ndvi_drop_consecutive_periods":        ("ndvi_drop_periods", "ge"),
    "ndvi_decline_min":                     ("ndvi_decline", "ge"),
    "ndvi_decline_consecutive_years":       ("ndvi_decline_years", "ge"),
    "ndvi_absolute_threshold":              ("ndvi", "lt"),
    "ndvi_absolute_persistent_months":      ("ndvi_low_months", "ge"),
    # Climate
    "annual_rainfall_mm_min":               ("annual_rainfall_mm", "ge"),
    "annual_rainfall_mm_max":               ("annual_rainfall_mm", "le"),
    "forecast_rainfall_mm_max_14d":         ("forecast_rainfall_mm_14d", "le"),
    "forecast_rainfall_mm_min_7d":          ("forecast_rainfall_mm_7d", "ge"),
    "forecast_temp_c_min":                  ("forecast_temp_c", "ge"),
    "forecast_consecutive_days_min":        ("forecast_hot_days", "ge"),
    "forecast_wind_m_per_s_min":            ("forecast_wind_m_per_s", "ge"),
    "forecast_wind_m_per_s_max":            ("forecast_wind_m_per_s", "le"),
    "forecast_visibility_km_max":           ("forecast_visibility_km", "le"),
    "forecast_horizon_hours_max":           ("forecast_horizon_hours", "le"),
    # Soil & terrain
    "soil_type_in":                         ("soil_type", "in"),
    "soil_salinity_pct_min":                ("soil_salinity_pct", "ge"),
    "soil_salinity_pct_max":                ("soil_salinity_pct", "le"),
    "soil_moisture_root_zone_pct_max":      ("soil_moisture_pct", "le"),
    "soil_moisture_below_critical":         ("soil_moisture_critical", "eq"),
    "soil_moisture_saturated":              ("soil_moisture_saturated", "eq"),
    "soil_heterogeneity_required":          ("soil_heterogeneous", "eq"),
    "elevation_max_m":                      ("elevation_m", "le"),
    "terrain_in":                           ("terrain", "in"),
    "slope_degrees_max":                    ("slope_degrees", "le"),
    "dry_sand_layer_thickness_cm_max":      ("dry_sand_layer_cm", "le"),
    # Hydrology
    "groundwater_depth_m_min":              ("groundwater_depth_m", "ge"),
    "groundwater_depth_m_max":              ("groundwater_depth_m", "le"),
    "groundwater_decline_consecutive_years": ("groundwater_decline_years", "ge"),
    "groundwater_decline_m_per_year_min":   ("groundwater_decline_m_per_year", "ge"),
    "surrounding_ndvi_degradation_within_km": ("surrounding_ndvi_degraded", "eq"),
    "upstream_water_release_scheduled":     ("upstream_water_scheduled", "eq"),
    "upstream_water_available_m3":          ("upstream_water_m3", "ge"),
    # Phenology / season / context flags
    "phenology_growth_season":              ("is_growth_season", "eq"),
    "phenology_non_critical":               ("is_non_critical_phase", "eq"),
    "season_in":                            ("season", "in"),
    "young_seedlings_present":              ("has_young_seedlings", "eq"),
    "drip_infrastructure_present":          ("has_drip", "eq"),
    "geographic_zone":                      ("zone", "eq"),
    "geographic_zone_in":                   ("zone", "in"),
    # Operational / area
    "anomaly_area_hm2_min":                 ("anomaly_area_hm2", "ge"),
    "anomaly_area_hm2_max":                 ("anomaly_area_hm2", "le"),
    "area_hm2_min":                         ("area_hm2", "ge"),
    "needs_planting_judgment":              ("needs_planting_judgment", "eq"),
    "days_since_last_inspection_min":       ("days_since_last_inspection", "ge"),
    "is_priority_zone":                     ("is_priority_zone", "eq"),
}

# Set of all L1 field names that any trigger reads from. The data_requirements
# field on each ActionDefinition uses a coarser vocabulary (ndvi, soil_moisture,
# rainfall, etc.) — see services.action_vocabulary for that mapping.

# Quantitative operators where a "near miss" is meaningful
_QUANT_OPS = {"ge", "le", "lt"}


# Maps coarse data_requirements categories used by ActionDefinition.data_requirements
# (ndvi, soil_moisture, rainfall, ...) to the concrete L1 field names that any
# of their values would satisfy. A requirement is considered present if ANY of
# the listed fields appears (non-None) in the L1 data.
_DATA_REQ_ALIASES: dict[str, list[str]] = {
    "ndvi":                 ["ndvi", "ndvi_low_years", "ndvi_low_months", "ndvi_drop", "ndvi_drop_periods"],
    "soil_moisture":        ["soil_moisture_pct", "soil_moisture_critical", "soil_moisture_saturated"],
    "rainfall":             ["annual_rainfall_mm", "forecast_rainfall_mm_14d", "forecast_rainfall_mm_7d",
                             "forecast_wind_m_per_s", "forecast_visibility_km", "forecast_temp_c", "rainfall"],
    "groundwater_depth":    ["groundwater_depth_m", "groundwater_decline_years", "groundwater_decline_m_per_year"],
    "elevation":            ["elevation_m", "slope_degrees", "terrain", "elevation"],
    "soil_type":            ["soil_type", "soil_salinity_pct", "dry_sand_layer_cm"],
    "historical_planting":  ["has_young_seedlings", "days_since_last_inspection", "is_priority_zone",
                             "historical_planting"],
    "species_map":          ["species_map", "zone"],
}


def _req_satisfied(req: str, l1_data: dict) -> bool:
    """Check if a coarse data_requirements entry has any of its alias fields populated."""
    fields = _DATA_REQ_ALIASES.get(req, [req])
    return any(l1_data.get(f) is not None for f in fields)


def _data_completeness(action: ActionDefinition, l1_data: dict) -> float:
    """Fraction of action.data_requirements present in l1_data (alias-aware)."""
    reqs = action.data_requirements
    if not reqs:
        return 1.0
    present = sum(1 for r in reqs if _req_satisfied(r, l1_data))
    return present / len(reqs)


def _missing_data_fields(action: ActionDefinition, l1_data: dict) -> list[str]:
    return [r for r in action.data_requirements if not _req_satisfied(r, l1_data)]


def _check_one(op: str, cond_val: Any, actual: Any) -> tuple[bool, bool]:
    """Apply a single operator. Returns (passed, near_miss)."""
    if op == "ge":
        if not isinstance(actual, (int, float)) or not isinstance(cond_val, (int, float)):
            return False, False
        passed = actual >= cond_val
        # near-miss: just below (failed) or just barely above (borderline pass)
        if not passed:
            return False, (cond_val > 0 and actual >= cond_val * 0.8)
        return True, (cond_val > 0 and actual <= cond_val * 1.2)
    if op == "le":
        if not isinstance(actual, (int, float)) or not isinstance(cond_val, (int, float)):
            return False, False
        passed = actual <= cond_val
        if not passed:
            return False, (cond_val > 0 and actual <= cond_val * 1.2)
        return True, (cond_val > 0 and actual >= cond_val * 0.8)
    if op == "lt":
        if not isinstance(actual, (int, float)) or not isinstance(cond_val, (int, float)):
            return False, False
        passed = actual < cond_val
        if not passed:
            return False, (cond_val > 0 and actual < cond_val * 1.2)
        return True, (cond_val > 0 and actual > cond_val * 0.8)
    if op == "in":
        if not isinstance(cond_val, (list, tuple, set)):
            return False, False
        return actual in cond_val, False
    if op == "eq":
        return actual == cond_val, False
    return False, False


def evaluate_trigger(conditions: dict, l1_data: dict) -> tuple[bool, float]:
    """Evaluate trigger_conditions dict against L1 data (logical AND).

    Returns (matched, uncertainty_penalty).

    For each known condition key, we look up its (field, operator) in
    _TRIGGER_SPEC; an unknown key is treated conservatively as a fail.
    A near-miss on a quantitative operator contributes to the penalty.
    """
    if not conditions:
        return True, 0.0

    matched = True
    near_miss = 0
    quant_total = 0

    for cond_key, cond_val in conditions.items():
        spec = _TRIGGER_SPEC.get(cond_key)
        if spec is None:
            # Unknown condition key — fail closed and skip near-miss accounting.
            matched = False
            continue

        field, op = spec
        actual = l1_data.get(field)

        # Missing data → cannot evaluate → condition fails.
        if actual is None:
            matched = False
            continue

        passed, near = _check_one(op, cond_val, actual)
        if not passed:
            matched = False
        if op in _QUANT_OPS:
            quant_total += 1
            if near:
                near_miss += 1

    penalty = 0.2 * (near_miss / quant_total) if quant_total else 0.0
    return matched, penalty


def compute_confidence(
    action: ActionDefinition,
    completeness: float,
    uncertainty_penalty: float,
) -> float:
    """confidence = baseline × completeness × (1 − penalty), clamped [0, 1].

    Per docs/L3-action-vocabulary.md §4. Phase A drops the model_certainty
    factor (no ML model yet); the baseline already encodes historical_success.
    """
    raw = action.confidence_baseline * completeness * (1.0 - uncertainty_penalty)
    return max(0.0, min(1.0, raw))


def estimate_cost_yuan(action: ActionDefinition, area_hm2: float) -> float | None:
    """Multiply per-hm² cost by region area. None where action is policy/per-trip flat."""
    if action.cost_yuan_per_hm2 is None:
        return None
    if area_hm2 <= 0:
        return None
    return round(action.cost_yuan_per_hm2 * area_hm2, 2)


def derive_output_params(action: ActionDefinition, l1_data: dict, area_hm2: float) -> dict:
    """Concretize the schema with snapshot data + area.

    Phase A: returns the schema as-is plus a few computed fields. Phase B+
    will instantiate ranges into specific values based on actual conditions.
    """
    params = dict(action.output_params_schema)
    params["region_area_hm2"] = round(area_hm2, 2) if area_hm2 > 0 else None
    return params


# ─── Main entry point ─────────────────────────────────────────────────────────

async def evaluate_region(
    feature_id: str | None,
    region_geojson: dict | None,
    l1_data: dict,
    user_id: int | None,
    db: AsyncSession,
    *,
    persist: bool = True,
) -> tuple[list[Recommendation], dict[str, Any]]:
    """Walk all 17 actions; for each that matches, persist a Recommendation.

    Args:
        feature_id: optional FK into features table
        region_geojson: optional custom GeoJSON polygon for the region
        l1_data: dict of L1 measurements; missing keys → None
        user_id: who initiated the evaluation (informational)
        db: async session
        persist: if False, return without writing to DB (used in tests/previews)

    Returns:
        (list of Recommendation rows, eval_meta dict)
    """
    snapshot_json = json.dumps(l1_data, default=str)
    area_hm2 = region_area_hm2(region_geojson)

    # Inject area into l1_data so area-based triggers can read it.
    l1_with_area = dict(l1_data)
    if area_hm2 > 0:
        l1_with_area.setdefault("area_hm2", area_hm2)
        l1_with_area.setdefault("anomaly_area_hm2", area_hm2)

    recommendations: list[Recommendation] = []
    completeness_sum = 0.0
    pending_l1_count = 0
    matched_count = 0

    for action in ACTIONS.values():
        completeness = _data_completeness(action, l1_with_area)
        completeness_sum += completeness
        missing = _missing_data_fields(action, l1_with_area)

        # Phase A graceful degradation: if action requires data we don't have
        # AND it's not in the NDVI-only actionable set, emit a pending-with-note
        # row instead of evaluating triggers.
        if missing and action.code not in NDVI_ONLY_ACTIONABLE:
            pending_l1_count += 1
            rec = _build_recommendation(
                action=action,
                feature_id=feature_id,
                region_geojson=region_geojson,
                snapshot_json=snapshot_json,
                area_hm2=area_hm2,
                l1_data=l1_with_area,
                completeness=completeness,
                penalty=0.0,
                status="pending",
                engine_note=f"awaiting L1 expansion: {', '.join(missing)}",
            )
            recommendations.append(rec)
            continue

        matched, penalty = evaluate_trigger(action.trigger_conditions, l1_with_area)
        if not matched:
            continue

        matched_count += 1
        rec = _build_recommendation(
            action=action,
            feature_id=feature_id,
            region_geojson=region_geojson,
            snapshot_json=snapshot_json,
            area_hm2=area_hm2,
            l1_data=l1_with_area,
            completeness=completeness,
            penalty=penalty,
            status="pending",
            engine_note=None,
        )
        recommendations.append(rec)

    if persist and recommendations:
        for r in recommendations:
            db.add(r)
        await db.commit()
        for r in recommendations:
            await db.refresh(r)

    avg_completeness = completeness_sum / len(ACTIONS) if ACTIONS else 0.0

    eval_meta = {
        "evaluated_at": datetime.utcnow().isoformat() + "Z",
        "data_completeness": round(avg_completeness, 3),
        "actions_matched": matched_count,
        "actions_pending_l1": pending_l1_count,
        "total_actions_in_catalog": len(ACTIONS),
        "user_id": user_id,
    }
    return recommendations, eval_meta


def _build_recommendation(
    *,
    action: ActionDefinition,
    feature_id: str | None,
    region_geojson: dict | None,
    snapshot_json: str,
    area_hm2: float,
    l1_data: dict,
    completeness: float,
    penalty: float,
    status: str,
    engine_note: str | None,
) -> Recommendation:
    confidence = compute_confidence(action, completeness, penalty)
    return Recommendation(
        action_code=action.code,
        feature_id=feature_id,
        region_geojson=json.dumps(region_geojson) if region_geojson else None,
        trigger_data_snapshot=snapshot_json,
        output_params=json.dumps(derive_output_params(action, l1_data, area_hm2)),
        confidence=confidence,
        estimated_cost_yuan=estimate_cost_yuan(action, area_hm2),
        eta_months=action.eta_months_min,
        approval_level=action.approval_level,
        status=status,
        engine_note=engine_note,
    )
