"""NewsArticle ORM model."""

from sqlalchemy import Column, Integer, String, Text
from database import Base


class NewsArticle(Base):
    __tablename__ = "news_articles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title_en = Column(String, nullable=False)
    title_zh = Column(String, nullable=False)
    desc_en = Column(Text, default="")
    desc_zh = Column(Text, default="")
    source = Column(String, default="")
    source_url = Column(String, default="")
    category = Column(String, nullable=False, index=True)
    date = Column(String, default="")
    image_url = Column(String, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "titleEn": self.title_en,
            "titleZh": self.title_zh,
            "descEn": self.desc_en,
            "descZh": self.desc_zh,
            "source": self.source,
            "sourceUrl": self.source_url,
            "category": self.category,
            "date": self.date,
            "imageUrl": self.image_url,
        }
