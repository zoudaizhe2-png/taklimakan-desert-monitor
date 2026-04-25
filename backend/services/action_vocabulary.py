"""L3 Action Vocabulary — 17 actions extracted from docs/L3-action-vocabulary.md.

DO NOT modify trigger_conditions, output_params_schema, costs, or eta values
without re-reading the underlying citations. Every parameter in this file
traces back to a paper, government standard, or operational record listed
in the `sources` field. Free-form changes break the auditability promise
described in docs/L3-action-vocabulary.md §1.1.

Categories (4):
  - planting    (6 actions: PLANT_HALOXYLON, PLANT_TAMARIX, PLANT_CALLIGONUM,
                              PLANT_POPULUS, PLANT_HEDYSARUM, PLANT_MIXED)
  - irrigation  (4 actions: IRRIGATION_DRIP_PULSE, IRRIGATION_FLOOD_ECOLOGICAL,
                              GROUNDWATER_CAUTION, IRRIGATION_SKIP)
  - inspection  (4 actions: INSPECT_HUMAN, INSPECT_SNAKE_ROBOT,
                              INSPECT_DRONE, INSPECT_SCHEDULED)
  - alert       (3 actions: ALERT_DUST_STORM, ALERT_HEAT_WAVE,
                              ALERT_NDVI_DEGRADATION)
"""

from models.action import ActionDefinition


# ─── 2.1 Planting Recommendations (6) ────────────────────────────────────────

PLANT_HALOXYLON = ActionDefinition(
    code="PLANT_HALOXYLON",
    category="planting",
    name_zh="推荐种植梭梭",
    name_en="Plant Haloxylon ammodendron (saxaul)",
    description_zh=(
        "在裸沙到稀疏植被区推荐种植梭梭,作为塔克拉玛干周边主体固沙乔木种。"
        "适用流动/半固定沙丘,年降水 50-150mm 区间。"
    ),
    description_en=(
        "Plant saxaul (Haloxylon ammodendron) as the dominant sand-fixation shrub "
        "for bare/sparse zones around the Taklimakan, on mobile/semi-fixed dunes "
        "with 50-150mm annual rainfall."
    ),
    trigger_conditions={
        "ndvi_persistent_low_years": 3,
        "ndvi_threshold": 0.15,
        "annual_rainfall_mm_min": 50,
        "annual_rainfall_mm_max": 150,
        "soil_type_in": ["sandy", "sandy-loam", "mobile_dune", "semi_fixed_dune"],
        "elevation_max_m": 1500,
    },
    output_params_schema={
        "density_per_hm2_range": [600, 1100],
        "spacing_m": "4x4 (no irrigation) or 3x3 (drip)",
        "seedling_age_years": [1, 2],
        "seedling_height_cm": [30, 50],
        "planting_window": "April 10-25 (spring) or late October (fall)",
        "planting_depth": "root collar 5-10cm below surface, 1cm sand cover for seeds",
        "establishment_water_kg_per_pit": [3, 4],
        "root_soak_minutes": 30,
    },
    confidence_baseline=0.80,  # Aksu Shaya brackish-drip case ≥80%
    cost_yuan_per_hm2=15000.0,  # midpoint of 600-1500 yuan/mu × 10 mu/hm2
    eta_months_min=36,  # 3-5 yr to NDVI 0.2-0.3
    eta_months_max=60,
    approval_level="project_office",  # >1000 mu requires regional
    data_requirements=["ndvi", "rainfall", "soil_type", "elevation", "species_map"],
    sources=[
        "http://www.desert.ac.cn/CN/10.7522/j.issn.1000-694X.2014.00127",
        "http://www.linan.gov.cn/art/2019/2/14/art_1377194_30215050.html",  # GB/T 18337.3-2001
        "https://foundation.see.org.cn/Brand/Project/2019/0918/5.html",
        "http://iae.cas.cn/lnesc/ttbz/202505/P020250528563704496397.pdf",
        "http://www.news.cn/local/20251129/f3269c454fb741eda2e80b62be864b2b/c.html",
    ],
    can_autonomous_phase_c=False,  # never auto — doc §6
)


