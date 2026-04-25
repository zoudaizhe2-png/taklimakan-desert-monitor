"""Seed database with hardcoded features, news articles, and demo recommendations."""

import asyncio
import json
from datetime import datetime, timedelta

from sqlalchemy import func as sa_func, select

from database import engine, async_session, init_db
from models.feature import Feature
from models.news import NewsArticle
from models.recommendation import Recommendation
from services.action_vocabulary import ACTIONS
from services.features_service import FEATURES

NEWS_ARTICLES = [
    {"id": 1, "date": "2024-11-11", "title_en": "Taklimakan Desert Fully Enclosed by Green Belt for the First Time", "title_zh": "塔克拉玛干沙漠实现绿色锁边合龙", "desc_en": "A 3,046-km green belt around the Taklimakan Desert has been completed, closing the final gap in the southern perimeter after decades of afforestation work.", "desc_zh": "环绕塔克拉玛干沙漠的3046公里绿色屏障全线合龙，数十年治沙造林工程画上圆满句号。", "source": "Xinhua", "source_url": "https://english.news.cn/20241111/b2fe3a1b52a04c0e9e0d073a43d4fa5b/c.html", "category": "greenbelt"},
    {"id": 2, "date": "2024-11-12", "title_en": "China Completes 'Green Necklace' Around World's Second-Largest Desert", "title_zh": "中国在世界第二大沙漠周围建成“绿色项链”", "desc_en": "Reuters reports the completion of a continuous belt of vegetation encircling the Taklimakan, calling it one of the most ambitious ecological engineering projects in history.", "desc_zh": "路透社报道塔克拉玛干沙漠连续植被带闭合，称其为人类历史上最宏伟的生态工程之一。", "source": "Reuters", "source_url": "https://www.reuters.com/world/china/china-completes-green-necklace-around-taklimakan-desert-2024-11-12/", "category": "greenbelt"},
    {"id": 3, "date": "2024-08-28", "title_en": "China Pledges $8 Billion for New Phase of Three-North Shelterbelt Program", "title_zh": "中国投入约580亿元推进三北防护林新阶段", "desc_en": "Beijing announces a massive new investment phase for the Three-North Shelterbelt Program, targeting desertification control in Xinjiang, Inner Mongolia, and Gansu.", "desc_zh": "北京宣布三北防护林工程新一轮大规模投资，重点推进新疆、内蒙古和甘肃的荒漠化治理。", "source": "CGTN", "source_url": "https://news.cgtn.com/news/2024-08-28/China-s-Three-North-program/index.html", "category": "policy"},
    {"id": 4, "date": "2023-06-17", "title_en": "Aksu Kekeya Greening Project Reaches 130 km², Wins UN Environmental Award", "title_zh": "阿克苏柯柯牙工程达130平方公里，荣获联合国环境奖", "desc_en": "After 37 years, Aksu's Kekeya project has turned barren gobi into 130 km² of productive forest, earning recognition from the United Nations Environment Programme.", "desc_zh": "历经37年，阿克苏柯柯牙将荒漠戈壁变为130平方公里的生产性森林，获联合国环境规划署表彰。", "source": "Xinhua", "source_url": "https://www.xinhuanet.com/english/2023-06/17/c_1310727.htm", "category": "kekeya"},
    {"id": 5, "date": "2023-09-20", "title_en": "Desert Highway Shelterbelt Thrives 20 Years After Completion", "title_zh": "沙漠公路防护林建成20年后依然茂盛", "desc_en": "Two decades after the 436-km green corridor along the Tarim Desert Highway was completed, the shelterbelt continues to thrive, sustained by drip irrigation and groundwater wells.", "desc_zh": "塔里木沙漠公路436公里绿色走廊建成20年后，依靠滴灌和地下水井持续茂盛生长。", "source": "People's Daily", "source_url": "http://en.people.cn/n3/2023/0920/c90000-20073438.html", "category": "greenbelt"},
    {"id": 6, "date": "2022-10-15", "title_en": "1,500 km² of Euphrates Poplar Forests Restored Along the Tarim River", "title_zh": "塔里木河沿线1500平方公里胡杨林恢复", "desc_en": "Sustained ecological water conveyance to the lower Tarim River has revived 1,500 km² of dying Euphrates poplar forests.", "desc_zh": "通过持续生态输水，塔里木河下游1500平方公里濒死胡杨林得以复苏。", "source": "Xinhua", "source_url": "https://www.xinhuanet.com/english/2022-10/15/c_1310668.htm", "category": "water"},
    {"id": 7, "date": "2021-11-08", "title_en": "Tarim River Ecological Water Conveyance Sets New Record", "title_zh": "塔里木河生态输水创新纪录", "desc_en": "Over 8.5 billion cubic meters of water has been delivered to the lower Tarim River since 2000.", "desc_zh": "自2000年以来，已向塔里木河下游输送超过85亿立方米生态水。", "source": "China Daily", "source_url": "https://www.chinadaily.com.cn/a/202111/08/WS618858a8a310cdd39bc73f3e.html", "category": "water"},
    {"id": 8, "date": "2020-04-08", "title_en": "Satellite Data Reveals Significant Greening Trend in China's Drylands", "title_zh": "卫星数据揭示中国旱区显著绿化趋势", "desc_en": "A study published in Nature Communications uses MODIS and Landsat satellite data to document vegetation expansion in China's arid northwest.", "desc_zh": "《自然·通讯》发表研究，利用MODIS和Landsat卫星数据记录了中国西北干旱区的植被扩展。", "source": "Nature Communications", "source_url": "https://www.nature.com/articles/s41467-020-14867-9", "category": "technology"},
    {"id": 9, "date": "2020-07-15", "title_en": "Drones Transform Desert Monitoring in Xinjiang's Taklimakan Region", "title_zh": "无人机改变新疆塔克拉玛干地区沙漠监测方式", "desc_en": "Drone-based surveys are replacing manual inspections along shelterbelt corridors.", "desc_zh": "无人机巡查正在取代防护林走廊的人工巡检。", "source": "South China Morning Post", "source_url": "https://www.scmp.com/news/china/science/article/3093801/drones-transform-desert-monitoring", "category": "technology"},
    {"id": 10, "date": "2019-11-21", "title_en": "China's Great Green Wall: 40 Years of Fighting Desertification", "title_zh": "中国绿色长城：四十年防沙治沙", "desc_en": "A retrospective on the Three-North Shelterbelt Program's four decades of progress.", "desc_zh": "回顾三北防护林工程四十年历程。", "source": "The Guardian", "source_url": "https://www.theguardian.com/world/2019/nov/21/china-great-green-wall-desertification", "category": "policy"},
    {"id": 11, "date": "2018-03-12", "title_en": "Kekeya: How One County Turned 30 Years of Desert into Forest", "title_zh": "柯柯牙：一个县如何用三十年把沙漠变成森林", "desc_en": "The remarkable story of Aksu's Kekeya greening project.", "desc_zh": "阿克苏柯柯牙绿化工程的非凡故事。", "source": "Xinhua", "source_url": "https://www.xinhuanet.com/english/2018-03/12/c_137035.htm", "category": "kekeya"},
    {"id": 12, "date": "2017-08-22", "title_en": "Water Diversion Brings Life Back to the Lower Tarim River", "title_zh": "引水工程让塔里木河下游重焕生机", "desc_en": "Emergency water diversions have restored flow to the lower Tarim River.", "desc_zh": "紧急引水使塔里木河下游重新恢复水流。", "source": "China Daily", "source_url": "https://www.chinadaily.com.cn/a/201708/22/WS5a0c9d23a3108bc8c67217.html", "category": "water"},
    {"id": 13, "date": "2016-01-15", "title_en": "Xinjiang Plans 7.6 Million Hectare Afforestation Push", "title_zh": "新疆规划760万公顷造林计划", "desc_en": "Xinjiang announces an ambitious afforestation plan targeting 7.6 million hectares.", "desc_zh": "新疆宣布760万公顷宏伟造林计划。", "source": "People's Daily", "source_url": "http://en.people.cn/n3/2016/0115/c90000-9005420.html", "category": "policy"},
    {"id": 14, "date": "2024-03-12", "title_en": "China Marks National Tree-Planting Day with Desert Focus", "title_zh": "中国植树节聚焦沙漠治理", "desc_en": "On National Tree-Planting Day, China highlights Taklimakan green belt progress as a model for large-scale ecological restoration.", "desc_zh": "在全国植树节，中国将塔克拉玛干绿化带进展作为大规模生态修复典范。", "source": "China Daily", "source_url": "https://www.chinadaily.com.cn/a/202403/12/WS65f02f9ba31082fc043ba.html", "category": "greenbelt"},
    {"id": 15, "date": "2021-06-05", "title_en": "Solar-Powered Drip Irrigation Sustains Desert Highway Shelterbelt", "title_zh": "太阳能滴灌维护沙漠公路防护林", "desc_en": "A network of solar-powered pumping stations along the Desert Highway draws brackish groundwater for drip irrigation.", "desc_zh": "沙漠公路沿线太阳能泵站网络抽取微咸地下水进行滴灌。", "source": "Xinhua", "source_url": "https://www.xinhuanet.com/english/2021-06/05/c_139991.htm", "category": "technology"},
]


