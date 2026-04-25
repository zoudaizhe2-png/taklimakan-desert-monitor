# L1 Sense 层 — 数据源集成路线图

> **项目**: Taklimakan Desert Vegetation Tracker
> **范围**: 73-92°E, 34-45°N(塔克拉玛干沙漠及其周边)
> **作者**: 研究员(Claude / Tangerine Intelligence)
> **日期**: 2026-04-25
> **状态**: 调研 + 规划阶段(尚未开始 implementation)

---

## 1. 现状

L1 Sense 层目前只接入了一个数据源:**Sentinel-2 Surface Reflectance 影像**(`COPERNICUS/S2_SR_HARMONIZED`),通过 Google Earth Engine 计算 NDVI。代码位于 `backend/services/gee_service.py`,认证模式支持服务账户密钥文件、内联 JSON 字符串或 ADC 三种方式。当前能力包含 NDVI 时间序列、年际变化、网格采样、tile URL 渲染四类核心函数,空间分辨率 10m,生长季 4–10 月,云遮挡 <20% 过滤,SCL band 做云掩膜。L3 Desert Intelligence 决策引擎需要的"水/温/风/历史治沙工程上下文/物种适宜性"等关键输入完全缺失,本文档目标为将 L1 从"单一植被指数"扩展为"多源时空生态—水文—工程基线"。

---

## 2. 6 个新数据源详细评估

### 2.1 SMAP — 土壤湿度

| 字段 | 取值 |
|---|---|
| **数据集名** | SMAP L3 Enhanced Daily 9km(`NASA/SMAP/SPL3SMP_E/006`)+ SMAP L4 Global 3-hourly 9km(`NASA/SMAP/SPL4SMGP/008`) |
| **官方 access** | **GEE 资产,直接调用**(首选);备用为 NASA Earthdata `earthaccess` Python 库(直接从 NSIDC DAAC 拉 HDF5/NetCDF) |
| **认证** | GEE → 现有 service account,无需额外申请;Earthaccess → NASA Earthdata Login(免费,网页注册 5 分钟,需 EULA 同意) |
| **是否免费 / quota** | 完全免费;GEE 受现有项目 quota 限制(每分钟 25K compute units),Earthaccess 无硬性 quota 但建议 ≤20 并发 |
| **数据格式** | GEE 中已转为 ee.Image;原生 HDF5 / NetCDF4 |
| **空间分辨率** | 9 km(L3 Enhanced 和 L4 都是 9 km EASE-Grid 2.0) |
| **时间分辨率** | L3:每天(降轨 6am + 升轨 6pm 合成);L4:每 3 小时 |
| **时间覆盖** | L3 Enhanced V006:2023-12-04 至今;V005 覆盖 2015-04-01 → 2023-12-03(两版需拼接得 10+ 年时序);L4:2015-03 至今 |
| **更新延迟** | L3 约 50 小时;L4 约 7 天 |
| **Taklimakan 可用性** | 完全覆盖;但 L-band 在沙漠极干区会有 retrieval 失败(soil moisture 接近 0.02 m³/m³ 时反演不可靠),需检查 retrieval_qual_flag |
| **接入难度(1-5)** | **1**(GEE 路径);3(Earthaccess 路径) |
| **推荐库** | `earthengine-api` + `geemap`(GEE 路径);`earthaccess` + `xarray` + `h5netcdf` + `rioxarray`(Earthaccess 路径) |
| **推荐集成路径** | **加进 `backend/services/gee_service.py` 同一 pipeline**:复用现有 service account,新增 `get_smap_soil_moisture(region, date)` / `get_smap_anomaly(region, year)` 等函数。L3 surface SM + L4 root-zone SM 都暴露,沙漠监测推荐用 L4 root-zone(0–100cm)作为植被生长水分基线 |
| **第一次集成预估工时** | **6 小时**(2h 阅读 SPL3SMP_E.006 文档 + 2h 写函数 + 1h QC mask + 1h 测试) |
| **已知坑** | (a) SPL3SMP_E V005 → V006 在 2023-12 切版,做长时序需双版本拼接;(b) 极干沙漠中心 retrieval 缺失率高,需 fallback 到 L4 模型同化版本;(c) GEE 中 `soil_moisture_am` / `soil_moisture_pm` 是两个独立 band,统计时要分别处理避免双计 |

---

### 2.2 ERA5 — 降雨/气象再分析