PLANT_TAMARIX = ActionDefinition(
    code="PLANT_TAMARIX",
    category="planting",
    name_zh="推荐种植红柳(多枝柽柳)",
    name_en="Plant Tamarix ramosissima (red willow)",
    description_zh=(
        "在轻-中盐碱、地下水位 2-10m 的河岸/低洼地推荐种植红柳。"
        "盐生先锋,常用于塔里木河沿线和微咸水滴灌带。"
    ),
    description_en=(
        "Plant tamarix on mildly saline lowlands and riverbanks with groundwater "
        "table 2-10m. Pioneer halophyte for Tarim riparian belts and brackish-water "
        "drip irrigation zones."
    ),
    trigger_conditions={
        "ndvi_persistent_low_years": 3,
        "ndvi_threshold": 0.20,
        "soil_salinity_pct_min": 0.5,
        "soil_salinity_pct_max": 2.0,
        "groundwater_depth_m_min": 2,
        "groundwater_depth_m_max": 10,
    },
    output_params_schema={
        "density_per_mu_range": [1670, 3300],
        "spacing_m": "(0.5-1.0) x (2-3)",
        "seedling_type": "1yr cuttings or 2yr bare-root",
        "seedling_height_cm": [50, 80],
        "planting_window": "March late - April mid (pre-bud) or October-November",
        "establishment_water_kg_per_pit": [5, 8],
        "irrigation_cycle_days": 26,
        "well_spacing_km": [4, 9],
    },
    confidence_baseline=0.85,  # Tarim Highway 436km, 20+yr proven
    cost_yuan_per_hm2=22500.0,  # 1500-3000 yuan/mu × 10
    eta_months_min=12,
    eta_months_max=36,
    approval_level="project_office",
    data_requirements=[
        "ndvi", "soil_moisture", "rainfall", "groundwater_depth",
        "elevation", "species_map",
    ],
    sources=[
        "https://www.cjae.net/CN/10.13287/j.1001-9332.201903.023",
        "http://www.forestry.gov.cn/c/www/xcsp/568301.jhtml",
        "https://www.ecoagri.ac.cn/en/article/pdf/preview/10.3724/SP.J.1011.2013.21077.pdf",
    ],
    can_autonomous_phase_c=False,
)


PLANT_CALLIGONUM = ActionDefinition(
    code="PLANT_CALLIGONUM",
    category="planting",
    name_zh="推荐种植沙拐枣",
    name_en="Plant Calligonum mongolicum",
    description_zh=(
        "在流动沙丘表面推荐种植沙拐枣,真正的流沙先锋种。"
        "抗旱性 > 梭梭,可纯雨养,常配合草方格沙障。"
    ),
    description_en=(
        "Plant Calligonum on mobile dune surfaces — a true active-sand pioneer with "
        "drought tolerance exceeding saxaul. Rain-fed, often paired with straw checkerboards."
    ),
    trigger_conditions={
        "ndvi_threshold": 0.15,
        "soil_type_in": ["coarse_sand", "sandy_gravel", "mobile_dune"],
        # No groundwater requirement (lateral roots 20-30m, taproot 3m)
    },
    output_params_schema={
        "density_per_hm2": 3000,  # GB/T 18337.3-2001 dryland sparse standard
        "seedling_type": "1-2yr seedlings or direct seed (2cm depth)",
        "planting_window": "April spring, sand moist; 1-3 days post-rain optimal",
        "irrigation_required": False,
        "companion_technique": "straw checkerboard sand barrier",
    },
    confidence_baseline=0.70,  # natural regen difficult per Fan 2018
    cost_yuan_per_hm2=4000.0,  # 300-500 yuan/mu × 10
    eta_months_min=12,
    eta_months_max=36,
    approval_level="local",  # <500 mu local; >500 project office
    data_requirements=["ndvi", "soil_type", "elevation", "species_map"],
    sources=[
        "https://onlinelibrary.wiley.com/doi/full/10.1002/ece3.3913",
        "https://www.frontiersin.org/journals/plant-science/articles/10.3389/fpls.2018.01167/full",
        "http://www.desert.ac.cn/CN/Y2010/V30/I6/1348",
    ],
    can_autonomous_phase_c=False,
)