def _demo_recommendations() -> list[dict]:
    """8 demo recommendations spanning all 4 categories and 5 status values.

    Frontend Decision Center needs at least one row per status to cover all UI
    branches. These are realistic-looking but synthetic — generated once at seed
    time so the demo flow stays stable.
    """
    now = datetime.utcnow()
    return [
        # 1. PLANT_HALOXYLON — pending, project_office approval, mid confidence
        {
            "action_code": "PLANT_HALOXYLON",
            "feature_id": "hotan_green_belt",
            "trigger_data_snapshot": {
                "ndvi": 0.12, "annual_rainfall_mm": 80, "soil_type": "sandy",
                "elevation_m": 1300, "ndvi_low_years": 4,
            },
            "output_params": {
                **ACTIONS["PLANT_HALOXYLON"].output_params_schema,
                "region_area_hm2": 245.0,
            },
            "confidence": 0.78,
            "estimated_cost_yuan": 245.0 * 15000.0,
            "eta_months": 36,
            "approval_level": "project_office",
            "status": "pending",
            "engine_note": None,
            "created_at": now - timedelta(hours=2),
        },
        # 2. ALERT_NDVI_DEGRADATION — approved (decided)
        {
            "action_code": "ALERT_NDVI_DEGRADATION",
            "feature_id": "alar_shelterbelt",
            "trigger_data_snapshot": {
                "ndvi": 0.13, "ndvi_drop": 0.11, "ndvi_drop_periods": 4, "ndvi_low_months": 7,
            },
            "output_params": ACTIONS["ALERT_NDVI_DEGRADATION"].output_params_schema,
            "confidence": 0.82,
            "estimated_cost_yuan": None,
            "eta_months": 0,
            "approval_level": "local",
            "status": "approved",
            "engine_note": None,
            "created_at": now - timedelta(days=1),
            "decided_at": now - timedelta(hours=18),
            "decision_notes": "Confirmed via Sentinel-2 review; dispatched drone survey.",
        },
        # 3. INSPECT_SNAKE_ROBOT — rejected (sandstorm forecast)
        {
            "action_code": "INSPECT_SNAKE_ROBOT",
            "feature_id": None,
            "region_geojson": {
                "type": "Polygon",
                "coordinates": [[[80.10, 37.00], [80.12, 37.00], [80.12, 37.02], [80.10, 37.02], [80.10, 37.00]]],
            },
            "trigger_data_snapshot": {"ndvi": 0.08, "ndvi_drop": 0.18, "terrain": "sand_dune", "slope_degrees": 22},
            "output_params": ACTIONS["INSPECT_SNAKE_ROBOT"].output_params_schema,
            "confidence": 0.55,
            "estimated_cost_yuan": None,
            "eta_months": 0,
            "approval_level": "project_office",
            "status": "rejected",
            "engine_note": None,
            "created_at": now - timedelta(days=2),
            "decided_at": now - timedelta(days=1, hours=12),
            "decision_notes": "Sandstorm forecast for next 72h — defer until visibility >5km.",
        },
        # 4. IRRIGATION_DRIP_PULSE — deferred
        {
            "action_code": "IRRIGATION_DRIP_PULSE",
            "feature_id": "korla_oasis_edge",
            "trigger_data_snapshot": {
                "soil_moisture_pct": 4.2, "forecast_rainfall_mm_14d": 2,
                "is_growth_season": True, "has_drip": True,
            },
            "output_params": ACTIONS["IRRIGATION_DRIP_PULSE"].output_params_schema,
            "confidence": 0.85,
            "estimated_cost_yuan": 32.0 * 550.0,
            "eta_months": 0,
            "approval_level": "local",
            "status": "deferred",
            "engine_note": None,
            "created_at": now - timedelta(hours=12),
            "decided_at": now - timedelta(hours=4),
            "decision_notes": "Defer 48h — pump station maintenance in progress.",
        },
        # 5. PLANT_TAMARIX — pending, awaiting L1 data (low confidence)
        {
            "action_code": "PLANT_TAMARIX",
            "feature_id": None,
            "region_geojson": {
                "type": "Polygon",
                "coordinates": [[[81.0, 40.5], [81.05, 40.5], [81.05, 40.55], [81.0, 40.55], [81.0, 40.5]]],
            },
            "trigger_data_snapshot": {"ndvi": 0.16, "ndvi_low_years": 3},
            "output_params": ACTIONS["PLANT_TAMARIX"].output_params_schema,
            "confidence": 0.18,
            "estimated_cost_yuan": 18.5 * 22500.0,
            "eta_months": 12,
            "approval_level": "project_office",
            "status": "pending",
            "engine_note": "awaiting L1 expansion: soil_moisture, groundwater_depth",
            "created_at": now - timedelta(hours=6),
        },
        # 6. ALERT_DUST_STORM — executed (warning issued + ops paused)
        {
            "action_code": "ALERT_DUST_STORM",
            "feature_id": None,
            "region_geojson": None,
            "trigger_data_snapshot": {
                "forecast_wind_m_per_s": 22, "forecast_visibility_km": 0.6,
                "season": "apr", "has_young_seedlings": True,
            },
            "output_params": ACTIONS["ALERT_DUST_STORM"].output_params_schema,
            "confidence": 0.88,
            "estimated_cost_yuan": None,
            "eta_months": 0,
            "approval_level": "local",
            "status": "executed",
            "engine_note": None,
            "created_at": now - timedelta(days=3),
            "decided_at": now - timedelta(days=3),
            "decision_notes": "Warning broadcast; drip + drone ops paused 72h; checkerboards reinforced.",
        },
        # 7. INSPECT_DRONE — pending, mid area
        {
            "action_code": "INSPECT_DRONE",
            "feature_id": None,
            "region_geojson": {
                "type": "Polygon",
                "coordinates": [[[85.8, 41.7], [85.85, 41.7], [85.85, 41.75], [85.8, 41.75], [85.8, 41.7]]],
            },
            "trigger_data_snapshot": {"ndvi": 0.18, "forecast_wind_m_per_s": 5, "forecast_visibility_km": 12},
            "output_params": ACTIONS["INSPECT_DRONE"].output_params_schema,
            "confidence": 0.81,
            "estimated_cost_yuan": None,
            "eta_months": 0,
            "approval_level": "local",
            "status": "pending",
            "engine_note": None,
            "created_at": now - timedelta(hours=4),
        },
        # 8. INSPECT_SCHEDULED — expired (past deadline, never actioned)
        {
            "action_code": "INSPECT_SCHEDULED",
            "feature_id": "hotan_green_belt",
            "trigger_data_snapshot": {"days_since_last_inspection": 95, "is_priority_zone": True},
            "output_params": ACTIONS["INSPECT_SCHEDULED"].output_params_schema,
            "confidence": 0.90,
            "estimated_cost_yuan": None,
            "eta_months": 0,
            "approval_level": "local",
            "status": "expired",
            "engine_note": None,
            "created_at": now - timedelta(days=45),
        },
    ]


