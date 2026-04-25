# L3 Action Vocabulary — Desert Intelligence Decision Engine

**版本**: v0.1 (Phase A research draft)
**目标用户**: 三北防护林项目办工程师 (用户A)
**适用区域**: 塔克拉玛干沙漠周边 (新疆南疆,塔里木盆地边缘)
**架构层**: L3 Decide(L1 Sense → L3 Decide → L2 Act 闭环)
**最后更新**: 2026-04-25

---

## 1. 设计原则

### 1.1 为什么是有限集合(Finite Vocabulary)而不是 free-form

L3 推荐引擎的输出必须是**有限的、可枚举的、可审批的** action,而不是 free-form 自然语言建议。原因:

第一,**审批层级要求**。三北工程的项目按"基层 → 项目办 → 林业局 → 林草局"四级审批走 [国家林草局,2023]。每个 action 必须能映射到一个明确的审批层级,否则项目办工程师拿到推荐也无法上报。Free-form 的"建议在该地区开展植被恢复"无法走流程,但"在 X 地块按 600 株/hm² 密度种植梭梭,4 月中旬,预算 Y 元"可以直接进项目立项书。

第二,**可追溯性(citability)**。每个推荐的参数(密度、苗高、灌溉量、季节窗口)都必须能引用到论文/政府文件/历史项目数据。这样工程师上报时可以附 reference,被林业局质疑时可以解释来源。Free-form 推荐无法被审计。

第三,**Phase A 的 actionable 边界**。Phase A(0-12 月)L3 只输出建议,人做决定,机器人/灌溉系统不会自动响应 [项目 roadmap]。所以 vocabulary 必须能让一个**坐在乌鲁木齐办公室的工程师拿着报告就能去基层执行**——不是 abstract 的"建议改善生态",而是"4 月 10-25 日窗口,塔中以南 23km 处的 NDVI=0.08 异常区,推荐种植梭梭 1.5 万株,行距 2m × 株距 1m,苗高 30-40cm,根浸 30 分钟,滴灌每株 3-4kg 定根水,预算约 2.4 万元"。

### 1.2 每个 action 的强制元数据(Schema)

每个 action 必须包含 7 个字段:

1. **触发条件** — L1 数据 + 阈值组合(NDVI/SMAP/ERA5 等)
2. **输出参数** — 具体到数字的执行参数(密度、规格、窗口、用水量)
3. **置信度评估** — 历史成活率范围 + 数据完整度
4. **预估成本** — 元/亩 或 元/hm²,含苗木 + 人工 + 灌溉
5. **预估见效时间** — 从执行到 NDVI 显著上升的月数/年数
6. **审批层级** — 基层 / 项目办 / 林业局 / 林草局
7. **数据来源** — 论文 DOI / 政府文件 URL / 历史项目记录

低于这个完整度的推荐**不允许进入 vocabulary**。如果某个 action 缺数据(如缺成本数据),必须标记为 `[需补充]`,而不是拍脑袋编一个数字。

### 1.3 Phase A 用户 = 三北项目办工程师的画像

**典型用户**: 新疆林草局或地州林业局下属的"三北工程项目办公室"工程师。年龄 30-50,林业本科/硕士,熟悉传统造林技术规程,但**不熟悉卫星遥感和 ML**。他们的核心 KPI 是:年度造林任务面积完成率、3 年成活率验收(国标 ≥85%)[三北工程总体规划,2023]、单位面积成本控制。

所以 vocabulary 的语言必须是**林业行话,不是 AI 行话**。例如:
- 错: "推荐部署多元生态修复策略"
- 对: "推荐种植梭梭 600 株/hm²,行距 4m × 株距 4m,2 年生裸根苗,4 月 10-25 日,根浸 30 分钟,每穴 3-4kg 定根水"

---

## 2. 4 大类 Action

总计 **17 个 action**:种植 6 + 灌溉/水资源 4 + 巡检派遣 4 + 风险预警 3。

---

### 2.1 种植建议 (Planting Recommendations) — 6 个 action

#### 2.1.1 PLANT_HALOXYLON_AMMODENDRON — 推荐种植梭梭

- **触发条件**:
  - L1: NDVI 持续 3 年 < 0.15(裸沙到稀疏)
  - 年降水量: 50-150mm(梭梭最适带,塔克拉玛干周边大部分区域满足)
  - 土壤: 流动沙丘 / 半固定沙丘 / 沙砾质荒漠;不要求地下水可达
  - 海拔: < 1500m
- **输出参数**:
  - **造林密度**: 600-1100 株/hm² (干旱无灌溉条件取 600 株/hm²,有滴灌条件可加密到 1100 株/hm²)。无灌溉条件下"维持沙地水分平衡"的稀植标准为 3000 株/hm² 以下 [GB/T 18337.3-2001 生态公益林建设技术规程]
  - **株行距**: 4m × 4m(无灌溉) 或 3m × 3m(滴灌)
  - **苗木规格**: 1-2 年生裸根苗,苗高 30-50cm,地径 ≥0.4cm
  - **种植窗口**: 春季 4 月 10-25 日 [一亿棵梭梭项目记录,SEE 基金会];秋季 10 月下旬亦可,但春季成活率高
  - **种植深度**: 根颈下埋 5-10cm,沙埋 1cm 萌发率最佳 [中国沙漠,梭梭种子密度对萌发及幼苗生长的影响,2014]
  - **定根水**: 每穴 3-4kg [一亿棵梭梭项目技术规范]
  - **根处理**: 起苗后根浸水 30 分钟以上,防止失水
- **置信度评估**:
  - 高置信度。梭梭在塔克拉玛干周边有 30+ 年大规模造林历史
  - 历史成活率: 阿克苏沙雅县案例 ≥80%(微咸水滴灌) [新华社,2024];三北工程整体保存率从 60% 提升到 ≥85% [三北防护林发展报告 1978-2018]
  - 自然种子萌发率: 25-54%(密度依赖) [中国沙漠,2014]
- **预估成本**: 苗木 0.5-2 元/株,人工 + 滴灌约 600-1500 元/亩(具体取决于滴灌系统投资分摊年限) [需补充:确切的近 3 年造林单价单位 quote]
- **预估见效时间**:
  - 成活判定: 当年 9 月(种植后 5 个月)
  - 显著 NDVI 抬升: 3-5 年(NDVI 从 < 0.15 上升到 0.2-0.3)
  - 成熟固沙效果: 8-10 年