PLANT_POPULUS = ActionDefinition(
    code="PLANT_POPULUS",
    category="planting",
    name_zh="推荐种植/抚育胡杨",
    name_en="Plant or rehabilitate Populus euphratica (desert poplar)",
    description_zh=(
        "仅在塔里木河及支流沿线推荐胡杨,需地下水位 < 5m 且有生态输水保障。"
        "三种 sub-action: 输水诱发自然更新 / 老龄平茬复壮 / 河漫滩新植。"
    ),
    description_en=(
        "Restrict to Tarim river corridors with groundwater <5m AND scheduled "
        "ecological water release. Three sub-actions: flood-induced natural "
        "regeneration / coppicing of degraded stands / new planting on floodplains."
    ),
    trigger_conditions={
        "geographic_zone": "tarim_riparian",
        "groundwater_depth_m_max": 5,
        "ndvi_decline_consecutive_years": 2,
        "ndvi_decline_min": 0.05,
        "upstream_water_release_scheduled": True,
    },
    output_params_schema={
        "sub_actions": ["flood_induced_regen", "coppicing", "new_planting"],
        "seedling_type": "container, 80-120cm height (new planting)",
        "spacing_m": "3 x 4",
        "planting_window": "March-April or October (sync with water release)",
        "post_water_inspection_window_weeks": [1, 2],
        "expected_groundwater_recovery_m": [2.0, 3.5],  # Luntai county case
    },
    confidence_baseline=0.85,  # 26yr Tarim release, 41% high-cover increase
    cost_yuan_per_hm2=22500.0,  # new planting 1500-3000/mu; flood mode <100/mu
    eta_months_min=2,  # poplar shoots in 1-3 months post-flood
    eta_months_max=60,
    approval_level="regional",  # autonomous region forestry+water bureau
    data_requirements=[
        "ndvi", "soil_moisture", "rainfall", "groundwater_depth",
        "elevation", "historical_planting", "species_map",
    ],
    sources=[
        "https://china.chinadaily.com.cn/a/202508/14/WS689dcbcaa3104ba1353fce24.html",
        "https://www.hanspub.org/journal/PaperInformation?paperID=25243",
        "https://czt.xinjiang.gov.cn/xjczt/c115022/202409/24e8617647704b2d9b58743e7cb7eb69.shtml",
        "https://slt.xinjiang.gov.cn/xjslt/c114431/202311/3554ce296a6c424e908082053ee5e588.shtml",
    ],
    can_autonomous_phase_c=False,
)


PLANT_HEDYSARUM = ActionDefinition(
    code="PLANT_HEDYSARUM",
    category="planting",
    name_zh="推荐种植花棒",
    name_en="Plant Hedysarum scoparium (sweetvetch)",
    description_zh=(
        "塔克拉玛干东北缘 / 河西过渡带推荐花棒。"
        "极强抗旱(干沙层 40cm 含水率 2-4% 仍能生长),沙坡头模式核心种。"
    ),
    description_en=(
        "For the NE Taklimakan margin and Hexi transition zone. Extreme drought "
        "tolerance (survives 2-4% moisture under 40cm dry sand). Core species in "
        "the Shapotou (Baolan railway) sand-fixation system."
    ),
    trigger_conditions={
        "ndvi_threshold": 0.15,
        "geographic_zone_in": [
            "taklimakan_NE_margin", "hexi_corridor", "mu_us_transition",
        ],
        "dry_sand_layer_thickness_cm_max": 40,
    },
    output_params_schema={
        "density_per_hm2_range": [2500, 4000],
        "seedling_type": "1yr seedling or direct seed (2cm depth, 95.6% emergence)",
        "seedling_height_cm": [30, 50],
        "planting_window": "April early-mid; pre-rainy season (June) acceptable",
        "companion_species": ["Caragana korshinskii (柠条)", "Artemisia ordosica (油蒿)"],
    },
    confidence_baseline=0.80,  # Shapotou 60+ yr proven
    cost_yuan_per_hm2=6000.0,  # 400-800 yuan/mu × 10
    eta_months_min=12,
    eta_months_max=24,
    approval_level="project_office",
    data_requirements=["ndvi", "soil_type", "elevation", "species_map"],
    sources=[
        "http://www.desert.ac.cn/CN/10.7522/j.issn.1000-694X.2020.00055",
        "http://www.ecolsci.com/CN/abstract/abstract303.shtml",
        "http://www.forestry.gov.cn.cdn20.com/c/www/dzw/560411.jhtml",
    ],
    can_autonomous_phase_c=False,
)


PLANT_MIXED = ActionDefinition(
    code="PLANT_MIXED",
    category="planting",
    name_zh="推荐混交群落配置",
    name_en="Plant mixed community (multi-species mosaic)",
    description_zh=(
        "区域 > 500 hm² 且土壤异质时推荐混交配置:"
        "沙丘顶 → 沙拐枣;中部 → 梭梭(50%);底部 → 红柳(30%);河漫滩 → 胡杨。"
    ),
    description_en=(
        "For >500 hm² zones with heterogeneous soil, deploy a mosaic: "
        "Calligonum on dune crests, Haloxylon (50%) midslope, Tamarix (30%) on "
        "lowlands, Populus on floodplains where water permits."
    ),
    trigger_conditions={
        "area_hm2_min": 500,
        "ndvi_threshold": 0.20,
        "soil_heterogeneity_required": True,
    },
    output_params_schema={
        "species_mix": {
            "haloxylon_pct": 50,
            "tamarix_pct": 30,
            "calligonum_pct": 15,
            "hedysarum_pct": 5,
        },
        "spatial_layout": "dune crest=Calligonum; mid=Haloxylon; lowland=Tamarix; floodplain=Populus",
        "windward_density_pattern": "high front (NW) → tapering rear",
    },
    confidence_baseline=0.85,  # Tarim Highway 436km validated
    cost_yuan_per_hm2=15000.0,  # weighted, 1000-2000/mu with drip
    eta_months_min=24,
    eta_months_max=60,
    approval_level="regional",
    data_requirements=[
        "ndvi", "soil_moisture", "rainfall", "groundwater_depth",
        "elevation", "historical_planting", "species_map",
    ],
    sources=[
        "http://www.news.cn/local/20251129/f3269c454fb741eda2e80b62be864b2b/c.html",
    ],
    can_autonomous_phase_c=False,
)


