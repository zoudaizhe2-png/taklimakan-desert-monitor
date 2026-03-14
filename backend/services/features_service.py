"""Feature data for the Taklimakan Desert interactive map."""

FEATURES = [
    # === VEGETATION ZONES ===
    {
        "id": "hotan_green_belt",
        "name_en": "Hotan Green Belt",
        "name_zh": "和田防护林带",
        "category": "vegetation",
        "lat": 37.15,
        "lng": 80.0,
        "description_en": "A major shelterbelt protecting the southern edge of the Taklimakan Desert near Hotan. Planted with drought-resistant poplar and tamarisk trees to halt sand encroachment into agricultural land.",
        "description_zh": "塔克拉玛干沙漠南缘靠近和田的主要防护林带。种植了耐旱的白杨和柽柳，以阻止沙漠向农田扩展。",
        "stats": {"area_sqkm": 450, "planted_year": 2003, "tree_species": "Poplar, Tamarisk"},
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[79.8, 37.0], [80.2, 37.0], [80.2, 37.3], [79.8, 37.3], [79.8, 37.0]]],
        },
    },
    {
        "id": "alar_shelterbelt",
        "name_en": "Alar Shelterbelt",
        "name_zh": "阿拉尔防护林",
        "category": "vegetation",
        "lat": 40.55,
        "lng": 81.0,
        "description_en": "Northern Taklimakan shelterbelt near Alar city, part of the Tarim Basin afforestation project. Acts as a barrier against northward sand movement.",
        "description_zh": "塔克拉玛干沙漠北缘阿拉尔市附近的防护林，是塔里木盆地造林工程的一部分。",
        "stats": {"area_sqkm": 380, "planted_year": 2005, "tree_species": "Saxaul, Poplar"},
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[80.8, 40.4], [81.2, 40.4], [81.2, 40.7], [80.8, 40.7], [80.8, 40.4]]],
        },
    },
    {
        "id": "korla_oasis_edge",
        "name_en": "Korla Oasis Edge",
        "name_zh": "库尔勒绿洲边缘",
        "category": "vegetation",
        "lat": 41.75,
        "lng": 86.0,
        "description_en": "The desert-oasis transition zone near Korla city. A critical boundary where irrigated farmland meets the advancing desert.",
        "description_zh": "库尔勒市附近的沙漠-绿洲过渡带。灌溉农田与推进沙漠交界的关键地带。",
        "stats": {"area_sqkm": 520, "planted_year": 2000, "tree_species": "Poplar, Elm"},
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[85.8, 41.6], [86.2, 41.6], [86.2, 41.9], [85.8, 41.9], [85.8, 41.6]]],
        },
    },
    {
        "id": "minfeng_shelterbelt",
        "name_en": "Minfeng Shelterbelt",
        "name_zh": "民丰防护林",
        "category": "vegetation",
        "lat": 37.07,
        "lng": 82.7,
        "description_en": "Southern desert edge shelterbelt near Minfeng county. One of the earliest afforestation zones along the desert highway corridor.",
        "description_zh": "民丰县附近的沙漠南缘防护林。沙漠公路走廊沿线最早的造林区之一。",
        "stats": {"area_sqkm": 180, "planted_year": 1998, "tree_species": "Tamarisk, Calligonum"},
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[82.5, 36.9], [82.9, 36.9], [82.9, 37.2], [82.5, 37.2], [82.5, 36.9]]],
        },
    },
    {
        "id": "bugur_oasis",
        "name_en": "Bugur Oasis",
        "name_zh": "轮台绿洲",
        "category": "vegetation",
        "lat": 41.78,
        "lng": 84.25,
        "description_en": "An ancient oasis town on the northern Taklimakan rim. Its poplar forests and irrigated orchards form a natural buffer against desert winds.",
        "description_zh": "塔克拉玛干沙漠北缘的古老绿洲城镇。白杨林和灌溉果园形成抵御沙漠风的天然屏障。",
        "stats": {"area_sqkm": 290, "planted_year": 1995, "tree_species": "Poplar, Fruit trees"},
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[84.0, 41.6], [84.5, 41.6], [84.5, 41.9], [84.0, 41.9], [84.0, 41.6]]],
        },
    },
    {
        "id": "aksu_green_corridor",
        "name_en": "Aksu Green Corridor",
        "name_zh": "阿克苏绿色走廊",
        "category": "vegetation",
        "lat": 41.15,
        "lng": 80.3,
        "description_en": "Aksu's Kekeya greening project, a model afforestation initiative that transformed barren gobi into productive forest and farmland over three decades.",
        "description_zh": "阿克苏柯柯牙绿化工程，三十年来将荒漠戈壁变成森林农田的模范造林项目。",
        "stats": {"area_sqkm": 340, "planted_year": 1986, "tree_species": "Poplar, Apple, Walnut"},
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[80.1, 41.0], [80.5, 41.0], [80.5, 41.3], [80.1, 41.3], [80.1, 41.0]]],
        },
    },
    # === DESERT AREAS ===
    {
        "id": "central_dune_field",
        "name_en": "Central Taklimakan Dunes",
        "name_zh": "塔克拉玛干中部沙丘",
        "category": "desert",
        "lat": 39.0,
        "lng": 83.0,
        "description_en": "The heart of the Taklimakan — one of the world's largest shifting sand deserts. Dunes reach heights of 200-300 meters with virtually no vegetation.",
        "description_zh": "塔克拉玛干腹地——世界上最大的流动沙漠之一。沙丘高达200-300米，几乎没有植被。",
        "stats": {"area_sqkm": 130000, "max_dune_height_m": 300, "annual_rainfall_mm": 10},
    },
    {
        "id": "western_sand_sea",
        "name_en": "Western Sand Sea",
        "name_zh": "西部沙海",
        "category": "desert",
        "lat": 38.5,
        "lng": 79.5,
        "description_en": "Vast sand sea in the western Taklimakan with complex star dunes. One of the most hostile environments on Earth.",
        "description_zh": "塔克拉玛干西部的广阔沙海，拥有复杂的星状沙丘。地球上最恶劣的环境之一。",
        "stats": {"area_sqkm": 45000, "max_dune_height_m": 250, "annual_rainfall_mm": 8},
    },
    {
        "id": "eastern_sand_ridges",
        "name_en": "Eastern Sand Ridges",
        "name_zh": "东部沙垄",
        "category": "desert",
        "lat": 39.5,
        "lng": 86.5,
        "description_en": "Long parallel sand ridges in the eastern Taklimakan, formed by prevailing northeast winds. The ridges can extend for dozens of kilometers.",
        "description_zh": "塔克拉玛干东部由东北风形成的平行沙垄。沙垄可延伸数十公里。",
        "stats": {"area_sqkm": 55000, "max_dune_height_m": 180, "annual_rainfall_mm": 15},
    },
    {
        "id": "lop_nur_margin",
        "name_en": "Lop Nur Desert Margin",
        "name_zh": "罗布泊沙漠边缘",
        "category": "desert",
        "lat": 40.5,
        "lng": 89.5,
        "description_en": "The eastern edge of the Taklimakan merging with the Lop Nur region. Once home to the ancient Loulan Kingdom, now one of the driest places on Earth.",
        "description_zh": "塔克拉玛干东缘与罗布泊地区交汇处。曾是古楼兰王国所在地，现为地球上最干旱的地方之一。",
        "stats": {"area_sqkm": 30000, "max_dune_height_m": 120, "annual_rainfall_mm": 5},
    },
    # === CITIES ===
    {
        "id": "hotan_city",
        "name_en": "Hotan",
        "name_zh": "和田",
        "category": "city",
        "lat": 37.12,
        "lng": 79.93,
        "description_en": "A historic Silk Road oasis city on the southern rim of the Taklimakan. Known for jade trading and as a base for desert containment operations.",
        "description_zh": "塔克拉玛干南缘的历史丝绸之路绿洲城市。以玉石贸易和沙漠治理基地闻名。",
        "stats": {"population": "500,000", "elevation_m": 1375},
    },
    {
        "id": "korla_city",
        "name_en": "Korla",
        "name_zh": "库尔勒",
        "category": "city",
        "lat": 41.76,
        "lng": 86.15,
        "description_en": "The second-largest city in southern Xinjiang, situated along the Konqi River. A major hub for oil extraction and oasis agriculture.",
        "description_zh": "南疆第二大城市，位于孔雀河畔。石油开采和绿洲农业的重要枢纽。",
        "stats": {"population": "680,000", "elevation_m": 932},
    },
    {
        "id": "alar_city",
        "name_en": "Alar",
        "name_zh": "阿拉尔",
        "category": "city",
        "lat": 40.55,
        "lng": 81.28,
        "description_en": "A young city on the northern desert edge, built as an agricultural reclamation base. Home to the Tarim University desert research center.",
        "description_zh": "沙漠北缘的年轻城市，作为农业垦区基地建设。塔里木大学沙漠研究中心所在地。",
        "stats": {"population": "280,000", "elevation_m": 1012},
    },
    {
        "id": "kashgar_city",
        "name_en": "Kashgar",
        "name_zh": "喀什",
        "category": "city",
        "lat": 39.47,
        "lng": 75.99,
        "description_en": "The westernmost major city near the Taklimakan, a legendary Silk Road trading hub. Its oasis depends on meltwater from the Pamir and Kunlun mountains.",
        "description_zh": "塔克拉玛干附近最西端的大城市，传奇丝绸之路贸易枢纽。绿洲依赖帕米尔和昆仑山的融雪水。",
        "stats": {"population": "710,000", "elevation_m": 1289},
    },
    {
        "id": "aksu_city",
        "name_en": "Aksu",
        "name_zh": "阿克苏",
        "category": "city",
        "lat": 41.17,
        "lng": 80.26,
        "description_en": "Northwestern gateway to the Taklimakan. Famous for its apples and the Kekeya afforestation project that has been a national model for desert greening.",
        "description_zh": "塔克拉玛干西北门户。以苹果和柯柯牙造林工程闻名，后者是全国沙漠绿化的典范。",
        "stats": {"population": "620,000", "elevation_m": 1104},
    },
    {
        "id": "kuqa_city",
        "name_en": "Kuqa",
        "name_zh": "库车",
        "category": "city",
        "lat": 41.73,
        "lng": 82.94,
        "description_en": "Ancient Buddhist kingdom city on the northern Taklimakan rim. Now an important oil production base and gateway to desert tourism.",
        "description_zh": "塔克拉玛干北缘的古代佛教王国城市。现为重要的石油生产基地和沙漠旅游入口。",
        "stats": {"population": "520,000", "elevation_m": 1082},
    },
    # === ACTIVE PROJECTS ===
    {
        "id": "desert_highway_project",
        "name_en": "Tarim Desert Highway Shelterbelt",
        "name_zh": "塔里木沙漠公路防护林",
        "category": "project",
        "lat": 38.8,
        "lng": 83.6,
        "description_en": "A 436km green corridor along the world's longest desert highway. Drip-irrigated vegetation strips protect the road from sand burial. Over 20 million trees planted since 2003.",
        "description_zh": "沿世界最长沙漠公路建设的436公里绿色走廊。滴灌植被带保护公路免受沙埋。自2003年以来种植了2000多万棵树。",
        "stats": {"length_km": 436, "trees_planted": "20 million", "start_year": 2003, "target_year": 2008},
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[83.5, 38.5], [83.8, 38.5], [83.8, 39.0], [83.5, 39.0], [83.5, 38.5]]],
        },
    },
    {
        "id": "three_north_program",
        "name_en": "Three-North Shelterbelt (Xinjiang Section)",
        "name_zh": "三北防护林（新疆段）",
        "category": "project",
        "lat": 41.3,
        "lng": 83.0,
        "description_en": "The Xinjiang section of China's 'Great Green Wall' — the world's largest afforestation project. Aims to increase forest cover across northern Xinjiang to block desert expansion.",
        "description_zh": "中国'绿色长城'——世界最大造林工程的新疆段。旨在增加新疆北部森林覆盖率以阻止沙漠扩张。",
        "stats": {"total_area_sqkm": 12000, "start_year": 1978, "target_year": 2050},
    },
    {
        "id": "tarim_water_diversion",
        "name_en": "Tarim Basin Water Diversion",
        "name_zh": "塔里木盆地引水工程",
        "category": "project",
        "lat": 40.8,
        "lng": 85.5,
        "description_en": "Emergency water diversion project to restore the lower Tarim River and revive dying poplar forests along its banks. Has delivered over 8 billion cubic meters of water since 2000.",
        "description_zh": "紧急引水工程，恢复塔里木河下游并拯救河岸濒死的胡杨林。自2000年以来已输水80多亿立方米。",
        "stats": {"water_delivered_billion_m3": 8.3, "start_year": 2000, "target_year": 2030, "poplar_restored_sqkm": 1500},
    },
    {
        "id": "green_belt_encirclement",
        "name_en": "Taklimakan Green Belt Encirclement",
        "name_zh": "塔克拉玛干沙漠锁边工程",
        "category": "project",
        "lat": 39.5,
        "lng": 80.5,
        "description_en": "Ambitious project to create a continuous green belt around the entire Taklimakan perimeter (~3,046 km). The final 285km gap on the southern edge was closed in late 2024.",
        "description_zh": "在整个塔克拉玛干沙漠周边（约3046公里）建造连续绿化带的宏伟工程。南缘最后285公里的缺口已于2024年底合龙。",
        "stats": {"perimeter_km": 3046, "gap_closed_year": 2024, "total_trees": "billions", "start_year": 2010, "target_year": 2024},
    },
    # === WATER SOURCES ===
    {
        "id": "tarim_river",
        "name_en": "Tarim River",
        "name_zh": "塔里木河",
        "category": "water",
        "lat": 41.0,
        "lng": 83.5,
        "description_en": "China's longest inland river (2,137 km), flowing along the northern edge of the Taklimakan. Its water sustains the oases and poplar forests that form the desert's northern barrier.",
        "description_zh": "中国最长的内陆河（2137公里），沿塔克拉玛干北缘流淌。河水维系着构成沙漠北部屏障的绿洲和胡杨林。",
        "stats": {"length_km": 2137, "basin_area_sqkm": 1020000},
    },
    {
        "id": "hotan_river",
        "name_en": "Hotan River",
        "name_zh": "和田河",
        "category": "water",
        "lat": 38.0,
        "lng": 80.5,
        "description_en": "One of the few rivers that penetrates deep into the Taklimakan from the south. Fed by Kunlun Mountain glaciers, it provides vital water for southern oasis communities.",
        "description_zh": "少数从南部深入塔克拉玛干沙漠的河流之一。由昆仑山冰川供水，为南部绿洲社区提供重要水源。",
        "stats": {"length_km": 1127, "source": "Kunlun Mountains"},
    },
    {
        "id": "yarkand_river",
        "name_en": "Yarkand River",
        "name_zh": "叶尔羌河",
        "category": "water",
        "lat": 38.5,
        "lng": 77.5,
        "description_en": "Major river feeding the western Taklimakan oases. Originates from Karakoram glaciers and supports agriculture in the Kashgar and Yarkand regions.",
        "description_zh": "供养塔克拉玛干西部绿洲的主要河流。发源于喀喇昆仑冰川，支撑喀什和莎车地区的农业。",
        "stats": {"length_km": 1097, "source": "Karakoram Range"},
    },
    {
        "id": "bosten_lake",
        "name_en": "Bosten Lake",
        "name_zh": "博斯腾湖",
        "category": "water",
        "lat": 41.98,
        "lng": 87.05,
        "description_en": "China's largest inland freshwater lake in Xinjiang. Acts as a natural reservoir regulating water flow to the Konqi River and the eastern Taklimakan oases.",
        "description_zh": "新疆最大的内陆淡水湖。作为天然水库调节孔雀河和塔克拉玛干东部绿洲的水量。",
        "stats": {"area_sqkm": 1019, "max_depth_m": 17, "elevation_m": 1048},
    },
]


def get_features(category=None, search=None):
    """Filter features by category and/or search string."""
    results = FEATURES
    if category:
        results = [f for f in results if f["category"] == category]
    if search:
        search_lower = search.lower()
        results = [
            f
            for f in results
            if search_lower in f["name_en"].lower()
            or search_lower in f["name_zh"]
            or search_lower in f["description_en"].lower()
        ]
    return results


def get_feature_by_id(feature_id):
    """Get a single feature by ID."""
    for f in FEATURES:
        if f["id"] == feature_id:
            return f
    return None
