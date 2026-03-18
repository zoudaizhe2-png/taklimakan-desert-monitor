"""Feature ORM model."""

import json
from sqlalchemy import Column, String, Float, Text
from database import Base


class Feature(Base):
    __tablename__ = "features"

    id = Column(String, primary_key=True)
    name_en = Column(String, nullable=False)
    name_zh = Column(String, nullable=False)
    category = Column(String, nullable=False, index=True)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    description_en = Column(Text, default="")
    description_zh = Column(Text, default="")
    stats_json = Column(Text, default="{}")
    geometry_json = Column(Text, nullable=True)

    def to_dict(self):
        d = {
            "id": self.id,
            "name_en": self.name_en,
            "name_zh": self.name_zh,
            "category": self.category,
            "lat": self.lat,
            "lng": self.lng,
            "description_en": self.description_en,
            "description_zh": self.description_zh,
            "stats": json.loads(self.stats_json) if self.stats_json else {},
        }
        if self.geometry_json:
            d["geometry"] = json.loads(self.geometry_json)
        return d