# ─── 2.2 Water Management (4) ─────────────────────────────────────────────────

IRRIGATION_DRIP_PULSE = ActionDefinition(
    code="IRRIGATION_DRIP_PULSE",
    category="irrigation",
    name_zh="推荐启动滴灌",
    name_en="Trigger drip irrigation pulse",
    description_zh=(
        "土壤湿度跌破阈值且 14 天无大雨时,启动滴灌。"
        "成树 11.5-23 升/株/次,幼苗 5-10 升/株/次,26 天轮灌。"
    ),
    description_en=(
        "Trigger drip when SMAP root-zone moisture falls below threshold AND "
        "ERA5 forecasts <5mm rain for 14 days. 11.5-23 L/plant for adults, "
        "5-10 L for seedlings, 26-day rotation."
    ),
    trigger_conditions={
        "soil_moisture_root_zone_pct_max": 5,
        "forecast_rainfall_mm_max_14d": 5,
        "phenology_growth_season": True,  # April-September
        "drip_infrastructure_present": True,
    },
    output_params_schema={
        "water_per_adult_plant_L": [11.5, 23.0],
        "water_per_seedling_L": [5.0, 10.0],
        "rotation_cycle_days": 26,
        "max_water_salinity_g_per_L": 4.8,
        "preferred_pump_type": "solar",
    },
    confidence_baseline=0.90,  # Tarim Highway 21161km drip, 20yr data
    cost_yuan_per_hm2=550.0,  # 30-80 yuan/mu × ~10 per cycle midpoint
    eta_months_min=0,  # 24-72hr soil moisture rebound
    eta_months_max=1,
    approval_level="local",
    data_requirements=["soil_moisture", "rainfall", "ndvi"],
    sources=[
        "http://www.forestry.gov.cn/c/www/xcsp/568301.jhtml",
        "http://www.desert.ac.cn/EN/article/downloadArticleFile.do?attachType=PDF&id=3932",
        "https://www.plant-ecology.com/CN/lexeme/showArticleByLexeme.do?articleID=5581",
    ],
    can_autonomous_phase_c=True,  # Phase B/C target — SCADA-automatable
)


IRRIGATION_FLOOD_ECOLOGICAL = ActionDefinition(
    code="IRRIGATION_FLOOD_ECOLOGICAL",
    category="irrigation",
    name_zh="推荐启动生态输水/引洪灌溉",
    name_en="Trigger ecological flood release",
    description_zh=(
        "塔里木河沿线胡杨退化 + 地下水位 > 5m 时,推荐启动生态输水。"
        "年目标 ≥3.5 亿 m³,三年一轮灌,7-9 月洪水期最优。"
    ),
    description_en=(
        "When Tarim riparian poplar shows decline and groundwater >5m, trigger "
        "ecological water release. Annual target ≥350M m³, 3-year rotation, "
        "July-September flood window optimal."
    ),
    trigger_conditions={
        "geographic_zone": "tarim_riparian",
        "ndvi_decline_consecutive_years": 2,
        "ndvi_decline_min": 0.05,
        "groundwater_depth_m_min": 5,
        "upstream_water_available_m3": 350_000_000,
        "season_in": ["jul", "aug", "sep"],
    },
    output_params_schema={
        "annual_target_m3": 350_000_000,
        "rotation_years": 3,
        "release_path": "Daxihaizi reservoir → 800km downstream channel + flood zone",
        "target_groundwater_depth_m_post_release": [2, 5],
    },
    confidence_baseline=0.85,  # 26yr / 102 billion m³ proven
    cost_yuan_per_hm2=None,  # basin-scale, tens of millions to >100M yuan total
    eta_months_min=1,  # groundwater rebound 1-2 months
    eta_months_max=240,  # 41% high-cover increase over 20yr
    approval_level="regional",
    data_requirements=[
        "ndvi", "soil_moisture", "rainfall", "groundwater_depth",
        "elevation", "historical_planting", "species_map",
    ],
    sources=[
        "https://china.chinadaily.com.cn/a/202508/14/WS689dcbcaa3104ba1353fce24.html",
        "http://news.cctv.com/2019/08/28/ARTI9yiLYegfX8b0zJrfNMbL190828.shtml",
        "https://slt.xinjiang.gov.cn/xjslt/c114431/202311/3554ce296a6c424e908082053ee5e588.shtml",
    ],
    can_autonomous_phase_c=False,  # never auto — doc §6 (irreversible, multi-bureau)
)


