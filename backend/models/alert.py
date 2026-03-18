"""Alert ORM model."""

from sqlalchemy import Column, Integer, String, Text, Boolean
from database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    type = Column(String, nullable=False)  # ndvi_drop | drought | fire | system
    severity = Column(String, default="warning")  # info | warning | critical
    title_en = Column(String, nullable=False)
    title_zh = Column(String, default="")
    body = Column(Text, default="")
    geometry_json = Column(Text, nullable=True)
    acknowledged = Column(Boolean, default=False)
    created_at = Column(String, nullable=False)

    def to_dict(self):
        import json
        d = {
            "id": self.id,
            "type": self.type,
            "severity": self.severity,
            "title_en": self.title_en,
            "title_zh": self.title_zh,
            "body": self.body,
            "acknowledged": self.acknowledged,
            "created_at": self.created_at,
        }
        if self.geometry_json:
            d["geometry"] = json.loads(self.geometry_json)
        return d