| 字段 | 取值 |
|---|---|
| **数据集名** | **首选** ERA5-Land Hourly(`ECMWF/ERA5_LAND/HOURLY`)+ ERA5-Land Daily Aggregated(`ECMWF/ERA5_LAND/DAILY_AGGR`,GEE 已聚合好);**备选** Copernicus CDS 原生 `reanalysis-era5-land` |
| **官方 access** | **GEE 资产**(强烈推荐,免去 CDS 队列);CDS API via `cdsapi` Python 库(用于 GEE 没有的变量/级别) |
| **认证** | GEE → 现有 service account;CDS → 注册 ECMWF 账号(免费),从 profile 拷 Personal Access Token 到 `~/.cdsapirc`,每个数据集首次下载前需在网页上手动 Accept Terms |
| **是否免费 / quota** | 完全免费;CDS 队列长度有时数小时(尤其月末/早上),GEE 无队列等待 |
| **数据格式** | GEE 中 ee.Image;CDS 原生 NetCDF 或 GRIB |
| **空间分辨率** | 0.1° ≈ 11 km(ERA5-Land);0.25° ≈ 28 km(ERA5 single-levels) |
| **时间分辨率** | 1 小时 |
| **时间覆盖** | ERA5-Land:1950-01-01 至今(滞后约 5 天);ERA5:1940-01-01 至今(滞后约 5 天) |
| **更新延迟** | 5 天(near-real-time stream 早一点) |
| **Taklimakan 可用性** | 完全覆盖,但 ERA5-Land 在沙漠区降水量普遍偏小(<50mm/年),GEE 中 `total_precipitation_sum` 单位是 m,要乘 1000 转 mm |
| **接入难度(1-5)** | **1**(GEE 路径);3(CDS 路径,需排队 + 首次 Terms 接受) |
| **推荐库** | GEE 路径:`earthengine-api`;CDS 路径:`cdsapi` + `xarray` + `cfgrib` + `rioxarray` |
| **推荐集成路径** | **加进 `backend/services/gee_service.py`**;新建 `get_era5_precip_annual(region, year)`、`get_era5_temp_extremes(region, year)`、`get_era5_wind_speed(region, year)`,推荐输出至少 4 个变量:total_precipitation、temperature_2m_min/max、u/v_component_of_wind_10m(用于风沙量化) |
| **第一次集成预估工时** | **5 小时**(GEE 路径;若走 CDS API 需额外 +6 小时做下载缓存层) |
| **已知坑** | (a) `total_precipitation` 是累积值,做日总要差分;(b) 单位转换易错(K→°C、m→mm、J/m²→W/m²);(c) ERA5-Land 在沙漠区无法捕捉局地短时强降水(分辨率 11km);(d) CDS 有时段维护(每月 Tuesday 下午 ECMWF 时间) |

---

### 2.3 GRACE / GRACE-FO — 地下水位变化

| 字段 | 取值 |
|---|---|
| **数据集名** | **JPL Mascon RL06.3 v04** Global Mascons(`NASA/GRACE/MASS_GRIDS_V04/MASCON`)+ Land 版本(`NASA/GRACE/MASS_GRIDS_V04/LAND`)+ CRI Filtered(`NASA/GRACE/MASS_GRIDS_V04/MASCON_CRI`) |
| **官方 access** | **GEE 资产**(首选);备用为 PO.DAAC `https://podaac.jpl.nasa.gov/dataset/TELLUS_GRAC-GRFO_MASCON_CRI_GRID_RL06.3_V4`(NetCDF 直接下载) |
| **认证** | GEE → 现有 service account;PO.DAAC → NASA Earthdata Login(同 SMAP) |
| **是否免费 / quota** | 完全免费 |
| **数据格式** | GEE ee.Image;原生 NetCDF |
| **空间分辨率** | 0.5°(原始 mascon 是 3° spherical cap,grid 输出是 0.5°);**实际等效分辨率约 300-400 km**(物理限制,不可下采样使用) |
| **时间分辨率** | 月度(月平均) |
| **时间覆盖** | GRACE:2002-04 → 2017-06;GRACE-FO:2018-06 至今;**中间 2017-07 → 2018-05 有 11 个月空窗** |
| **更新延迟** | 约 2-3 个月 |
| **Taklimakan 可用性** | 覆盖,但要注意:塔里木盆地面积约 53 万 km²,只能解出 1-3 个 mascon 信号,无法做盆内空间细分;适合"整个塔里木盆地"或"塔克拉玛干沙漠+周边"作为单一时序 |
| **接入难度(1-5)** | **2**(GEE 路径,但 GRACE/GRACE-FO 时序拼接 + 中间空窗 + GLDAS 解耦地下水都需领域知识) |
| **推荐库** | `earthengine-api`;若做 ground water 解耦需结合 `pyGRACE`、CSR mascon 或 GLDAS-NOAH(`NASA/GLDAS/V021/NOAH/G025/T3H`) |
| **推荐集成路径** | **加进 `backend/services/gee_service.py`**;新建函数 `get_tws_anomaly(region, start_year, end_year)`(返回 cm 等效水柱)和 `get_groundwater_anomaly(region, start_year, end_year)`(用 GLDAS 减去 SM+SWE 后估算 GWS,Tarim 流域已有 2024 paper 验证可行) |
| **第一次集成预估工时** | **8 小时**(2h 文档 + 3h GLDAS 耦合解耦 + 1h 拼接 GRACE/GRACE-FO + 2h 测试) |
| **已知坑** | (a) GRACE / GRACE-FO 中间 11 月空窗,建议线性插值或显式标 NaN;(b) 实际分辨率约 300km,绝不能 over-claim 像素级精度;(c) 单位是 cm equivalent water thickness,需明确告知下游;(d) Tarim 已发表趋势 −1.4 mm/yr(可作 sanity check) |