GROUNDWATER_CAUTION = ActionDefinition(
    code="GROUNDWATER_CAUTION",
    category="irrigation",
    name_zh="推荐限制地下水开采",
    name_en="Recommend groundwater extraction caution / policy alert",
    description_zh=(
        "地下水位连续 3 年下降 > 1m/年 + 周边 NDVI 退化时触发。"
        "policy action,推荐林业局向水利局提交暂停新井审批 + 限额开采建议。"
    ),
    description_en=(
        "Trigger when groundwater monitoring well shows >1m/yr decline for 3yr "
        "AND surrounding NDVI degrades. Policy action — recommend forestry bureau "
        "petition water bureau for new-well moratorium + extraction quota."
    ),
    trigger_conditions={
        "groundwater_decline_consecutive_years": 3,
        "groundwater_decline_m_per_year_min": 1,
        "surrounding_ndvi_degradation_within_km": 5,
        "geographic_zone_in": ["inland_river_terminus", "tail_oasis"],
    },
    output_params_schema={
        "policy_recommendation": "moratorium on new wells + extraction quota",
        "quota_value": "site-specific (requires hydrologic model)",
        "alternative_water_source": "surface water + water-saving drip",
        "compensation_required": True,
    },
    confidence_baseline=0.85,  # Minqin lesson well-documented
    cost_yuan_per_hm2=None,  # policy action — direct cost zero, social cost large
    eta_months_min=12,
    eta_months_max=36,
    approval_level="regional",  # cross-bureau (water+forestry+agriculture)
    data_requirements=[
        "ndvi", "soil_moisture", "groundwater_depth", "historical_planting",
    ],
    sources=[
        "https://www.mj.org.cn/mjzt/content/2017-10/26/content_271511.htm",
        "https://zrzy.gansu.gov.cn/zrzy/c107751/202208/2095581/files/a39b9901967444a981e6a7b2ba66b270.pdf",
    ],
    can_autonomous_phase_c=False,
)


IRRIGATION_SKIP = ActionDefinition(
    code="IRRIGATION_SKIP",
    category="irrigation",
    name_zh="推荐本周期跳过灌溉",
    name_en="Skip this irrigation cycle",
    description_zh=(
        "未来 7 天预报降水 > 10mm 累计 + 当前土壤湿度饱和时,跳过本轮滴灌。"
        "节水 23-50 m³/hm²,成本节省 30-80 元/亩。"
    ),
    description_en=(
        "Skip drip if ERA5 forecasts >10mm cumulative rain in next 7 days AND "
        "SMAP shows soil already saturated. Saves 23-50 m³/hm² and 30-80 yuan/mu."
    ),
    trigger_conditions={
        "forecast_rainfall_mm_min_7d": 10,
        "soil_moisture_saturated": True,
        "phenology_non_critical": True,
    },
    output_params_schema={
        "next_evaluation_after_days": 26,
        "water_saved_m3_per_hm2": [23, 50],
    },
    confidence_baseline=0.90,  # weather forecast reliability
    cost_yuan_per_hm2=-550.0,  # NEGATIVE = savings
    eta_months_min=0,
    eta_months_max=1,
    approval_level="local",
    data_requirements=["soil_moisture", "rainfall"],
    sources=[
        "http://www.desert.ac.cn/EN/article/downloadArticleFile.do?attachType=PDF&id=3932",
    ],
    can_autonomous_phase_c=True,
)


# ─── 2.3 Inspection Dispatch (4) ──────────────────────────────────────────────

INSPECT_HUMAN = ActionDefinition(
    code="INSPECT_HUMAN",
    category="inspection",
    name_zh="派人工巡检",
    name_en="Dispatch human field inspection",
    description_zh=(
        "异常区 > 50 hm²、需要做种植判断、涉及边界纠纷,或恶劣天气期间,"
        "派 2-4 人现场巡检。1-3 天/100km²,7 天内提交报告。"
    ),
    description_en=(
        "Dispatch 2-4 person crew for >50 hm² anomalies, planting decisions, "
        "boundary disputes, or during conditions unsafe for robots. "
        "1-3 days per 100 km², report due within 7 days."
    ),
    trigger_conditions={
        "anomaly_area_hm2_min": 50,
        "needs_planting_judgment": True,
        # OR boundary dispute / weather warning active (eval as logical OR per code)
    },
    output_params_schema={
        "crew_size": [2, 4],
        "equipment": ["GPS", "soil sampler", "camera", "GoPro", "portable NDVI meter"],
        "duration_days_per_100km2": [1, 3],
        "report_deadline_days": 7,
    },
    confidence_baseline=0.95,  # operational, not predictive
    cost_yuan_per_hm2=None,  # 3000-8000 yuan/trip flat
    eta_months_min=0,
    eta_months_max=1,
    approval_level="project_office",
    data_requirements=["ndvi", "rainfall"],
    sources=[],
    can_autonomous_phase_c=False,
)


