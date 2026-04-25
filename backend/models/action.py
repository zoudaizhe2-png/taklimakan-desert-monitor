"""Static L3 action vocabulary type — not an ORM model.

Each ActionDefinition is loaded from docs/L3-action-vocabulary.md into
backend/services/action_vocabulary.py at import time. The data is in-memory
only, never persisted to the database (only Recommendation records are).
"""

from dataclasses import dataclass, field, asdict
from typing import Any


@dataclass(frozen=True)
class ActionDefinition:
    """Schema for one of the 17 L3 actions.

    Maps directly to docs/L3-action-vocabulary.md §1.2 (7 mandatory metadata fields)
    plus L3 spec extras (data_requirements, can_autonomous_phase_c, output_params_schema).
    """

    code: str  # e.g. "PLANT_HALOXYLON"
    category: str  # planting | irrigation | inspection | alert
    name_zh: str
    name_en: str
    description_zh: str
    description_en: str
    # Trigger conditions evaluated against L1 data (see services/recommendation_engine.py)
    trigger_conditions: dict
    # Schema for `output_params` field of any Recommendation generated from this action.
    # Phase A: free-form dict matching this schema. Phase B may move to JSON Schema.
    output_params_schema: dict
    confidence_baseline: float  # 0-1, prior from historical_success in vocab doc
    cost_yuan_per_hm2: float | None  # null where not applicable (alerts, policy)
    eta_months_min: int
    eta_months_max: int
    approval_level: str  # local | project_office | prefecture | regional
    data_requirements: list[str] = field(default_factory=list)
    sources: list[str] = field(default_factory=list)
    # All PLANT_* and IRRIGATION_FLOOD_ECOLOGICAL must remain forever False
    # per docs/L3-action-vocabulary.md §6 (Phase C boundaries).
    can_autonomous_phase_c: bool = False

    def to_dict(self, include_sources: bool = True) -> dict[str, Any]:
        """Serialize to JSON-friendly dict.

        Pass include_sources=False on list endpoints to keep responses small;
        the full vocab doc has 70 citations across 17 actions.
        """
        d = asdict(self)
        if not include_sources:
            d.pop("sources", None)
        return d