---

### 2.4 SRTM — DEM 高程/坡度/坡向

| 字段 | 取值 |
|---|---|
| **数据集名** | **SRTM Global 1 arc-second**(`USGS/SRTMGL1_003`,30m,全球 60°N–56°S);备选 NASADEM(`NASA/NASADEM_HGT/001`,30m,2020 reprocessed),Copernicus DEM 30m(`COPERNICUS/DEM/GLO30`,2019 现代版) |
| **官方 access** | **GEE 资产**;备选 USGS EarthExplorer(直接 download GeoTIFF) |
| **认证** | GEE → 现有 service account;EarthExplorer → USGS 账号(免费) |
| **是否免费 / quota** | 完全免费 |
| **数据格式** | GEE ee.Image;GeoTIFF |
| **空间分辨率** | **30m**(1 arc-second) |
| **时间分辨率** | 静态(2000-02-11 → 2000-02-22 单次任务采集) |
| **时间覆盖** | 2000(单一时间点,基本不更新;Copernicus DEM 用更新航天数据,2010-2015) |
| **更新延迟** | N/A(静态数据) |
| **Taklimakan 可用性** | 完全覆盖,塔克拉玛干主体海拔 800-1500m,周边昆仑山/天山陡升至 7000+m,DEM 质量良好(沙漠区 SRTM 反射较弱,可能有 data void,V003 已用 ASTER GDEM2 / GMTED2010 / NED 填补) |
| **接入难度(1-5)** | **1**(GEE 内置 `ee.Terrain.slope` / `aspect` / `hillshade`,几乎无门槛) |
| **推荐库** | `earthengine-api`(完全够用);本地处理用 `rioxarray` + `richdem`(可计算 TPI、TRI、curvature 等高级地形指数) |
| **推荐集成路径** | **加进 `backend/services/gee_service.py`**;新建 `get_terrain_layers(region)` 返回 dict {elevation, slope, aspect, hillshade, tpi},用于 L3 决策引擎做"哪些坡向适合什么物种"判断(例如梭梭偏好缓坡 < 5°、海拔 < 1500m) |
| **第一次集成预估工时** | **3 小时**(1h 写函数 + 1h 派生指数 + 1h 测试和缓存) |
| **已知坑** | (a) SRTM 是 25 年前数据,沙丘地貌已有变化但中山以上稳定;(b) 沙漠区有少量 data void 已填补但精度下降;(c) `ee.Terrain.slope` 默认输出度,与 percent slope 易混淆;(d) 大区域 hillshade 渲染会很重,需金字塔/tile cache |

---

### 2.5 三北防护林 / 国家林草局公开数据

