"""Donation ORM model."""

from sqlalchemy import Column, Integer, String, Float, Text
from database import Base


class Donation(Base):
    __tablename__ = "donations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=True)
    display_name = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    tier = Column(String, default="supporter")  # supporter | guardian | champion
    adopted_zone = Column(String, nullable=True)
    message = Column(Text, default="")
    created_at = Column(String, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "display_name": self.display_name,
            "amount": self.amount,
            "tier": self.tier,
            "adopted_zone": self.adopted_zone,
            "message": self.message,
            "created_at": self.created_at,
        }
