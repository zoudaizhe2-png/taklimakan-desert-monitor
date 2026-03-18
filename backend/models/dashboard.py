"""DashboardSnapshot ORM model."""

import json
from sqlalchemy import Column, Integer, String, Text
from database import Base


class DashboardSnapshot(Base):
    __tablename__ = "dashboard_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(String, nullable=False)
    stats_json = Column(Text, default="{}")

    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "stats": json.loads(self.stats_json) if self.stats_json else {},
        }