| 字段 | 取值 |
|---|---|
| **数据集名(已找到)** | (1) **三北防护林体系建设全国一级区划空间分布**(forestdata.cn,矢量,covers 13 省 551 县);(2) **三北防护林体系建设总体规划三期/四期工程新增建设县**(forestdata.cn,矢量,带行政区划代码 + 类型属性);(3) **中国林业工程空间分布**(resdc.cn DATAID=138,矢量) |
| **数据集名(部分找到,需注册才能确认)** | 国家林业和草原科学数据共享服务平台 forestdata.cn 上 search "三北" 出多条,但 metadata 页面在未登录时返回空白(WebFetch 验证),**必须注册账号(机构邮箱推荐)才能看 detail + download** |
| **官方 access** | (1)(2) → forestdata.cn(`https://www.forestdata.cn/threenorth/`)注册下载;(3) → resdc.cn(中国科学院资源环境科学数据中心)注册下载;**没有 REST API**,纯网页 download |
| **认证** | forestdata.cn:**注册 + 实名(身份证 / 单位证明 / 用途说明)**,审核 1-3 工作日;resdc.cn:类似流程,部分数据需"申请说明" |
| **是否免费 / quota** | 注册后免费,但**有数据量限制**(部分数据集要求"科研用途说明" + 不得商用);商业用途需另行授权 |
| **数据格式** | Shapefile / GeoJSON / 部分 GeoTIFF;附 metadata XLSX |
| **空间分辨率** | 县级精度(矢量边界,无米级精度);时间属性=工程批次(一期 1978–2000、二期 2001–2010、三期 2011–2020、四期 2021–2030 规划) |
| **时间覆盖** | 1978 至今(规划时间线);**没有"治沙成败"的实际验证字段**——这是最大缺口 |
| **更新延迟** | 不定期(规划修订时更新) |
| **Taklimakan 可用性** | 部分覆盖:塔里木盆地周缘绿洲带(和田、喀什、阿克苏、库尔勒)在三北范围内,但**沙漠主体不在三北直接造林范围**(三北以风沙过渡带和沙漠边缘为主) |
| **接入难度(1-5)** | **4**(注册门槛 + 无 API + 数据可能不完整 + 中文 metadata + 需手工 ETL 进 PostGIS) |
| **推荐库** | `geopandas` + `fiona` + `pyproj`(读 SHP);本地一次性 ETL 后存入数据库(PostGIS / SQLite-Spatial)作为 static layer |
| **推荐集成路径** | **新建独立 service file `backend/services/shelterbelt_service.py`**:加载本地预处理过的矢量数据,提供 `get_shelterbelt_zones(region)` 返回与查询区域相交的县和工程批次。**不放进 GEE pipeline**(数据不在 GEE,且更新频率低,本地缓存最经济) |
| **第一次集成预估工时** | **12 小时**(3h 注册 + 申请 + 等待审核 + 4h 数据下载和清洗 + 3h 写 service + 2h 入库和测试)。**审核时间不在 12h 内,需 +1-3 工作日 lead time** |
| **已知坑** | (a) **审核流程需要 CEO 帮忙**(实名 + 单位证明 + 用途说明);(b) 没有"成败评估"字段,L3 引擎无法直接学"哪些工程效果好",只能交叉 NDVI 时序自己算;(c) 部分数据集只到县级,不到具体造林斑块;(d) 商业使用许可需另议;(e) **国家林草局官网本身没有结构化下载,数据集都在 forestdata.cn 这个共享平台** |

---

### 2.6 中国治沙物种适宜性 map