- **审批层级**: 项目办立项 → 地州林业局批复(单地块 < 1000 亩);> 1000 亩需自治区林草局批复
- **数据来源**:
  - [中国沙漠《梭梭种子密度对萌发及幼苗生长的影响》(2014)](http://www.desert.ac.cn/CN/10.7522/j.issn.1000-694X.2014.00127)
  - [GB/T 18337.3-2001 生态公益林建设技术规程](http://www.linan.gov.cn/art/2019/2/14/art_1377194_30215050.html)
  - [国家林草局《一亿棵梭梭项目技术规范》](https://foundation.see.org.cn/Brand/Project/2019/0918/5.html)
  - [辽宁省生态学会团体标准 T/LNES《梭梭防风固沙林近自然林分密度调控管理》(2025)](http://iae.cas.cn/lnesc/ttbz/202505/P020250528563704496397.pdf)
  - [新华社《沙雅县微咸水滴灌种植梭梭》(2024)](http://www.news.cn/local/20251129/f3269c454fb741eda2e80b62be864b2b/c.html)

---

#### 2.1.2 PLANT_TAMARIX_RAMOSISSIMA — 推荐种植红柳(多枝柽柳)

- **触发条件**:
  - L1: NDVI 持续 3 年 < 0.20
  - 土壤含盐量: 0.5-2%(轻度到中度盐碱;红柳为盐生先锋种)
  - 地下水位: 2-10m(红柳根可达 10m,深根 + 水力提升)
  - 适用场景: 河岸、低洼盐碱地、塔里木河沿线、微咸水滴灌带
- **输出参数**:
  - **造林密度**: 1670-3300 株/亩(株行距 0.5-1.0m × 2-3m)[搜索结果整理:柽柳造林通用规范]
  - **苗木规格**: 1 年生扦插苗或 2 年生裸根苗,苗高 50-80cm
  - **种植窗口**: 春季 3 月下旬-4 月中旬(萌芽前) 或 秋季 10-11 月(落叶后)
  - **定根水**: 每穴 5-8kg(红柳幼苗对定根水要求高于梭梭)
  - **特殊要求**: 优先布置在 4-9km 间距的微咸水井附近(参考塔里木沙漠公路防护林模式),26 天轮灌一次 [新华社《436km 沙漠公路防护林》]
- **置信度评估**:
  - 高置信度。塔里木沙漠公路 436km 防护林 2003 完工至今 20+ 年,主体存活,以红柳 + 梭梭 + 沙拐枣组合为主 [中国石油塔里木油田公司公开数据]
  - 已知风险: 长期滴灌下盐分在土壤表层累积,可能影响 15-20 年后的群落稳定性 [中国生态学杂志《塔克拉玛干南缘多枝柽柳光合特征水分利用效率》(2019)]
- **预估成本**: 与梭梭接近,微咸水井 + 滴灌系统初期投资较高(约 1500-3000 元/亩) [需补充:确切单位成本]
- **预估见效时间**: 成活判定当年秋季,显著固沙效果 2-3 年
- **审批层级**: 项目办立项 → 地州林业局
- **数据来源**:
  - [中国生态学杂志《塔克拉玛干沙漠南缘防护林和自然群落中多枝柽柳的光合特征水分利用效率》(2019)](https://www.cjae.net/CN/10.13287/j.1001-9332.201903.023)
  - [新华社《436km 绿色背后是"守井人"在坚守》(2023)](http://www.forestry.gov.cn/c/www/xcsp/568301.jhtml)
  - [《滨海重盐碱地人工栽植柽柳生长动态及生态效应》(2013)](https://www.ecoagri.ac.cn/en/article/pdf/preview/10.3724/SP.J.1011.2013.21077.pdf)

---

#### 2.1.3 PLANT_CALLIGONUM_MONGOLICUM — 推荐种植沙拐枣

- **触发条件**:
  - L1: NDVI < 0.15,流动沙丘表面或半固定沙丘
  - 适用土壤: 粗沙、沙砾质荒漠、流动沙丘(沙拐枣是真正的"流沙先锋种")
  - 不需要地下水可达(根系横向 20-30m,主根 3m)[百度百科:沙拐枣]
- **输出参数**:
  - **造林密度**: ~3000 株/hm²(干旱无灌溉条件下的稀植标准) [GB/T 18337.3-2001]
  - **苗木规格**: 1-2 年生苗,或直播种子(种子最佳播种深度 2cm) [Fan et al., Ecology and Evolution, 2018]
  - **种植窗口**: 春季 4 月,沙丘湿润时;雨后 1-3 天最佳
  - **特殊技术**: 常与草方格沙障结合(先方格固沙,再格内栽植)
  - **不需要**: 滴灌(沙拐枣抗旱性 > 梭梭,可纯雨养)
- **置信度评估**:
  - 中-高置信度。沙拐枣是"沙丘固定 - 半固定沙丘"过渡阶段的标准选择
  - 已知风险: 沙拐枣自然更新困难,固定沙丘上幼龄密度显著低于流动沙丘上的成熟密度 [Fan et al., 2018];即"种活了固定住,但下一代繁不起来"。需要配合其他物种做演替
- **预估成本**: 苗木 0.3-1 元/株,人工 ~300-500 元/亩(无灌溉)
- **预估见效时间**: 成活当年,固沙效果 2-3 年
- **审批层级**: 基层执行(单地块 < 500 亩);> 500 亩走项目办
- **数据来源**:
  - [Fan et al. "Factors influencing the natural regeneration of the pioneering shrub Calligonum mongolicum in sand dune stabilization plantations" Ecology and Evolution (2018)](https://onlinelibrary.wiley.com/doi/full/10.1002/ece3.3913)
  - [Frontiers《Bet-Hedging Strategies for Seedling Emergence of Calligonum mongolicum》(2018)](https://www.frontiersin.org/journals/plant-science/articles/10.3389/fpls.2018.01167/full)
  - [中国沙漠《沙漠腹地乔木状沙拐枣对灌水量的生理生态响应》(2010)](http://www.desert.ac.cn/CN/Y2010/V30/I6/1348)

---

#### 2.1.4 PLANT_POPULUS_EUPHRATICA — 推荐种植/抚育胡杨

- **触发条件**:
  - **严格地理限制**: 仅适用于塔里木河及其支流沿线、河漫滩、古河道
  - L1: 地下水位 < 5m(临界值)。地下水位 4m 内胡杨"生活自在",6-9m 时"萎靡不振"[搜索结果汇总,新疆林草局]
  - L1: NDVI 在胡杨林分布区显示衰退趋势(连续 2 年下降 > 0.05)
  - 上游需要有可调度生态输水量
- **输出参数**:
  - **不是大规模新造林,主要是 3 个 sub-action**:
    - (a) **生态输水诱发自然更新**: 配合塔里木河生态输水(每年大西海子下泄 ≥3.5 亿 m³)[中国日报《26 年 102 亿方水》(2025)],在洪水漫淹后 1-2 周内监测胡杨萌蘖出苗,圈定保护区禁止人畜进入
    - (b) **平茬复壮**: 对老龄退化胡杨(冠层稀疏 NDVI 低)实施平茬,促进根蘖更新 [汉斯出版社《塔里木河流域中下游胡杨林更新复壮的研究现状》]
    - (c) **新植**: 在河道改道形成的新河漫滩植 1-2 年生苗,株行距 3m × 4m,需保证地下水位 < 5m
  - **苗木规格**(若新植): 容器苗,苗高 80-120cm
  - **种植窗口**: 春季 3-4 月或秋季 10 月(配合输水时段)
- **置信度评估**:
  - 高置信度。塔里木河生态输水 2000 年至今,下游高覆盖度胡杨林面积增加 41%,植被恢复改善面积 139.7 万亩 [中国日报,2025]
  - 关键约束: 没有水就没有胡杨。在无生态输水保障的区域**不要**推荐胡杨
- **预估成本**: 输水诱发更新模式 < 100 元/亩(主要是封禁人畜成本);新植模式 1500-3000 元/亩(容器苗 + 浇水)
- **预估见效时间**:
  - 输水后地下水位回升: 2.60m(从 3.53m,轮台县案例) [新疆水利厅]
  - 胡杨萌蘖: 输水后 1-3 个月可见
  - NDVI 显著抬升: 2-5 年
- **审批层级**: 必须走自治区林草局 + 水利厅(涉及生态输水调度)
- **数据来源**:
  - [中国日报《大国工程在新疆丨26 年,102 亿方水!》(2025)](https://china.chinadaily.com.cn/a/202508/14/WS689dcbcaa3104ba1353fce24.html)
  - [汉斯出版社《塔里木河流域中下游胡杨林更新复壮的研究现状及展望》](https://www.hanspub.org/journal/PaperInformation?paperID=25243)
  - [新疆财政厅《塔里木河沿岸探索科学治水 胡杨林"喝上"生态水》(2024)](https://czt.xinjiang.gov.cn/xjczt/c115022/202409/24e8617647704b2d9b58743e7cb7eb69.shtml)
  - [邓铭江院士《塔里木河生态输水与生态修复研究与实践》新疆水利厅](https://slt.xinjiang.gov.cn/xjslt/c114431/202311/3554ce296a6c424e908082053ee5e588.shtml)

---

#### 2.1.5 PLANT_HEDYSARUM_SCOPARIUM — 推荐种植花棒

- **触发条件**:
  - L1: NDVI < 0.15
  - 土壤: 干沙层厚度可达 40cm,含水率 2-4% 仍可生长(花棒抗旱性极强)[搜索结果汇总]
  - 适用区域: 塔克拉玛干东北缘(更靠近毛乌素 / 河西走廊气候带的过渡区)
- **输出参数**:
  - **造林密度**: 2500-4000 株/hm²(毛乌素和宁夏河东沙区的适宜密度) [搜索结果:花棒人工固沙林相关研究]
  - **苗木规格**: 1 年生苗,苗高 30-50cm,或直播种子(2cm 沙埋出苗率 95.6%)
  - **种植窗口**: 春季 4 月初-中旬;雨季前(6 月) 也可
  - **配套**: 常与柠条、油蒿组合形成"花棒-柠条-油蒿"稳定固沙体系(沙坡头模式)
- **置信度评估**:
  - 高置信度。花棒在沙坡头(中卫包兰铁路防护体系)是核心固沙先锋种,有 60+ 年应用史
  - 适用范围警示: 塔克拉玛干极端干旱腹地(降雨 < 50mm/年) 花棒表现可能不如梭梭/沙拐枣,优先用于东北缘和过渡带
- **预估成本**: 苗木 0.3-0.8 元/株,人工 ~400-800 元/亩
- **预估见效时间**: 成活当年,固沙效果 2 年
- **审批层级**: 项目办立项 → 地州林业局
- **数据来源**:
  - [中国沙漠《腾格里沙漠南缘花棒人工固沙林演替规律与机制》(2020)](http://www.desert.ac.cn/CN/10.7522/j.issn.1000-694X.2020.00055)
  - [生态学报《沙埋对花棒种子萌发和幼苗生长的影响》](http://www.ecolsci.com/CN/abstract/abstract303.shtml)
  - [国家林草局《花棒:沙漠中的美丽守护者》](http://www.forestry.gov.cn.cdn20.com/c/www/dzw/560411.jhtml)

---

#### 2.1.6 PLANT_MIXED_COMMUNITY — 推荐混交群落配置

- **触发条件**:
  - 区域 > 500 hm²(大面积造林,不应单一树种)
  - 异质性土壤(同一区域内有沙丘、低洼、盐碱斑块)
  - L1 显示 NDVI 全域 < 0.20 但土壤湿度/盐分有空间变异
- **输出参数**:
  - **配置**: 沙丘顶部 → 沙拐枣(纯流沙先锋);沙丘中部 → 梭梭(主体);沙丘底部/低洼 → 红柳(耐盐 + 微咸水滴灌);如有水源 → 河漫滩植胡杨
  - **比例**: 梭梭 50% + 红柳 30% + 沙拐枣 15% + 花棒 5%(典型塔里木沙漠公路防护林比例参考)
  - **空间布局**: 主防风方向(西北)前缘高密度,后缘渐疏
- **置信度评估**:
  - 高置信度。塔里木沙漠公路 436km 防护林 2080 万株植物以梭梭+红柳+沙拐枣混交方式 20+ 年验证 [新华社,2024]
- **预估成本**: 加权平均,约 1000-2000 元/亩(含滴灌)
- **预估见效时间**: 同单一物种(2-5 年)
- **审批层级**: 自治区林草局(规模通常 > 1000 亩)
- **数据来源**:
  - [新华社《织厚"绿围脖" 黄沙变黄金》(2025)](http://www.news.cn/local/20251129/f3269c454fb741eda2e80b62be864b2b/c.html)
  - [塔里木沙漠公路防护林公开数据,中国石油塔里木油田公司]

---

### 2.2 灌溉/水资源调度 (Water Management) — 4 个 action

#### 2.2.1 IRRIGATION_DRIP_PULSE — 推荐启动滴灌

- **触发条件**:
  - L1: SMAP 土壤湿度 < 阈值(梭梭根系层 < 5%)
  - L1: ERA5 预报未来 14 天无降水 > 5mm
  - 物候: 4-9 月生长季内
  - 设施: 该地块已铺设滴灌管网
- **输出参数**:
  - **单株供水量**:
    - 梭梭/红柳成树: 11.5-23 升/株/次(基于 2.3 升/小时滴头 × 5-10 小时)[滴灌通用规范]
    - 幼苗(1-2 年生): 5-10 升/株/次
  - **轮灌周期**: 26 天/次(塔里木沙漠公路防护林模式) [新华社《436km》]
  - **微咸水适用**: 水矿化度 4.0-4.8 g/L 仍可用 [中国科学院新疆分院]
  - **泵站**: 优先使用太阳能泵站(沙雅县案例)
- **置信度评估**:
  - 高置信度。塔里木沙漠公路 21161 公里滴灌管网 + 100+ 微咸水井 20 年运行数据
  - 关键风险: 长期滴灌导致表层盐分累积(已观察到对长期稳定性影响)[中国生态学杂志,2019]
- **预估成本**: 抽水电费 + 滴灌耗材,~30-80 元/亩/次(具体看井深和泵效率)
- **预估见效时间**: 即时(24-72 小时土壤湿度回升)
- **审批层级**: 基层执行(常规生长季灌溉);项目办备案(应急灌溉)
- **数据来源**:
  - [新华社《一份责任 一份担当 436 公里绿色背后是"守井人"》](http://www.forestry.gov.cn/c/www/xcsp/568301.jhtml)
  - [塔里木沙漠石油公路工程技术研究, 中国沙漠](http://www.desert.ac.cn/EN/article/downloadArticleFile.do?attachType=PDF&id=3932)
  - [《塔克拉玛干沙漠腹地梭梭幼苗根系分布特征对不同灌溉量的响应》植物生态学](https://www.plant-ecology.com/CN/lexeme/showArticleByLexeme.do?articleID=5581)

---

#### 2.2.2 IRRIGATION_FLOOD_ECOLOGICAL — 推荐启动生态输水/引洪灌溉

- **触发条件**:
  - L1: 塔里木河沿线胡杨林区 NDVI 连续 2 年下降 > 0.05
  - L1: 沿线地下水位监测井数据显示 > 5m
  - 上游有可调度水量(春汛或洪水期)
  - 时间窗口: 7-9 月洪水期最优
- **输出参数**:
  - **年输水量目标**: ≥3.5 亿 m³(规划目标),实际 2000-2024 平均 4.05 亿 m³/年 [中国日报,2025]
  - **轮灌周期**: 三年一轮灌(科学补水方式) [中国日报,2025]
  - **输水路径**: 大西海子水库 → 下游 800km 河道 + 漫淹区
  - **目标地下水位**: 输水后下游地下水位从 8-12m 回升到 2-5m [新疆林草局]
- **置信度评估**:
  - 高置信度。2000-2024 累计输水 102 亿 m³,验证有效
  - 限制: 必须有上游来水保障;干旱年份无水可调
- **预估成本**: 大型工程,单次输水成本数千万到上亿元(全流域)
- **预估见效时间**:
  - 地下水位回升: 1-2 个月
  - 胡杨萌蘖: 1-3 个月
  - 高覆盖度胡杨林面积增加 41%(20 年累积效应)
- **审批层级**: 自治区水利厅 + 林草局联合审批,跨地州协调
- **数据来源**:
  - [中国日报《26 年,102 亿方水!中国最长内陆河是如何被唤醒的?》(2025)](https://china.chinadaily.com.cn/a/202508/14/WS689dcbcaa3104ba1353fce24.html)
  - [央视网《断流近 30 年,生态输水 20 年:塔里木河的重生》(2019)](http://news.cctv.com/2019/08/28/ARTI9yiLYegfX8b0zJrfNMbL190828.shtml)
  - [新疆水利厅《邓铭江院士:塔里木河生态输水与生态修复研究与实践》](https://slt.xinjiang.gov.cn/xjslt/c114431/202311/3554ce296a6c424e908082053ee5e588.shtml)

---

#### 2.2.3 GROUNDWATER_CAUTION — 推荐限制地下水开采

- **触发条件**:
  - L1: 地下水位监测井数据连续 3 年下降 > 1m/年
  - L1: 周边 5km 内 NDVI 出现退化趋势
  - 地区: 内陆河尾闾绿洲(类似民勤、塔里木尾闾)
- **输出参数**:
  - **不是种树,是预警 + 政策建议 action**: 推荐林业局向水利局提交"暂停新井审批 + 限额开采"建议
  - **量化建议**: 单位面积绿洲可持续开采量上限(具体值需要本地水文模型,通用阈值无法给) [需补充:塔里木盆地分区可持续开采量数据]
  - **替代方案**: 引地表水 + 节水滴灌替换地下水灌溉
- **置信度评估**:
  - 高置信度(教训类)。民勤案例: 地下水位从 1-9m 下降到 12-25m,导致 13.5 万亩沙枣林 + 35 万亩白刺红柳枯死或半死 [民进中央甘肃民勤生态环境调查,2017]
  - 警示边界: 这个 action 是**预防性的**,不要等到大规模死亡才触发
- **预估成本**: 政策性 action,直接成本 0;社会成本(农业减产) 大,需要经济补偿配套
- **预估见效时间**: 政策落地 1-3 年后地下水位回升可见
- **审批层级**: 省级水利厅 + 林草局 + 农业厅联合
- **数据来源**:
  - [民进中央《关于进一步加强甘肃民勤生态环境综合治理的政策建议》(2017)](https://www.mj.org.cn/mjzt/content/2017-10/26/content_271511.htm)
  - [甘肃省国土空间生态修复规划 (2021—2035 年)](https://zrzy.gansu.gov.cn/zrzy/c107751/202208/2095581/files/a39b9901967444a981e6a7b2ba66b270.pdf)

---

#### 2.2.4 IRRIGATION_SKIP — 推荐本周期跳过灌溉

- **触发条件**:
  - L1: ERA5 预报未来 7 天降水 > 10mm 累计
  - L1: SMAP 当前土壤湿度 > 阈值(已饱和)
  - 物候: 非关键生长期
- **输出参数**:
  - 本轮跳过,下一轮(26 天后)重新评估
  - 节水量: 单次约 23-50 m³/hm²
- **置信度评估**: 高(气象预报可靠)
- **预估成本**: 节省 30-80 元/亩
- **审批层级**: 基层自动执行(灌溉管理员)
- **数据来源**: ERA5 reanalysis 标准实践;塔里木油田防护林轮灌制度

---

### 2.3 巡检派遣 (Inspection Dispatch) — 4 个 action

#### 2.3.1 INSPECT_HUMAN — 派人工巡检

- **触发条件**:
  - 异常区域 > 50 hm²(大面积异常,机器人覆盖率不够)
  - 需要做"种什么"判断(机器人能力不足)
  - 涉及边界纠纷或权属确认
  - 沙尘暴 / 寒潮预警期间 (机器人不宜作业)
- **输出参数**:
  - 派遣人数: 2-4 人(安全两人原则)
  - 装备清单: GPS、土壤采样器、相机、GoPro、便携式 NDVI 测量仪
  - 预期工期: 单次巡检 1-3 天 / 100km²
  - 报告 deadline: 巡检后 7 天内提交
- **置信度评估**: N/A(执行性 action)
- **预估成本**: ~3000-8000 元/次(人工 + 车辆 + 燃料 + 保险)
- **审批层级**: 项目办调度
- **数据来源**: 三北工程项目办标准巡检流程

---

#### 2.3.2 INSPECT_SNAKE_ROBOT — 派蛇形机器人巡检

- **触发条件**:
  - 异常区域 < 5 hm²(机器人续航和速度限制)
  - 平地或缓坡(< 30° 沙坡角度) [Science《Sidewinding with minimal slip》, Marvi et al., 2014]
  - 需要近距离目视确认("这块 NDVI = 0.05 是真退化还是云遮挡?")
  - 需要钻入草方格 / 灌丛底部检查根部腐烂
- **输出参数**:
  - 任务类型枚举:
    - (a) **目视确认**: 拍摄 RGB + NIR 影像,验证 NDVI 异常
    - (b) **土壤采样**: 0-5cm 表层 + 20cm 根层(每个采样点 50g)
    - (c) **温度/湿度记录**: 红外测温 + 探针式土壤湿度
  - 部署半径: 单次 < 500m(续航限制) [搜索结果汇总:蛇形机器人能耗高 + 负载有限]
  - 速度: 0.05-0.3 m/s(沙地)
  - 不能做: > 1kg 物体搬运、播种、阀门操作(机械臂力矩不足)
- **置信度评估**:
  - 中。蛇形机器人在沙丘斜坡的能力被 NASA EELS 和 CMU 等团队验证,但**长距离野外作业 + 沙尘环境耐久性**仍是未解决问题
  - 边界: > 30° 沙坡角度可能 sidewinding 失败 [Marvi et al., Science, 2014]
- **预估成本**: 单次任务 ~500-2000 元(主要是部署 + 回收人工)
- **审批层级**: 项目办备案(常规);林业局批复(首次试点)
- **数据来源**:
  - [Marvi et al. "Sidewinding with minimal slip: Snake and robot ascent of sandy slopes" Science (2014)](https://www.science.org/doi/10.1126/science.1255718)
  - [Snake robots: A state-of-the-art review on design, locomotion, control, and real-world applications](https://www.sciencedirect.com/science/article/pii/S0957415825001278)
  - [JPL EELS 项目](https://www.jpl.nasa.gov/news/jpls-snake-like-eels-slithers-into-new-robotics-terrain/)

---

#### 2.3.3 INSPECT_DRONE — 派无人机巡检

- **触发条件**:
  - 异常区域 5-1000 hm²(蛇形机器人覆盖不够,人工成本太高)
  - 风速 < 8 m/s
  - 能见度 > 5km(无沙尘暴)
  - 需要高分辨率 RGB / 多光谱补充 Sentinel-2 (10m 分辨率不够)
- **输出参数**:
  - 推荐机型: 多旋翼(< 50 hm²) 或 固定翼(> 50 hm²)
  - 飞行高度: 100-300m (RGB 1-3cm 分辨率)
  - 多光谱载荷: 推荐(NDVI 验证)
  - 单架次覆盖: 多旋翼 ~50 hm²,固定翼 ~500 hm²
  - 续航限制: 多旋翼 30-45 分钟,固定翼 2-3 小时
- **置信度评估**: 高,无人机巡检在中国林业系统已大规模应用
- **预估成本**: 多旋翼 1500-3000 元/架次,固定翼 8000-15000 元/架次
- **审批层级**: 基层执行(常规),空管报备(单次飞行 > 120m 或 > 30 分钟)
- **数据来源**: 国家林草局《无人机森林资源监测技术规程》(待具体补充)
- 备注: **非本项目自有,Phase A 推荐"建议委托林业局现有无人机服务",Phase B 考虑自建**

---

#### 2.3.4 INSPECT_SCHEDULED — 推荐排期常规巡检

- **触发条件**:
  - 距上次巡检 > 季度阈值(春季 30 天 / 夏季 14 天 / 秋季 30 天 / 冬季 60 天)
  - 该地块为"重点监测区"标签
- **输出参数**:
  - 发起 INSPECT_HUMAN 或 INSPECT_DRONE 子任务(根据地块大小)
  - 提交月度巡检报告
- **审批层级**: 自动排期,基层执行
- **数据来源**: 三北工程标准管护周期

---

### 2.4 风险预警 (Risk Alerts) — 3 个 action

#### 2.4.1 ALERT_DUST_STORM — 沙尘暴预警

- **触发条件**:
  - L1 + 气象局 API: 未来 24-72 小时风速 > 17 m/s + 能见度预测 < 1km
  - 季节: 主要 3-5 月(春季沙尘暴峰值)[《近半个世纪中国北方沙尘暴的空间分布和时间变化规律》]
  - 范围: 区域内有 < 1 年生新植幼苗(高风险种群)
- **输出参数**:
  - **预警级别**: I 级(大暴) / II 级(沙暴) / III 级(扬沙)
  - **行动建议**:
    - 暂停所有机器人/无人机巡检 (24-72 小时)
    - 暂停滴灌作业
    - 紧急加固草方格(若新植幼苗 + 草方格刚铺设 < 30 天)
    - 沙尘过后 7 天内派人工巡检评估幼苗沙埋死亡率
  - **死亡率预估**: 1 年生幼苗在沙暴中死亡率可达 30-60%(具体需历史数据回归,本项目未来需积累)[需补充:塔克拉玛干沙暴幼苗死亡率定量数据]
- **置信度评估**:
  - 预警本身高置信度(气象局预报可靠)
  - 死亡率定量预测低置信度(缺少塔克拉玛干特定数据)
- **预估成本**: 预警 0,损失避免 ~$10K-100K(单次大沙暴可摧毁数百亩新造林)
- **审批层级**: 自动触发,基层 + 项目办同步通知
- **数据来源**:
  - [WHO《沙尘暴》](https://www.who.int/zh/news-room/fact-sheets/detail/sand-and-dust-storms)
  - [《中国地理学报》Temporal-spatial Distribution of Sand-Dust Storms in China](https://www.geog.com.cn/EN/10.11821/xb200103008)
  - [《近半个世纪中国北方沙尘暴的空间分布和时间变化规律回顾》(2024)](https://image.hanspub.org/Html/501.html)

---

#### 2.4.2 ALERT_HEAT_WAVE — 热浪预警

- **触发条件**:
  - L1 + 气象局: 未来 7 天气温 > 40°C 持续 ≥ 3 天
  - 区域内有 < 2 年生幼苗
  - 土壤湿度 < 关键阈值(SMAP)
- **输出参数**:
  - **预警级别**: 黄色(40-43°C) / 橙色(43-45°C) / 红色(> 45°C)
  - **行动建议**:
    - 增加滴灌频率(常规 26 天 → 应急 7-14 天/次)
    - 幼苗死亡率威胁: 40°C 以上预测幼苗成活率开始下降,45-60°C 区间持续时间显著放大死亡率 [Frontiers《Conifer Seedling Survival in Response to High Surface Temperature Events》(2021)]
    - 关键: 在土壤湿度充足时,幼苗能耐受高气温和地表温;湿度不足是致命因素
  - **机器人/人工巡检暂停时段**: 11:00-17:00(地表温可达 60°C+)
- **置信度评估**:
  - 中。40°C 阈值有学术支持,但塔克拉玛干本地物种(梭梭/红柳)的精确热致死曲线缺数据
- **预估成本**: 应急灌溉 100-300 元/亩/次
- **审批层级**: 项目办备案,基层执行
- **数据来源**:
  - [Frontiers《Conifer Seedling Survival in Response to High Surface Temperature Events of Varying Intensity and Duration》(2021)](https://www.frontiersin.org/journals/forests-and-global-change/articles/10.3389/ffgc.2021.731267/full)
  - [《Adapting Crops to Rising Temperatures: Understanding Heat Stress and Plant Resilience Mechanisms》(2025)](https://www.mdpi.com/1422-0067/26/21/10426)

---

#### 2.4.3 ALERT_NDVI_DEGRADATION — NDVI 异常退化预警

- **触发条件**:
  - L1: 区域 NDVI 同比下降 > 0.05 (季节匹配)
  - L1: NDVI 绝对值 < 0.15 且持续 > 6 个月
  - 历史 baseline: 该区域 5 年 NDVI 平均值 [Sentinel Hub NDVI Anomaly Detection 标准方法]
- **输出参数**:
  - **退化级别**:
    - 关注: 同比下降 0.03-0.05
    - 警告: 同比下降 0.05-0.10
    - 应急: 同比下降 > 0.10 或绝对值 < 0.10
  - **行动建议**:
    - 关注级: INSPECT_DRONE 或 INSPECT_HUMAN 排期
    - 警告级: 7 天内派 INSPECT_HUMAN 现场确认 + INSPECT_SNAKE_ROBOT 局部目视
    - 应急级: 启动应急方案,可能需要 IRRIGATION_FLOOD_ECOLOGICAL(塔里木河沿线) 或 IRRIGATION_DRIP_PULSE(滴灌区)
- **置信度评估**:
  - 高(检测层面)
  - 中(归因层面: NDVI 下降可能是真退化,也可能是云/雪覆盖、传感器噪声、季节物候,需要现场确认)
- **预估成本**: 预警自动化,响应成本依子 action 而定
- **审批层级**: 关注级基层,警告级项目办,应急级林业局
- **数据来源**:
  - [Sentinel Hub NDVI Anomaly Detection Script](https://custom-scripts.sentinel-hub.com/custom-scripts/sentinel-2/ndvi_anomaly_detection/)
  - [《Assessing the accuracy of spectral indices obtained from Sentinel images using field research to estimate land degradation》(2024)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11271892/)
  - [《Sentinel-2 Data in an Evaluation of the Impact of the Disturbances on Forest Vegetation》(2020)](https://www.mdpi.com/2072-4292/12/12/1914)

---

## 3. 数据需求映射 (Data Requirements per Action)

每个 action 需要 L1 提供哪些输入数据,下表列出最小数据集:

| Action | NDVI(Sentinel-2) | SMAP土壤湿度 | ERA5气象 | GRACE地下水 | SRTM地形 | 三北历史数据 | 物种分布map |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 2.1.1 PLANT_HALOXYLON | 必须 | 推荐 | 推荐 | - | 必须 | 推荐 | 必须 |
| 2.1.2 PLANT_TAMARIX | 必须 | 必须 | 推荐 | 必须(地下水位) | 必须 | 推荐 | 必须 |
| 2.1.3 PLANT_CALLIGONUM | 必须 | 推荐 | 推荐 | - | 必须 | - | 必须 |
| 2.1.4 PLANT_POPULUS | 必须 | 必须 | 必须 | 必须(< 5m临界) | 必须 | 必须 | 必须 |
| 2.1.5 PLANT_HEDYSARUM | 必须 | 推荐 | 推荐 | - | 必须 | 推荐 | 必须 |
| 2.1.6 PLANT_MIXED | 必须 | 必须 | 推荐 | 推荐 | 必须 | 必须 | 必须 |
| 2.2.1 IRRIGATION_DRIP | 推荐 | 必须 | 必须(预报) | - | - | - | - |
| 2.2.2 IRRIGATION_FLOOD | 必须 | 必须 | 必须 | 必须 | 必须 | 必须 | 必须 |
| 2.2.3 GROUNDWATER_CAUTION | 推荐 | 推荐 | - | 必须(连续监测) | - | 必须 | - |
| 2.2.4 IRRIGATION_SKIP | - | 必须 | 必须(预报) | - | - | - | - |
| 2.3.1 INSPECT_HUMAN | 必须 | - | 必须(预报) | - | 推荐 | - | - |
| 2.3.2 INSPECT_SNAKE_ROBOT | 必须 | - | 必须(预报) | - | 必须(坡度) | - | - |
| 2.3.3 INSPECT_DRONE | 必须 | - | 必须(预报:风速) | - | 推荐 | - | - |
| 2.3.4 INSPECT_SCHEDULED | 必须 | - | - | - | - | - | - |
| 2.4.1 ALERT_DUST_STORM | - | - | 必须(气象API) | - | - | 推荐(植期) | - |
| 2.4.2 ALERT_HEAT_WAVE | - | 必须 | 必须(气象API) | - | - | 推荐(植期) | - |
| 2.4.3 ALERT_NDVI_DEGRADATION | 必须(时序) | 推荐 | 推荐 | 推荐 | - | 必须(baseline) | 推荐 |

**数据 gap 总结**:
- 当前项目仅有 Sentinel-2 NDVI,17 个 action 中**只有 4 个(2.3.4, 2.4.3, 部分 INSPECT_*)能完全 actionable**。
- 优先补充顺序: ERA5 气象 > SMAP 土壤湿度 > GRACE 地下水 > SRTM 地形 > 三北历史 > 物种 map。
- ERA5 和 SRTM 是开放数据,实施成本最低,优先级最高。

---

## 4. 置信度评分方法

每个 action 输出一个 0-1 的置信度分数,基于 3 因素加权:

```
confidence = 0.5 * historical_success + 0.3 * data_completeness + 0.2 * model_certainty
```

- **historical_success (0-1)**: 历史在该气候带的成活率/成功率(从论文/政府数据中查表)。例如梭梭在塔里木盆地有 80% 成活率,该项 = 0.8。
- **data_completeness (0-1)**: 该 action 所需数据(见 §3 表)中"必须"项的实际可获得比例。例如 PLANT_POPULUS 需要 6 项必须数据,实际只能拿到 3 项,该项 = 0.5。
- **model_certainty (0-1)**: 推荐引擎的内部不确定性(如 ML 模型的 prediction interval 宽度)。Phase A 是基于规则,无 ML,该项默认 = 0.7;Phase B 引入 ML 后用模型本身的 confidence。

**阈值规则**:
- confidence > 0.75: "高置信度推荐"(标识)
- 0.5 ≤ confidence ≤ 0.75: "中置信度推荐"(需人工复核)
- confidence < 0.5: "低置信度,仅供参考"(必须人工复核)

---

## 5. 审批层级矩阵

| Action 类别 | 影响范围 | 审批层级 | 备注 |
|---|---|---|---|
| 单地块 PLANT_* < 500 亩 | 局部 | 基层执行 + 项目办备案 | 常规造林任务 |
| PLANT_* 500-1000 亩 | 中等 | 项目办立项 + 地州林业局批复 | 标准三北流程 |
| PLANT_* > 1000 亩 | 大规模 | 自治区林草局批复 | 重大项目 |
| PLANT_POPULUS_EUPHRATICA(任何规模) | 跨域 | 自治区林草局 + 水利厅 | 涉及生态输水 |
| IRRIGATION_DRIP_PULSE | 局部 | 基层(常规) / 项目办(应急) | 灌溉管理员 |
| IRRIGATION_FLOOD_ECOLOGICAL | 流域级 | 自治区水利厅 + 林草局,跨地州 | 重大决策 |
| GROUNDWATER_CAUTION | 跨部门 | 省级水利厅 + 林草局 + 农业厅 | 政策性 |
| IRRIGATION_SKIP | 局部 | 基层自动 | 常规调度 |
| INSPECT_HUMAN / DRONE / SCHEDULED | 局部 | 项目办调度 | |
| INSPECT_SNAKE_ROBOT(首次) | 局部 | 林业局批复 | 试点期 |
| INSPECT_SNAKE_ROBOT(常规) | 局部 | 项目办备案 | |
| ALERT_DUST_STORM | 区域 | 自动触发,通知 | |
| ALERT_HEAT_WAVE | 区域 | 项目办备案 | |
| ALERT_NDVI_DEGRADATION 关注级 | 局部 | 基层 | |
| ALERT_NDVI_DEGRADATION 警告级 | 局部 | 项目办 | |
| ALERT_NDVI_DEGRADATION 应急级 | 中-大 | 林业局 | |

---

## 6. Phase A → B → C 演进

### Phase A (0-12 月) — 纯 recommendation

所有 17 个 action 都以"建议报告"形式输出,人做决定。系统不会自动操作机器人或灌溉阀。

- **早期落地**: ALERT_DUST_STORM、ALERT_NDVI_DEGRADATION、INSPECT_SCHEDULED — 这些只需要 NDVI + 气象 API,可立即上线。
- **中期落地**: 2.1 种植类 action — 需要补充 SRTM、ERA5 后可输出推荐。
- **晚期落地**: PLANT_POPULUS、IRRIGATION_FLOOD — 需要 GRACE 地下水 + 输水调度数据,Phase A 后期或 Phase B。

### Phase B (12-30 月) — 半自动

- **优先自动化**: IRRIGATION_DRIP_PULSE、IRRIGATION_SKIP — 灌溉决策标准化程度高,风险低,适合第一批闭环。但需要 SCADA 接入到滴灌系统。
- **半自动**: INSPECT_SNAKE_ROBOT — 系统自动调度机器人执行 INSPECT 任务,但巡检结果仍由人解读。
- **保留人决策**: 所有 PLANT_* 和 IRRIGATION_FLOOD,因为单次决策金额大、不可逆。

### Phase C (30 月+) — 全自动

- **可全自动**: IRRIGATION 所有 action(已通过 Phase B 验证)、INSPECT_SNAKE_ROBOT 闭环、ALERT 自动触发应急响应预案。
- **永远不全自动**: PLANT_* 所有 action,种树是不可逆的资本支出 + 涉及土地权属和地方利益,必须人审批。GROUNDWATER_CAUTION 涉及跨部门政策,也永远是建议。

---

## 7. 引用来源 (References)

### 7.1 核心物种与造林技术
1. [中国沙漠《梭梭种子密度对萌发及幼苗生长的影响》(2014)](http://www.desert.ac.cn/CN/10.7522/j.issn.1000-694X.2014.00127)
2. [植物生态学《塔克拉玛干沙漠腹地梭梭幼苗根系分布特征对不同灌溉量的响应》](https://www.plant-ecology.com/CN/lexeme/showArticleByLexeme.do?articleID=5581)
3. [Canadian Journal of Botany《Haloxylon ammodendron self-thinning relationship and size inequality with wind erosion stress》(2022)](https://cdnsciencepub.com/doi/abs/10.1139/cjb-2022-0123)
4. [辽宁省生态学会团体标准 T/LNES《梭梭防风固沙林近自然林分密度调控管理》(2025)](http://iae.cas.cn/lnesc/ttbz/202505/P020250528563704496397.pdf)
5. [中国生态学杂志《塔克拉玛干沙漠南缘防护林和自然群落中多枝柽柳的光合特征水分利用效率》(2019)](https://www.cjae.net/CN/10.13287/j.1001-9332.201903.023)
6. [《滨海重盐碱地人工栽植柽柳生长动态及生态效应》(2013)](https://www.ecoagri.ac.cn/en/article/pdf/preview/10.3724/SP.J.1011.2013.21077.pdf)
7. [Fan et al. "Factors influencing the natural regeneration of the pioneering shrub Calligonum mongolicum" Ecology and Evolution (2018)](https://onlinelibrary.wiley.com/doi/full/10.1002/ece3.3913)
8. [Frontiers《Bet-Hedging Strategies for Seedling Emergence of Calligonum mongolicum》(2018)](https://www.frontiersin.org/journals/plant-science/articles/10.3389/fpls.2018.01167/full)
9. [中国沙漠《沙漠腹地乔木状沙拐枣对灌水量的生理生态响应》(2010)](http://www.desert.ac.cn/CN/Y2010/V30/I6/1348)
10. [中国沙漠《腾格里沙漠南缘花棒人工固沙林演替规律与机制》(2020)](http://www.desert.ac.cn/CN/10.7522/j.issn.1000-694X.2020.00055)
11. [生态学报《沙埋对花棒种子萌发和幼苗生长的影响》](http://www.ecolsci.com/CN/abstract/abstract303.shtml)
12. [汉斯出版社《塔里木河流域中下游胡杨林更新复壮的研究现状及展望》](https://www.hanspub.org/journal/PaperInformation?paperID=25243)
13. [汉斯出版社《塔里木河胡杨林的自然演替与恢复发展措施》](https://image.hanspub.org/html/3-2210101_18696.htm)
14. [《基于生物量的塔里木河下游胡杨生态服务价值评估》](https://aipub.cn/1AA258Fh)
15. [中国沙漠《河道输水对塔里木河下游胡杨生长状况的影响》(2010)](http://www.desert.ac.cn/CN/Y2010/V30/I2/312)

### 7.2 物理工程与沙障
16. [光明科普云《"草方格"沙障如何治沙?》(2024)](https://kepu.gmw.cn/2024-05/15/content_37324567.htm)
17. [青海湖沙地麦草方格沙障的蚀积效应与规格选取(2014)](https://www.dlyj.ac.cn/article/2014/1000-0690/1000-0690-34-5-627.shtml)
18. [北京林业大学学报《新型生物可降解 PLA 沙障与传统草方格沙障防风效益》](http://j.bjfu.edu.cn/article/id/11045)
19. [中国沙漠《刷状沙柳沙障固沙性能风洞模拟》(2024)](http://www.desert.ac.cn/article/2024/1000-694X/1000-694X-2024-44-3-290.shtml)
20. [PLA 沙障的风沙流颗粒分布特征](https://www.hanspub.org/journal/paperinformation?paperid=35180)

### 7.3 水资源与生态输水
21. [中国日报《大国工程在新疆丨26 年,102 亿方水!中国最长内陆河是如何被唤醒的?》(2025)](https://china.chinadaily.com.cn/a/202508/14/WS689dcbcaa3104ba1353fce24.html)
22. [央视网《断流近 30 年,生态输水 20 年:塔里木河的重生》(2019)](http://news.cctv.com/2019/08/28/ARTI9yiLYegfX8b0zJrfNMbL190828.shtml)
23. [新疆水利厅《邓铭江院士:塔里木河生态输水与生态修复研究与实践》](https://slt.xinjiang.gov.cn/xjslt/c114431/202311/3554ce296a6c424e908082053ee5e588.shtml)
24. [新疆财政厅《塔里木河沿岸探索科学治水 胡杨林"喝上"生态水》(2024)](https://czt.xinjiang.gov.cn/xjczt/c115022/202409/24e8617647704b2d9b58743e7cb7eb69.shtml)
25. [《基于环境质量指数的塔里木河下游生态输水效益评估》干旱区地理](http://alg.xjegi.com/CN/10.12118/j.issn.1000-6060.2024.075)
26. [《Time Series Monitoring on Eco-environment Change in the Lower Reaches of the Tarim River》](https://www.dqxxkx.cn/EN/10.12082/dqxxkx.2019.180523)

### 7.4 塔里木沙漠公路防护林
27. [中国沙漠《塔里木沙漠石油公路工程技术研究》](http://www.desert.ac.cn/EN/article/downloadArticleFile.do?attachType=PDF&id=3932)
28. [国家林草局《一份责任 一份担当 436 公里绿色背后是"守井人"》](http://www.forestry.gov.cn/c/www/xcsp/568301.jhtml)
29. [《塔里木沙漠公路防护林生态工程立地类型划分》](https://www.sciengine.com/doi/pdf/74FC800B88284649B29E20A3E4BB87CF)
30. [新华网《"死亡之海"里的零碳沙漠公路》(2023)](http://www.news.cn/photo/2023-08/22/c_1129816883.htm)
31. [中国科学院《新疆塔里木沙漠公路见闻》](https://www.cas.cn/zt/kjzt/12thkexing/wzl/201301/P020130130503752454056.pdf)

### 7.5 三北防护林政策与规程
32. [国务院办公厅《"三北"工程总体规划》(2023)](https://www.mee.gov.cn/zcwj/gwywj/202509/t20250916_1127545.shtml)
33. [国家发改委《"三北"工程总体规划答记者问》(2025)](https://www.ndrc.gov.cn/xxgk/jd/jd/202509/t20250915_1400489.html)
34. [国家林草局《三北防护林体系建设 40 年发展报告 1978—2018》](https://www.forestry.gov.cn/html/sbj/sbj_5102/20220125154748720366588/file/20220419084114310665949.pdf)
35. [国家林草局《三北防护林体系建设工程总体规划》](https://www.forestry.gov.cn/c/sbj/gcgh/355834.jhtml)
36. [GB/T 18337.3-2001《生态公益林建设技术规程》](http://www.linan.gov.cn/art/2019/2/14/art_1377194_30215050.html)
37. [林业行业标准《退化防护林修复技术规程》](https://lcj.yn.gov.cn/uploadfile/s37/2025/0423/20250423051652137.pdf)
38. [《对"三北"防护林体系工程的思考与展望》水土保持研究](http://stbcyj.paperonce.org/Upload/PaperUpLoad/ffee5acd-b8bd-4cb3-ac5e-72c63e81ed48.pdf)

### 7.6 历史成败案例
39. [天山网《柯柯牙荒漠绿化工程——荒漠变绿洲的"生态奇迹"》(2023)](https://www.ts.cn/xwzx/jjxw/202311/t20231101_17036812.shtml)
40. [新疆政府《柯柯牙荒漠绿化工程——戈壁荒滩崛起"绿色银行"》(2020)](https://www.xinjiang.gov.cn/xinjiang/hbddc/202006/8426e77e9f374d81b548891760fa34e2.shtml)
41. [民进中央《关于进一步加强甘肃民勤生态环境综合治理的政策建议》(2017)](https://www.mj.org.cn/mjzt/content/2017-10/26/content_271511.htm)
42. [《近 30 年来民勤土地荒漠化变化遥感分析》中国遥感](https://www.ygxb.ac.cn/rc-pub/front/front-article/download/10642356/lowqualitypdf/%E8%BF%9130%E5%B9%B4%E6%9D%A5%E6%B0%91%E5%8B%A4%E5%9C%9F%E5%9C%B0%E8%8D%92%E6%BC%A0%E5%8C%96%E5%8F%98%E5%8C%96%E9%81%A5%E6%84%9F%E5%88%86%E6%9E%90.pdf)
43. [《甘肃民勤沙漠化防治创新机制研究》](http://106.37.81.211:8082/images/sjsimages/pdf/qk/kfyj/kfyj2008/0802pdf/080209.pdf)
44. [甘肃省国土空间生态修复规划 (2021—2035 年)](https://zrzy.gansu.gov.cn/zrzy/c107751/202208/2095581/files/a39b9901967444a981e6a7b2ba66b270.pdf)

### 7.7 生物结皮与微生物
45. [Frontiers《Co-inoculation of fungi and desert cyanobacteria facilitates biological soil crust formation and soil fertility》(2024)](https://www.frontiersin.org/journals/microbiology/articles/10.3389/fmicb.2024.1377732/full)
46. [中国应用生态学报《生物结皮胞外多糖理化特性及菌群结构的季节动态》](https://www.cjae.net/CN/10.13287/j.1001-9332.202207.016)
47. [中国应用生态学报《土壤基质中细物质含量对人工蓝藻结皮形成的影响》](https://www.cjae.net/CN/10.13287/j.1001-9332.202309.014)
48. [中国沙漠《中国人工蓝藻结皮研究进展》](http://www.desert.ac.cn/CN/abstract/abstract6238.shtml)
49. [PLOS One《Rapid development of cyanobacterial crust in the field for combating desertification》](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0179903)
50. [Frontiers《Cyanobacteria Inoculation Improves Soil Stability and Fertility on Different Textured Soils》](https://www.frontiersin.org/journals/environmental-science/articles/10.3389/fenvs.2018.00049/full)

### 7.8 气候/极端事件影响
51. [Frontiers《Conifer Seedling Survival in Response to High Surface Temperature Events of Varying Intensity and Duration》(2021)](https://www.frontiersin.org/journals/forests-and-global-change/articles/10.3389/ffgc.2021.731267/full)
52. [PMC《Lethal combination for seedlings: extreme heat drives mortality of drought-exposed high-elevation pine seedlings》](https://pmc.ncbi.nlm.nih.gov/articles/PMC11805925/)
53. [《Heat damage in tree seedlings and its prevention》New Forests](https://link.springer.com/article/10.1007/BF00030044)
54. [WHO《沙尘暴》fact sheet](https://www.who.int/zh/news-room/fact-sheets/detail/sand-and-dust-storms)
55. [《Temporal-spatial Distribution as well as Tracks and Source Areas of Sand-Dust Storms in China》Acta Geographica Sinica](https://www.geog.com.cn/EN/10.11821/xb200103008)
56. [《近半个世纪中国北方沙尘暴的空间分布和时间变化规律回顾》(2024)](https://image.hanspub.org/Html/501.html)

### 7.9 遥感监测
57. [Sentinel Hub NDVI Anomaly Detection Custom Script](https://custom-scripts.sentinel-hub.com/custom-scripts/sentinel-2/ndvi_anomaly_detection/)
58. [PMC《Assessing the accuracy of spectral indices obtained from Sentinel images using field research to estimate land degradation》(2024)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11271892/)
59. [MDPI《Sentinel-2 Data in an Evaluation of the Impact of the Disturbances on Forest Vegetation》(2020)](https://www.mdpi.com/2072-4292/12/12/1914)
60. [MDPI《Sentinel-2 Based Temporal Detection of Agricultural Land Use Anomalies》](https://www.mdpi.com/2220-9964/7/10/405)

### 7.10 蛇形机器人
61. [Marvi et al. "Sidewinding with minimal slip: Snake and robot ascent of sandy slopes" Science (2014)](https://www.science.org/doi/10.1126/science.1255718)
62. [《Snake robots: A state-of-the-art review on design, locomotion, control, and real-world applications》ScienceDirect (2025)](https://www.sciencedirect.com/science/article/pii/S0957415825001278)
63. [《Review of snake robots in constrained environments》ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0921889021000701)
64. [JPL《JPL's Snake-Like EELS Slithers Into New Robotics Terrain》](https://www.jpl.nasa.gov/news/jpls-snake-like-eels-slithers-into-new-robotics-terrain/)
65. [《Towards bio-inspired robots for underground and surface exploration in planetary environments》ScienceDirect](https://www.sciencedirect.com/science/article/pii/S2405844020309920)

### 7.11 其他参考
66. [植物详情:梭梭 Haloxylon ammodendron 新疆药用植物种质资源信息](http://www.xjdpgrsp.com/germplasm/plants_content.html?id=91)
67. [新疆维吾尔自治区农业用水定额(征求意见稿)](https://slt.xinjiang.gov.cn/xjslt/c114487/202301/419b73a876504a3e8bcc55880219f873/files/%E9%99%84%E4%BB%B61%E6%96%B0%E7%96%86%E7%BB%B4%E5%90%BE%E5%B0%94%E8%87%AA%E6%B2%BB%E5%8C%BA%E5%86%9C%E4%B8%9A%E7%94%A8%E6%B0%B4%E5%AE%9A%E9%A2%9D(%E5%BE%81%E6%B1%82%E6%84%8F%E8%A7%81%E7%A8%BF).pdf)
68. [新华社《活力中国调研行丨从一棵梭梭,看生态改善与农牧增收互促共赢》(2025)](https://www.news.cn/fortune/20250828/52029dc8e83d466fb8df8486d253bb06/c.html)
69. [新华社《织厚"绿围脖" 黄沙变黄金——巩固塔克拉玛干沙漠治沙成效一线观察》(2025)](http://www.news.cn/local/20251129/f3269c454fb741eda2e80b62be864b2b/c.html)
70. [新华网《塔克拉玛干的奇迹:绿锁流沙》(2024)](https://www.news.cn/local/20241230/34315b860d984406a103833d32d410f2/c.html)

---

## 附录 A: Research Gaps (CEO 需考虑的学术 contact)

本次 research 已经覆盖大部分公开数据,但以下 6 个 gap 需要找学术合作者补:

1. **塔克拉玛干沙暴对幼苗死亡率的定量曲线**: 现有文献只有定性描述(沙尘暴有害),缺一年生 vs 三年生幼苗在不同沙暴强度下的死亡率回归。建议联系: 中国科学院新疆生态与地理研究所 (XIEG)。

2. **梭梭/红柳/沙拐枣的精确热致死曲线**: 国外针对松树和地中海物种的研究多,塔克拉玛干优势种的热致死阈值缺。建议联系: 兰州大学西部生态安全协同创新中心 / XIEG。

3. **微咸水滴灌长期(20+ 年)的盐分累积模型**: 已知长期滴灌导致表层盐分累积,但量化模型缺。塔里木油田 20 年实测数据应该有,但未公开发表。建议联系: 中国石油塔里木油田公司 + XIEG。

4. **三北防护林单位面积造林精确成本**: 各地报道数字不一致(从 500 元到 3000 元/亩都有),且包含项目不同。需要找近 3 年招投标公开数据汇总。建议联系: 国家林草局三北局 / 各地林业局规划科。

5. **塔里木盆地分区可持续地下水开采量**: GROUNDWATER_CAUTION action 需要本地化的可持续开采上限阈值,通用值无法用。建议联系: 新疆水利厅 + 中国水科院塔里木水土资源中心。

6. **PLA 沙障 vs 草方格 vs 砾石沙障 在塔克拉玛干的实际寿命对比**: 现有文献是风洞模拟 + 加速老化测试,缺现场长期跟踪数据。这影响"沙障 + 种植组合"action 的成本预估。建议联系: 北京林业大学水土保持学院 + XIEG。

---

## 附录 B: 与项目现有 L1/L2 的衔接

- **现有 L1**: 仅 Sentinel-2 NDVI(已实现)
- **本 vocabulary 假设的 L1**: NDVI + SMAP + ERA5 + GRACE + SRTM + 三北历史 + 物种 map
- **需要 L1 团队优先补**: ERA5(气象,免费 + 简单) → SRTM(地形,免费 + 简单) → SMAP(土壤湿度,免费 + 中等) → GRACE(地下水,免费但分辨率粗) → 三北历史(需要协调林草局) → 物种 map(可基于 NDVI + Sentinel-2 多光谱自训练)

- **现有 L2**: 蛇形机器人(规划中,未实装)
- **本 vocabulary 假设的 L2**: 蛇形机器人(目视 + 采样,< 1kg payload,< 500m 半径) + 滴灌阀控制(规划) + 微型播种(规划)
- **vocabulary 与 L2 能力 gap**: PLANT_* 6 个 action 中机器人完全不能执行(种树需要 > 5kg payload,机器人能力不足),完全靠人工。INSPECT_SNAKE_ROBOT 是机器人核心可执行 action。IRRIGATION_DRIP_PULSE 在 Phase B/C 通过 SCADA 自动化,机器人不直接参与。

---

**文档结束**
**字数: 约 8500 字(中文)**