INSPECT_SNAKE_ROBOT = ActionDefinition(
    code="INSPECT_SNAKE_ROBOT",
    category="inspection",
    name_zh="派蛇形机器人巡检",
    name_en="Dispatch snake robot for visual confirmation / sampling",
    description_zh=(
        "异常区 < 5 hm²、缓坡(< 30°)、需近距离目视确认时派蛇形机器人。"
        "拍 RGB+NIR、采样 0-5cm + 20cm、续航限制 < 500m。"
    ),
    description_en=(
        "Dispatch snake robot for <5 hm² anomalies on gentle slopes (<30°) needing "
        "close-range visual confirmation. RGB+NIR imaging, 0-5cm + 20cm soil "
        "sampling, <500m deployment radius (battery-limited)."
    ),
    trigger_conditions={
        "ndvi_drop_min": 0.15,
        "anomaly_area_hm2_max": 5,
        "terrain_in": ["sand_dune", "flat", "gentle_slope"],
        "slope_degrees_max": 30,  # Marvi 2014 Science sidewinding boundary
    },
    output_params_schema={
        "task_types": ["visual_confirm", "soil_sample", "temp_humidity_log"],
        "deployment_radius_m_max": 500,
        "speed_m_per_s": [0.05, 0.3],
        "payload_limit_kg": 1,
        "cannot_perform": ["heavy_lifting", "seeding", "valve_operation"],
    },
    confidence_baseline=0.65,  # tech still maturing — long-distance + dust durability
    cost_yuan_per_hm2=None,  # 500-2000 yuan/trip flat
    eta_months_min=0,
    eta_months_max=1,
    approval_level="project_office",  # local for repeat, prefecture for first-time pilot
    data_requirements=["ndvi", "rainfall", "elevation"],
    sources=[
        "https://www.science.org/doi/10.1126/science.1255718",
        "https://www.sciencedirect.com/science/article/pii/S0957415825001278",
        "https://www.jpl.nasa.gov/news/jpls-snake-like-eels-slithers-into-new-robotics-terrain/",
    ],
    can_autonomous_phase_c=True,  # core robot task
)


INSPECT_DRONE = ActionDefinition(
    code="INSPECT_DRONE",
    category="inspection",
    name_zh="派无人机巡检",
    name_en="Dispatch drone (UAV) survey",
    description_zh=(
        "异常区 5-1000 hm²、风速 < 8 m/s、能见度 > 5km 时派无人机。"
        "多旋翼 < 50 hm²,固定翼 50-1000 hm²,飞行高度 100-300m。"
    ),
    description_en=(
        "Dispatch drone for 5-1000 hm² anomalies under wind <8 m/s and visibility "
        ">5km. Multi-rotor for <50 hm², fixed-wing for 50-1000 hm². Altitude "
        "100-300m for 1-3cm RGB resolution."
    ),
    trigger_conditions={
        "anomaly_area_hm2_min": 5,
        "anomaly_area_hm2_max": 1000,
        "forecast_wind_m_per_s_max": 8,
        "visibility_km_min": 5,
    },
    output_params_schema={
        "platform": "multi-rotor (<50 hm²) or fixed-wing (>50 hm²)",
        "altitude_m": [100, 300],
        "rgb_resolution_cm": [1, 3],
        "multispectral_recommended": True,
        "coverage_per_sortie_hm2_multirotor": 50,
        "coverage_per_sortie_hm2_fixedwing": 500,
        "endurance_min_multirotor": [30, 45],
        "endurance_hr_fixedwing": [2, 3],
    },
    confidence_baseline=0.90,  # mature tech in Chinese forestry
    cost_yuan_per_hm2=None,  # 1500-15000 per sortie depending on platform
    eta_months_min=0,
    eta_months_max=1,
    approval_level="local",
    data_requirements=["ndvi", "rainfall"],
    sources=[],
    can_autonomous_phase_c=True,
)