| 字段 | 取值 |
|---|---|
| **数据集名(部分找到)** | (1) **塔里木-准噶尔盆地荒漠植物群落生境调查照片(2017-2021)**(国家青藏高原科学数据中心 TPDC,942 个调查点,覆盖塔里木盆地、准噶尔盆地及周边)——是**点位调查数据**而非**适宜性栅格**;(2) 中科院新疆生地所多篇论文的梭梭分布点(`Haloxylon ammodendron`):中国境内 77.3°E–107.6°E,36.1°N–47.4°N,海拔 87–3174m——**论文附录数据可作为适宜性建模输入,但本身不是 ready-to-use map** |
| **数据集名(没找到 ready-to-use 的)** | "中国治沙物种适宜性 map"作为单一官方权威数据集**目前没有现成发布**。最接近的替代方案: <br>(a) **基于 MaxEnt / Random Forest 自己跑物种分布模型(SDM)**——输入梭梭/红柳/胡杨/沙拐枣/芦苇 5 个塔里木优势物种的占据点(论文附录 + GBIF),用 SMAP+ERA5+SRTM+地下水深做协变量;<br>(b) 国家青藏高原科学数据中心还有 "西北干旱区荒漠植被分类"、"中国植被功能型图(1km)" 等基础植被图,但都是当前分布,不是 suitability;<br>(c) 资源环境科学数据中心(resdc.cn)有"中国植被类型 1:100 万"矢量;<br>(d) 全国第二次荒漠化沙化普查成果数据(国家林草局)未公开 |
| **官方 access** | TPDC: `https://data.tpdc.ac.cn/`(注册免费);resdc.cn 同 §2.5;GBIF: `https://www.gbif.org/`(无需注册即可 download occurrence) |
| **认证** | TPDC:邮箱注册 + DOI 引用承诺,免费;GBIF:无;论文附录:直接下载 |
| **是否免费 / quota** | 全部免费,但**学术引用义务**(用了 TPDC 数据,论文必须引 DOI + 注明来源) |
| **数据格式** | TPDC:NetCDF / GeoTIFF / Shapefile / Excel(混杂);论文附录:Excel / CSV;GBIF:CSV / Darwin Core Archive |
| **空间分辨率** | 调查点位(矢量);若自己建 SDM 输出可任意分辨率(推荐 1km 与协变量对齐) |
| **时间分辨率** | 多为 snapshot(无时间维度) |
| **时间覆盖** | 2017-2021(TPDC 调查照片)/各论文采样期(2000s-2020s) |
| **更新延迟** | N/A(snapshot) |
| **Taklimakan 可用性** | TPDC 942 点中有可观比例落在塔里木盆地;论文采样点直接覆盖;GBIF 中国西北部覆盖较稀疏 |
| **接入难度(1-5)** | **5**(没有 ready-to-use 数据,需自建 SDM;需协调多源 + 跑模型 + 验证) |
| **推荐库** | `geopandas`(占据点);`elapid` 或 `pyimpute` + `scikit-learn`(MaxEnt / RF);`xarray` + `rioxarray`(协变量栈) |
| **推荐集成路径** | **新建独立 service file `backend/services/species_suitability_service.py`**:Phase 1 只暴露"已发布的塔里木 5 优势物种点位 + 论文/教科书阈值"作为查表(elevation < 1500m + slope < 5° + GW < 5m → 梭梭 high suitability,等等);Phase 2 再考虑跑 SDM。**不放进 GEE**(模型权重和占据点本地存) |
| **第一次集成预估工时** | **Phase 1 查表版:10 小时**(3h 整理论文阈值规则 + 3h ETL 占据点 + 2h 写 service + 2h 测试);**Phase 2 SDM 版:额外 +30 小时**(收集 occurrence + 训练 + 验证 + 跨折评估) |
| **已知坑** | (a) **没有官方 "治沙物种适宜性图" 这个 dataset 名,需明确告知用户**;(b) 论文阈值规则有学术争议,L3 决策需备注 confidence level;(c) GBIF 中国数据稀疏,真实占据被低估;(d) Phase 2 SDM 需 ground-truth,可能需 CEO 联系新疆生地所要 943 点位的物种 ID(目前 TPDC 公开的可能只有照片不是物种标签) |

---

## 3. 集成优先级排序

| # | 数据源 | L3 价值(1-5) | 难度(1-5) | 工时 | ROI(价值/难度) | 推荐顺序 |
|---|---|:---:|:---:|:---:|:---:|:---:|
| 1 | **SRTM(DEM/坡度/坡向)** | 4 | 1 | 3h | **4.0** | **Phase 1 第 1** |
| 2 | **ERA5(降雨/气象)** | 5 | 1 | 5h | **5.0** | **Phase 1 第 2** |
| 3 | **SMAP(土壤湿度)** | 5 | 1 | 6h | **5.0** | **Phase 1 第 3** |
| 4 | **GRACE(地下水)** | 4 | 2 | 8h | 2.0 | Phase 2 第 1 |
| 5 | **物种适宜性(查表 Phase 1)** | 5 | 5 | 10h | 1.0 | Phase 2 第 2 |
| 6 | **三北防护林矢量** | 3 | 4 | 12h | 0.75 | Phase 3(可选) |

**评分依据**:
- L3 价值:对决策引擎"该不该种 / 种什么 / 在哪种"判断的直接贡献度
- 难度:接入 + 认证 + 预处理 + 文档/坑的总和复杂度
- ROI = 价值 / 难度,排序的主要依据

---

## 4. 推荐 Phase 1 集成的 3 个

### 选定:**SRTM + ERA5 + SMAP**

**总工时预估**:**14 小时**(3 + 5 + 6,可单人 2 天完成)

**为什么是这 3 个**:
1. **全部走 GEE,认证零增量**——复用现有 `gee_service.py` 的 service account,不需要任何新账号申请,不需要等审核,代码模式可直接复制 Sentinel-2 那套(`region` + `start_date` + `end_date` 三参数模板)
2. **全部 Python 零外部依赖增量**——只需要 `earthengine-api`(已有),不引入 cdsapi、earthaccess、geopandas 等新包
3. **覆盖 L3 决策最核心三个维度**——地形(SRTM 决定能不能种)、气候(ERA5 决定有没有水)、墒情(SMAP 决定现在缺不缺水);这三个齐了 L3 引擎可以做出第一版可用的"种植窗口"判断
4. **数据延迟可接受**——SRTM 静态、ERA5 滞后 5 天、SMAP 滞后 50 小时,对治沙决策(月度~季度尺度)完全够用
5. **风险最低**——三个都是 NASA/ECMWF 一线发布,长期维护承诺明确;不依赖中国官方机构审核

