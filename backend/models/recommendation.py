"""Recommendation ORM model — persisted output of the L3 decision engine."""

import json
from datetime import datetime
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text

from database import Base

# Import dependencies so SQLAlchemy resolves FK targets even when this model
# is loaded via a router (before init_db's import block runs).
from models import feature as _feature  # noqa: F401  -- registers `features` table
from models import user as _user        # noqa: F401  -- registers `users` table


# Allowed status values; status column itself is a String for SQLite portability.
STATUSES = ("pending", "approved", "rejected", "deferred", "executed", "expired")


class Recommendation(Base):
    """One concrete recommendation produced by evaluate_region().

    The ACTIONS dict in services/action_vocabulary.py is the static catalog
    (vocab); each Recommendation row is a single instantiation of one of those
    17 codes against a specific region + L1 data snapshot, awaiting a human
    decision per Phase A (recommendation-only) policy.
    """

    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    # FK by code into the in-memory ACTIONS dict — not a DB FK, deliberately.
    action_code = Column(String, nullable=False, index=True)
    # Optional link to a known map feature (Hotan green belt, etc.)
    feature_id = Column(String, ForeignKey("features.id"), nullable=True, index=True)
    # OR a custom GeoJSON region when no feature is provided.
    region_geojson = Column(Text, nullable=True)
    # Snapshot of the L1 data (NDVI, soil moisture, ...) at evaluation time.
    trigger_data_snapshot = Column(Text, default="{}")
    # Concrete output parameters (density, water amount, etc.) per
    # ActionDefinition.output_params_schema.
    output_params = Column(Text, default="{}")
    confidence = Column(Float, default=0.0)
    estimated_cost_yuan = Column(Float, nullable=True)
    eta_months = Column(Integer, nullable=True)
    approval_level = Column(String, nullable=False)  # local|project_office|prefecture|regional

    status = Column(String, default="pending", nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    decided_at = Column(DateTime, nullable=True)
    decided_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    decision_notes = Column(Text, nullable=True)

    # Free-form note set by the engine when an action's data requirements aren't
    # satisfied yet (e.g. "awaiting L1 expansion: SMAP, ERA5"). Phase 3 dataset
    # additions should clear these.
    engine_note = Column(Text, nullable=True)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "action_code": self.action_code,
            "feature_id": self.feature_id,
            "region_geojson": json.loads(self.region_geojson) if self.region_geojson else None,
            "trigger_data_snapshot": json.loads(self.trigger_data_snapshot) if self.trigger_data_snapshot else {},
            "output_params": json.loads(self.output_params) if self.output_params else {},
            "confidence": self.confidence,
            "estimated_cost_yuan": self.estimated_cost_yuan,
            "eta_months": self.eta_months,
            "approval_level": self.approval_level,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "decided_at": self.decided_at.isoformat() if self.decided_at else None,
            "decided_by_user_id": self.decided_by_user_id,
            "decision_notes": self.decision_notes,
            "engine_note": self.engine_note,
        }