INSPECT_SCHEDULED = ActionDefinition(
    code="INSPECT_SCHEDULED",
    category="inspection",
    name_zh="推荐排期常规巡检",
    name_en="Schedule routine inspection",
    description_zh=(
        "距上次巡检超季节阈值(春 30 天 / 夏 14 天 / 秋 30 天 / 冬 60 天)"
        "或地块标记为重点监测区时,自动排期巡检。"
    ),
    description_en=(
        "Auto-schedule inspection when last visit exceeds seasonal threshold "
        "(spring 30d / summer 14d / fall 30d / winter 60d) or zone is flagged "
        "as priority monitoring area."
    ),
    trigger_conditions={
        "days_since_last_inspection_min": 30,  # default spring/fall
        "is_priority_zone": False,  # OR-logic in evaluator
    },
    output_params_schema={
        "spawn_sub_action": "INSPECT_HUMAN or INSPECT_DRONE based on area",
        "report_cadence": "monthly",
        "seasonal_thresholds_days": {"spring": 30, "summer": 14, "fall": 30, "winter": 60},
    },
    confidence_baseline=0.95,  # operational
    cost_yuan_per_hm2=None,
    eta_months_min=0,
    eta_months_max=1,
    approval_level="local",
    data_requirements=["ndvi"],
    sources=[],
    can_autonomous_phase_c=True,
)


# ─── 2.4 Risk Alerts (3) ──────────────────────────────────────────────────────

ALERT_DUST_STORM = ActionDefinition(
    code="ALERT_DUST_STORM",
    category="alert",
    name_zh="沙尘暴预警",
    name_en="Dust storm warning",
    description_zh=(
        "未来 24-72 小时风速 > 17 m/s + 能见度预测 < 1km 时触发。"
        "暂停机器人/无人机/滴灌,加固草方格,7 天内派人工评估幼苗损失。"
    ),
    description_en=(
        "Trigger when 24-72hr forecast shows wind >17 m/s AND visibility <1km. "
        "Pause robot/drone/drip ops, reinforce straw checkerboards, dispatch human "
        "crew within 7 days post-storm to assess seedling burial mortality."
    ),
    trigger_conditions={
        "forecast_wind_m_per_s_min": 17,
        "forecast_visibility_km_max": 1,
        "forecast_horizon_hours_max": 72,
        "season_in": ["mar", "apr", "may"],  # spring peak
        "young_seedlings_present": True,  # <1yr at risk
    },
    output_params_schema={
        "warning_levels": {"I": "severe", "II": "storm", "III": "blowing_sand"},
        "actions": [
            "pause_robot_drone_inspections_24_72h",
            "pause_drip_irrigation",
            "reinforce_straw_checkerboards",
            "post_storm_human_inspection_within_7d",
        ],
        "estimated_seedling_mortality_pct": [30, 60],
    },
    confidence_baseline=0.85,  # forecast reliable; mortality numbers have wide range
    cost_yuan_per_hm2=None,  # avoidance value $10K-100K per major storm
    eta_months_min=0,
    eta_months_max=1,
    approval_level="local",  # auto-trigger + sync notify project office
    data_requirements=["rainfall", "historical_planting"],
    sources=[
        "https://www.who.int/zh/news-room/fact-sheets/detail/sand-and-dust-storms",
        "https://www.geog.com.cn/EN/10.11821/xb200103008",
        "https://image.hanspub.org/Html/501.html",
    ],
    can_autonomous_phase_c=True,
)


ALERT_HEAT_WAVE = ActionDefinition(
    code="ALERT_HEAT_WAVE",
    category="alert",
    name_zh="热浪预警",
    name_en="Heat wave warning",
    description_zh=(
        "未来 7 天气温 > 40°C 持续 ≥ 3 天 + 区域有 < 2 年生幼苗时触发。"
        "增加滴灌频率到 7-14 天/次,11:00-17:00 暂停巡检。"
    ),
    description_en=(
        "Trigger when forecast >40°C for ≥3 days AND zone has <2yr seedlings AND "
        "soil moisture below critical. Increase drip frequency to 7-14d, pause "
        "inspections 11:00-17:00 (surface temp >60°C)."
    ),
    trigger_conditions={
        "forecast_temp_c_min": 40,
        "forecast_consecutive_days_min": 3,
        "young_seedlings_present": True,  # <2yr
        "soil_moisture_below_critical": True,
    },
    output_params_schema={
        "warning_levels": {"yellow": [40, 43], "orange": [43, 45], "red": 45},
        "actions": [
            "increase_drip_frequency_to_7_14_days",
            "pause_inspections_11_17_local_time",
        ],
        "expected_mortality_threshold_c": 45,
        "critical_factor": "soil moisture (high temp survivable if moist)",
    },
    confidence_baseline=0.65,  # 40C threshold supported, but Taklimakan-specific lethal curves missing
    cost_yuan_per_hm2=2000.0,  # 100-300 yuan/mu emergency irrigation × 10
    eta_months_min=0,
    eta_months_max=1,
    approval_level="project_office",
    data_requirements=["soil_moisture", "rainfall", "historical_planting"],
    sources=[
        "https://www.frontiersin.org/journals/forests-and-global-change/articles/10.3389/ffgc.2021.731267/full",
        "https://www.mdpi.com/1422-0067/26/21/10426",
    ],
    can_autonomous_phase_c=True,
)