**推荐 implementation 顺序**:
1. **先 SRTM(3h)**——最简单,作为热身和模板,产出 `get_terrain_layers()` 函数,顺带建立 GEE 多变量返回的代码风格
2. **再 ERA5(5h)**——参照 SRTM 模板,建 `get_era5_*` 系列(precip / temp / wind);ERA5 数据量大 reduce 时要注意 `maxPixels` 和 `scale`
3. **最后 SMAP(6h)**——最有 domain 复杂度(QC mask + L3/L4 选择 + V005/V006 拼接),放最后让前两个的代码复用模式先稳住

---

## 5. 架构建议

### 5.1 是否重构 `services/gee_service.py`?

**结论**:**不需要大重构,但需要轻度重组**。

**当前问题**:`gee_service.py` 已经把 Sentinel-2 / NDVI 函数耦合在一个文件里(248 行)。再加 SRTM + ERA5 + SMAP 后会膨胀到 700+ 行,可读性会差。

**推荐做法**:
- 把 `gee_service.py` 拆为一个 package:
  ```
  backend/services/gee/
    __init__.py            # 导出 initialize(), is_available(), get_init_error()
    _client.py             # initialize / auth / 全局 ee 实例(从现有文件迁过来)
    sentinel2.py           # 现有 Sentinel-2 / NDVI 函数迁过来
    srtm.py                # 新增
    era5.py                # 新增
    smap.py                # 新增(Phase 1)
    grace.py               # 新增(Phase 2)
  ```
- `__init__.py` re-export 所有公共函数,**保持 import 路径向后兼容**(`from backend.services.gee_service import initialize` 改成 `from backend.services.gee import initialize`,只动 import 一处)
- 每个 module 文件 < 200 行,单一数据源职责清晰

### 5.2 独立 service vs 统一 abstraction

| 数据源 | 独立 service file? | 理由 |
|---|---|---|
| SMAP / ERA5 / GRACE / SRTM | **不**,放进 `backend/services/gee/` | 全部 GEE,复用 auth 和 ee 客户端 |
| 三北防护林 | **是**,`shelterbelt_service.py` | 静态本地矢量,无 GEE 镜像 |
| 物种适宜性 | **是**,`species_suitability_service.py` | 查表 + 未来 SDM,无 GEE 镜像 |

**不要**为了所谓"统一抽象"硬塞一个 `BaseDataSource` 抽象基类——GEE 数据源和本地矢量/查表数据源的接口完全不同(前者 region+date,后者纯 region),硬合并会增加 indirection 但减少 zero clarity。

### 5.3 Cache 策略

**新增**:在 `backend/cache/` 下建文件级缓存,使用 `joblib.Memory` 或简单的 `functools.lru_cache` + 磁盘 pickle:

| 数据 | Cache TTL | 理由 |
|---|---|---|
| SRTM 派生(slope/aspect/hillshade) | 永久 | 静态数据 |
| ERA5 / SMAP 历史聚合(去年的年值) | 永久 | 不会再变 |
| ERA5 / SMAP 当前年(滚动) | 24 小时 | 防止重复算同一天 |
| GRACE 月度时序 | 7 天 | 月度更新,1 周一刷够 |
| 三北防护林矢量 | 永久 | 几乎不变 |

GEE getInfo() 调用本身就慢(单次 1-5 秒),cache 收益巨大。**强烈建议 Phase 1 同步落地 cache 层**,不要等到性能问题再补。

### 5.4 Pydantic 模型变化

新增 `backend/models/sense_layer.py`,统一时空查询响应:

```python
class GridPoint(BaseModel):
    lat: float
    lng: float
    value: float | None
    qc_flag: str | None = None  # SMAP retrieval quality, ERA5 N/A

class TimeSeries(BaseModel):
    variable: str            # "ndvi" | "soil_moisture" | "precip" | ...
    unit: str                # "ratio" | "m³/m³" | "mm" | ...
    source: str              # "sentinel2" | "smap_l4" | "era5_land" | ...
    timestamps: list[str]    # ISO 8601
    values: list[float | None]
    region_geojson: dict
    metadata: dict           # data version, retrieval date, qc summary
```

每个新 service 函数返回 `TimeSeries` 或 `list[GridPoint]`,L3 引擎只面向这两个 schema 写。

### 5.5 数据库 schema 变化