async def seed():
    await init_db()

    async with async_session() as session:
        # Seed features
        for f in FEATURES:
            feat = Feature(
                id=f["id"],
                name_en=f["name_en"],
                name_zh=f["name_zh"],
                category=f["category"],
                lat=f["lat"],
                lng=f["lng"],
                description_en=f.get("description_en", ""),
                description_zh=f.get("description_zh", ""),
                stats_json=json.dumps(f.get("stats", {})),
                geometry_json=json.dumps(f["geometry"]) if f.get("geometry") else None,
            )
            await session.merge(feat)

        # Seed news articles
        for a in NEWS_ARTICLES:
            article = NewsArticle(
                id=a["id"],
                title_en=a["title_en"],
                title_zh=a["title_zh"],
                desc_en=a.get("desc_en", ""),
                desc_zh=a.get("desc_zh", ""),
                source=a.get("source", ""),
                source_url=a.get("source_url", ""),
                category=a["category"],
                date=a.get("date", ""),
            )
            await session.merge(article)

        # Seed demo recommendations only if table is empty (idempotent re-runs).
        existing = await session.execute(select(sa_func.count()).select_from(Recommendation))
        rec_count = existing.scalar_one()
        seeded_recs = 0
        if rec_count == 0:
            for r in _demo_recommendations():
                rec = Recommendation(
                    action_code=r["action_code"],
                    feature_id=r.get("feature_id"),
                    region_geojson=json.dumps(r["region_geojson"]) if r.get("region_geojson") else None,
                    trigger_data_snapshot=json.dumps(r["trigger_data_snapshot"]),
                    output_params=json.dumps(r["output_params"]),
                    confidence=r["confidence"],
                    estimated_cost_yuan=r.get("estimated_cost_yuan"),
                    eta_months=r.get("eta_months"),
                    approval_level=r["approval_level"],
                    status=r["status"],
                    engine_note=r.get("engine_note"),
                    created_at=r["created_at"],
                    decided_at=r.get("decided_at"),
                    decision_notes=r.get("decision_notes"),
                )
                session.add(rec)
                seeded_recs += 1

        await session.commit()

    print(
        f"Seeded {len(FEATURES)} features, {len(NEWS_ARTICLES)} news articles, "
        f"and {seeded_recs} recommendations (existing rows: {rec_count})."
    )


if __name__ == "__main__":
    asyncio.run(seed())