ALERT_NDVI_DEGRADATION = ActionDefinition(
    code="ALERT_NDVI_DEGRADATION",
    category="alert",
    name_zh="NDVI 异常退化预警",
    name_en="NDVI anomaly degradation alert",
    description_zh=(
        "区域 NDVI 同比下降 > 0.05(季节匹配)或绝对值 < 0.15 持续 > 6 个月时触发。"
        "三级响应:关注/警告/应急,分别派 INSPECT_DRONE / INSPECT_HUMAN / 启动应急灌溉。"
    ),
    description_en=(
        "Trigger when zone NDVI drops >0.05 yr-over-yr (season-matched) OR "
        "absolute <0.15 for >6 months. Three response levels: watch / warning / "
        "emergency → drone inspection / human + snake robot / emergency irrigation."
    ),
    trigger_conditions={
        "ndvi_drop_consecutive_periods": 3,
        "ndvi_drop_min": 0.10,
        # ALSO triggers on absolute threshold:
        "ndvi_absolute_threshold": 0.15,
        "ndvi_absolute_persistent_months": 6,
    },
    output_params_schema={
        "levels": {
            "watch": {"drop_range": [0.03, 0.05], "action": "schedule INSPECT_DRONE or INSPECT_HUMAN"},
            "warning": {"drop_range": [0.05, 0.10], "action": "INSPECT_HUMAN within 7d + INSPECT_SNAKE_ROBOT spot check"},
            "emergency": {"drop_min": 0.10, "action": "trigger IRRIGATION_FLOOD (riparian) or IRRIGATION_DRIP_PULSE"},
        },
        "baseline_method": "5-year average per Sentinel Hub Anomaly Detection",
    },
    confidence_baseline=0.85,  # detection high; attribution medium
    cost_yuan_per_hm2=None,  # automated detection — cost depends on response action
    eta_months_min=0,
    eta_months_max=1,
    approval_level="local",  # watch=local, warning=project_office, emergency=prefecture
    data_requirements=["ndvi", "soil_moisture", "rainfall", "historical_planting"],
    sources=[
        "https://custom-scripts.sentinel-hub.com/custom-scripts/sentinel-2/ndvi_anomaly_detection/",
        "https://pmc.ncbi.nlm.nih.gov/articles/PMC11271892/",
        "https://www.mdpi.com/2072-4292/12/12/1914",
    ],
    can_autonomous_phase_c=True,
)


# ─── Master registry ──────────────────────────────────────────────────────────

ACTIONS: dict[str, ActionDefinition] = {
    a.code: a
    for a in [
        # planting (6)
        PLANT_HALOXYLON,
        PLANT_TAMARIX,
        PLANT_CALLIGONUM,
        PLANT_POPULUS,
        PLANT_HEDYSARUM,
        PLANT_MIXED,
        # irrigation (4)
        IRRIGATION_DRIP_PULSE,
        IRRIGATION_FLOOD_ECOLOGICAL,
        GROUNDWATER_CAUTION,
        IRRIGATION_SKIP,
        # inspection (4)
        INSPECT_HUMAN,
        INSPECT_SNAKE_ROBOT,
        INSPECT_DRONE,
        INSPECT_SCHEDULED,
        # alert (3)
        ALERT_DUST_STORM,
        ALERT_HEAT_WAVE,
        ALERT_NDVI_DEGRADATION,
    ]
}

# Sanity check at import time — fail fast if vocabulary drifts from doc spec.
assert len(ACTIONS) == 17, f"Expected 17 actions, got {len(ACTIONS)}"
_CATEGORY_COUNTS = {
    "planting": 6,
    "irrigation": 4,
    "inspection": 4,
    "alert": 3,
}
for cat, expected in _CATEGORY_COUNTS.items():
    actual = sum(1 for a in ACTIONS.values() if a.category == cat)
    assert actual == expected, f"Category {cat}: expected {expected}, got {actual}"


# Per docs/L3-action-vocabulary.md §3, with NDVI-only L1 data, only these 4
# actions are fully actionable. The other 13 will return pending status with
# note "awaiting L1 expansion".
NDVI_ONLY_ACTIONABLE: set[str] = {
    "INSPECT_SCHEDULED",      # only requires NDVI + last-inspection date
    "ALERT_NDVI_DEGRADATION", # NDVI-driven by definition
    "INSPECT_HUMAN",          # NDVI anomaly area is enough trigger
    "INSPECT_DRONE",          # NDVI anomaly area is enough trigger
}


def get_action(code: str) -> ActionDefinition | None:
    """Lookup helper — returns None if code unknown."""
    return ACTIONS.get(code)


def list_actions(category: str | None = None) -> list[ActionDefinition]:
    """List all actions, optionally filtered by category."""
    if category:
        return [a for a in ACTIONS.values() if a.category == category]
    return list(ACTIONS.values())