如果当前 backend 没有 PostGIS / 持久层,**Phase 1 不需要建库**——GEE 是 on-demand 计算,加缓存就够。

如果以后要存历史 query 结果或三北防护林矢量,推荐:
- **PostgreSQL + PostGIS**(治沙工程矢量、占据点、SDM 输出)
- **Parquet / Zarr 文件层**(SMAP/ERA5 长时序聚合,适合 xarray 直接 lazy load)
- 表 schema 例:
  - `shelterbelt_zones(id, county_code, county_name, phase, geom)` 
  - `species_occurrences(id, species, lat, lng, year, source, geom)`
  - `data_query_cache(query_hash, region_geom, variable, start_date, end_date, payload_json, created_at, ttl)`

---

## 6. 风险与缓解

| # | 风险 | 影响 | 缓解 |
|---|---|---|---|
| R1 | GEE compute quota 耗尽(免费 tier 25K cu/min) | Phase 1 后用户多了会触发 429 | 升级到 GEE Commercial Cloud Project(需公司开 GCP billing,$0.40/1000 cu);加客户端 throttling |
| R2 | ERA5-Land 在沙漠区降水偏小,L3 决策可能被低估 | 降水驱动的物种适宜性会偏向"过干"判断 | 文档明确告知 ERA5 在干区精度限制;有条件时引入 IMERG GPM 卫星雨量做交叉验证 |
| R3 | SMAP 在极干沙漠中心 retrieval 失败 | 沙漠核心区数据点稀疏 | 用 L4 同化版本 fallback;在前端用不同色块标 "no_retrieval" 区分 |
| R4 | GRACE 物理分辨率仅 ~300km,塔克拉玛干只能解出 1-3 个信号 | 无法做盆内空间细分 | 明确文档:GRACE 只做"整盆地"时序,不做"绿洲对比";前端禁用 GRACE 在小区域的查询 |
| R5 | 三北防护林数据需中国官方机构审核(forestdata.cn 注册) | Phase 3 启动会被审核 lead time 阻塞 | **CEO 协助:用 Tangerine Intelligence 名义注册 forestdata.cn 账号,提交"沙漠监测科研用途"申请。提前 1-2 周启动审核** |
| R6 | "中国治沙物种适宜性 map" 作为单一官方权威 dataset 不存在 | Phase 2 物种推荐功能需自建 | 显式接受 limitation:Phase 1 用论文阈值查表(梭梭 elevation<1500m, slope<5°, GW<5m 等),Phase 2 再做 MaxEnt SDM。**不假装有现成 dataset** |
| R7 | TPDC 数据集需 DOI 引用,商用授权未明 | 商业 SaaS 部署可能违反 CC-BY-NC | 上线前法务审 license;UI 加 attribution footer;商用前直接联系 TPDC 询问 |
| R8 | CDS API 队列长(高峰数小时) | 若必须用 CDS 而非 GEE 的 ERA5,会卡住实时查询 | 完全走 GEE 路径;只在 GEE 没有的变量(如 ozone、aerosol)才回落 CDS,且做 background batch download |
| R9 | NASA Earthdata Login 在中国大陆访问偶有不稳定 | 备用路径(earthaccess)在国内 deploy 时可能失败 | Phase 1 全部走 GEE 不依赖 Earthdata;若以后必须用,部署在 HK/海外 |
| R10 | SRTM data void 在沙丘区 | 局部坡度计算不准 | 切换 NASADEM 或 Copernicus DEM 30m 做对比验证;文档标注 SRTM 在动态沙丘上的局限 |

### 需 CEO 协助清单

1. **forestdata.cn 注册 + 审核申请**(三北防护林矢量,§2.5)——预计需 1-3 工作日
2. **resdc.cn 注册 + 申请**(中国林业工程空间分布,§2.5)——预计需 1-3 工作日
3. **TPDC 注册**(`data.tpdc.ac.cn`,§2.6)——邮箱即可,但商用许可需法务跟进
4. **(可选)联系新疆生地所**——如要 942 调查点的物种标签数据(超出公开发布范围),需建立学术合作

### 已确认无法找到合适公开 dataset 的缺口

1. **"中国治沙物种适宜性 map" 作为单一官方权威 raster**——**不存在**,需自建 SDM 或采用论文阈值规则
2. **三北防护林具体造林斑块(plot-level)的成败评估字段**——公开数据只有规划层面(县/工程批次),无地块级实际成果
3. **国家林草局第二次荒漠化沙化普查成果数据**——内部数据,未公开

---

## 7. 引用

### Dataset URL

- SMAP L3 Enhanced(GEE):https://developers.google.com/earth-engine/datasets/catalog/NASA_SMAP_SPL3SMP_E_006
- SMAP L4 Global 3-hourly(GEE):https://developers.google.com/earth-engine/datasets/catalog/NASA_SMAP_SPL4SMGP_008
- SMAP L4 NSIDC 原始:https://nsidc.org/data/spl4smgp/versions/8
- ERA5-Land Hourly(GEE):https://developers.google.com/earth-engine/datasets/catalog/ECMWF_ERA5_LAND_HOURLY
- ERA5-Land Daily Aggregated(GEE):https://developers.google.com/earth-engine/datasets/catalog/ECMWF_ERA5_LAND_DAILY_AGGR
- ERA5-Land 原始 CDS:https://cds.climate.copernicus.eu/datasets/reanalysis-era5-land
- GRACE Mascon CRI(GEE):https://developers.google.com/earth-engine/datasets/catalog/NASA_GRACE_MASS_GRIDS_V04_MASCON_CRI
- GRACE Land(GEE):https://developers.google.com/earth-engine/datasets/catalog/NASA_GRACE_MASS_GRIDS_V04_LAND
- GRACE JPL 原始:https://grace.jpl.nasa.gov/data/get-data/jpl_global_mascons/
- SRTM 30m(GEE):https://developers.google.com/earth-engine/datasets/catalog/USGS_SRTMGL1_003
- SRTM NASA Earthdata 原始:https://www.earthdata.nasa.gov/data/catalog/lpcloud-srtmgl1-003
- 国家林草科学数据共享服务平台:https://www.forestdata.cn/threenorth/
- forestdata.cn 三北一级区划数据详情:https://www.forestdata.cn/dataDetail.html?id=CSTR:17575.11.0120220907190.010001.V1
- forestdata.cn 三北三期工程新增建设县:https://www.forestdata.cn/dataDetail.html?id=CSTR:17575.11.0120220907193.010001.V1
- 中科院资源环境科学数据中心(中国林业工程空间分布):https://www.resdc.cn/data.aspx?DATAID=138
- 国家青藏高原科学数据中心(TPDC):https://data.tpdc.ac.cn/
- GBIF 物种占据下载:https://www.gbif.org/

### API 文档 URL

- Earth Engine Python API:https://developers.google.com/earth-engine/guides/python_install
- cdsapi GitHub:https://github.com/ecmwf/cdsapi
- cdsapi 设置(Personal Access Token):https://cds.climate.copernicus.eu/how-to-api
- earthaccess GitHub:https://github.com/nsidc/earthaccess
- xarray:https://docs.xarray.dev/
- rioxarray:https://corteva.github.io/rioxarray/
- geemap:https://geemap.org/
- pyGRACE:https://github.com/hillsonghimire/pyGRACE
- TAGEE(GEE 地形分析):https://github.com/zecojls/tagee
- elapid(MaxEnt 替代):https://github.com/earth-chris/elapid

### 关键论文

- Tarim TWS 趋势:Ruiqi Zhang et al. (2024). "Revealing Water Storage Changes and Ecological Water Conveyance Benefits in the Tarim River Basin over the Past 20 Years Based on GRACE/GRACE-FO." *Remote Sensing* 16(23): 4355. https://www.mdpi.com/2072-4292/16/23/4355
- Tarim 地下水降尺度:ScienceDirect 2021. "Downscaling simulation of groundwater storage in the Tarim River basin in northwest China based on GRACE data." https://www.sciencedirect.com/science/article/abs/pii/S1474706521000851
- Tarim TWS 早期:GJI 2017. "Estimating terrestrial water storage changes in the Tarim River Basin using GRACE data." https://academic.oup.com/gji/article/211/3/1449/4111153
- 梭梭分布范围:中国境内 Haloxylon ammodendron 地理分布(《林业科学》)。http://html.rhhz.net/linyekexue/html/20050501.htm
- 梭梭水分利用与地下水关系:《中国沙漠》2023, 43(1):20。http://www.desert.ac.cn/article/2023/1000-694X/1000-694X-2023-43-1-20.shtml
- 三北工程二/三/四期规划文档(国家发改委):https://www.ndrc.gov.cn/fggz/fzzlgh/gjjzxgh/200709/P020191104623220585491.pdf
- TPDC 平台介绍:Li et al. (2021). "National Tibetan Plateau Data Center: Promoting Earth System Science on the Third Pole." *Bulletin of the American Meteorological Society* 102(11). https://journals.ametsoc.org/view/journals/bams/102/11/BAMS-D-21-0004.1.xml
