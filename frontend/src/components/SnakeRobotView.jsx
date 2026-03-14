import { useRef, useEffect } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { FiCpu, FiZap, FiSun, FiCamera, FiThermometer, FiDroplet, FiCheckCircle, FiAlertCircle, FiClock, FiArrowLeft, FiArrowRight, FiUploadCloud, FiPlay, FiRepeat } from "react-icons/fi";
import "./SnakeRobotView.css";

/* ── Scroll-triggered fade-in ── */
function useFadeIn() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add("visible"); obs.unobserve(el); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function FadeSection({ children, className = "", ...props }) {
  const ref = useFadeIn();
  return <section ref={ref} className={`fade-section ${className}`} {...props}>{children}</section>;
}

/* ── Data ── */
const SPECS = [
  { labelEn: "Length", labelZh: "\u957F\u5EA6", value: "~60 cm", detail: "8 segments" },
  { labelEn: "Weight", labelZh: "\u91CD\u91CF", value: "~800g", detail: "with battery" },
  { labelEn: "Actuators", labelZh: "\u9A71\u52A8\u5668", value: "7x Servo", detail: "MG996R" },
  { labelEn: "Speed", labelZh: "\u901F\u5EA6", value: "3\u20135 cm/s", detail: "on sand" },
  { labelEn: "Runtime", labelZh: "\u7EED\u822A", value: "~45 min", detail: "active" },
  { labelEn: "Control", labelZh: "\u63A7\u5236", value: "WiFi/BT", detail: "remote" },
];

const SENSORS = [
  { icon: FiCamera, en: "ESP32-CAM", zh: "ESP32\u6444\u50CF\u5934", descEn: "Photographs stem bases to classify alive vs. dead saplings. GPS-tagged images stored on microSD.", descZh: "\u62CD\u6444\u6811\u5E72\u57FA\u90E8\u5224\u65AD\u5B58\u6D3B\u72B6\u6001\u3002GPS\u6807\u8BB0\u56FE\u50CF\u5B58\u50A8\u5728microSD\u5361\u3002", color: "#4fc3f7", pos: "Head" },
  { icon: FiThermometer, en: "DHT22", zh: "DHT22\u4F20\u611F\u5668", descEn: "Ground-level temperature & humidity. Desert surface can be 15\u201320\u00B0C hotter than air.", descZh: "\u5730\u8868\u6E29\u6E7F\u5EA6\u3002\u6C99\u6F20\u5730\u8868\u53EF\u6BD4\u6C14\u6E29\u9AD815\u201320\u00B0C\u3002", color: "#ffa726", pos: "Segment 4" },
  { icon: FiDroplet, en: "Soil Probe", zh: "\u571F\u58E4\u63A2\u9488", descEn: "Capacitive sensor measures root-zone moisture at ~5 cm depth. Critical for irrigation assessment.", descZh: "\u7535\u5BB9\u5F0F\u4F20\u611F\u5668\u6D4B\u91CF\u7EA65cm\u6DF1\u5904\u6839\u533A\u6C34\u5206\u3002", color: "#66bb6a", pos: "Segment 6" },
];

const TERRAIN = [
  { en: "Loose Sand", zh: "\u677E\u6563\u6C99\u5730", snake: 9, wheeled: 3, legged: 5 },
  { en: "Dunes", zh: "\u6C99\u4E18", snake: 7, wheeled: 2, legged: 4 },
  { en: "Rocks", zh: "\u5CA9\u77F3", snake: 6, wheeled: 5, legged: 7 },
  { en: "Irrigation", zh: "\u704C\u6E20", snake: 9, wheeled: 2, legged: 5 },
  { en: "Vegetation", zh: "\u690D\u88AB\u95F4", snake: 8, wheeled: 3, legged: 5 },
];

const BOM = [
  { item: "MG996R Servo Motor", qty: "7", cost: "$42", note: "High torque, metal gear" },
  { item: "3D Printed Segments", qty: "8", cost: "$15", note: "PLA/PETG, ~2hr each" },
  { item: "ESP32 Controller", qty: "1", cost: "$12", note: "Main MCU + WiFi" },
  { item: "PCA9685 Servo Driver", qty: "1", cost: "$5", note: "16-channel PWM" },
  { item: "3S LiPo 2200mAh", qty: "1", cost: "$18", note: "11.1V battery pack" },
  { item: "ESP32-CAM Module", qty: "1", cost: "$8", note: "Head camera + WiFi" },
  { item: "DHT22 + Soil Probe", qty: "2", cost: "$7", note: "Temp/humidity + moisture" },
  { item: "20W Solar Panel", qty: "1", cost: "$25", note: "Charging station" },
  { item: "Wiring & Misc", qty: "\u2014", cost: "$17", note: "Connectors, shrink tube" },
];

const TIMELINE_STEPS = [
  { en: "Research & CAD", zh: "\u7814\u7A76\u4E0ECAD", months: "Mar\u2013Apr", status: "current" },
  { en: "3D Print & Assemble", zh: "3D\u6253\u5370\u4E0E\u7EC4\u88C5", months: "Apr\u2013May", status: "upcoming" },
  { en: "Program & Test", zh: "\u7F16\u7A0B\u4E0E\u6D4B\u8BD5", months: "May\u2013Jun", status: "upcoming" },
  { en: "Field Deployment", zh: "\u5B9E\u5730\u90E8\u7F72", months: "Jun\u2013Aug", status: "upcoming" },
];

const FIELD_TESTS = [
  { en: "Sand Locomotion", zh: "\u6C99\u5730\u79FB\u52A8", descEn: "Film sidewinding across open sand. Document speed and track pattern.", descZh: "\u62CD\u6444\u5728\u5F00\u9614\u6C99\u5730\u4E0A\u7684\u4FA7\u7ED5\u8FD0\u52A8\u3002" },
  { en: "Green Belt Navigation", zh: "\u7EFF\u5E26\u5BFC\u822A", descEn: "Navigate between planted poplars and irrigation lines without damage.", descZh: "\u5728\u6811\u6728\u548C\u704C\u6E89\u7BA1\u7EBF\u95F4\u5BFC\u822A\u3002" },
  { en: "Data Collection Run", zh: "\u6570\u636E\u91C7\u96C6", descEn: "50m transect: photograph 20 trees, measure soil moisture, compare with manual count.", descZh: "50\u7C73\u6837\u7EBF\uFF1A\u62CD\u644720\u68F5\u6811\uFF0C\u6D4B\u571F\u58E4\u6E7F\u5EA6\uFF0C\u4E0E\u4EBA\u5DE5\u8BA1\u6570\u5BF9\u6BD4\u3002" },
  { en: "Failure Documentation", zh: "\u6545\u969C\u8BB0\u5F55", descEn: "Intentionally document what goes wrong \u2014 sand in servos, overheating. These are essay material.", descZh: "\u4E3B\u52A8\u8BB0\u5F55\u6545\u969C\u2014\u2014\u6C99\u5B50\u8FDB\u820D\u673A\u3001\u8FC7\u70ED\u3002\u8FD9\u4E9B\u662F\u7533\u8BF7\u7D20\u6750\u3002" },
];

export default function SnakeRobotView({ onNavigate }) {
  const { lang } = useLanguage();
  const isZh = lang === "zh";

  return (
    <div className="snake-page">
      {/* ── HERO ── */}
      <section className="snake-hero">
        <div className="snake-hero-badge">
          <FiCpu size={14} />
          {isZh ? "\u7B2C\u4E8C\u5C42 \u00B7 \u5730\u9762\u5DE1\u903B" : "Pillar 2 \u00B7 Ground Patrol"}
        </div>
        <h1>{isZh ? "\u6C99\u6F20\u4E4B\u86C7" : "Desert Serpent"}</h1>
        <p className="snake-hero-sub">
          {isZh
            ? "\u4EFF\u751F\u86C7\u5F62\u673A\u5668\u4EBA \u2014 \u6C99\u6F20\u690D\u88AB\u5B58\u6D3B\u76D1\u6D4B"
            : "Bio-inspired snake robot for desert vegetation survival monitoring"}
        </p>
        <p className="snake-hero-mission">
          {isZh
            ? "\u6BCF\u5E74\u6570\u767E\u4E07\u68F5\u6811\u82D7\u88AB\u79CD\u4E0B\u3002\u5F88\u591A\u5728\u7B2C\u4E00\u5E74\u5C31\u6B7B\u4E86\u3002\u8FD9\u4E2A\u673A\u5668\u4EBA\u627E\u5230\u6B7B\u6811\u3002"
            : "Millions of saplings are planted each year. Many die in year one. This robot finds the dead ones."}
        </p>
        {onNavigate && (
          <button className="snake-back-btn" onClick={() => onNavigate("mission")}>
            <FiArrowLeft size={14} /> {isZh ? "\u8FD4\u56DE\u4F7F\u547D" : "Back to Mission"}
          </button>
        )}
      </section>

      {/* ── THE GAP ── */}
      <FadeSection className="snake-section">
        <h2 className="snake-section-title">
          {isZh ? "\u76D1\u6D4B\u7A7A\u767D" : "The Monitoring Gap"}
        </h2>
        <p className="snake-section-desc">
          {isZh
            ? "\u536B\u661F\u770B\u5F97\u592A\u8FDC\uFF0C\u4EBA\u5DE5\u5DE1\u68C0\u592A\u6162\u3002\u86C7\u5F62\u673A\u5668\u4EBA\u586B\u8865\u4E86\u4E24\u8005\u4E4B\u95F4\u7684\u7A7A\u767D\u3002"
            : "Satellites see too far. Humans inspect too slowly. The snake robot fills the gap."}
        </p>
        <div className="snake-gap-grid">
          {[
            { title: isZh ? "\u536B\u661F" : "Satellite", detail: isZh ? "10\u7C73/\u50CF\u7D20 \u00B7 \u770B\u8D8B\u52BF\uFF0C\u4E0D\u89C1\u5355\u68F5\u6811" : "10m/pixel \u00B7 Sees trends, not individual trees", color: "#4fc3f7", scale: isZh ? "\u5B8F\u89C2" : "Macro" },
            { title: isZh ? "\u86C7\u5F62\u673A\u5668\u4EBA" : "Snake Robot", detail: isZh ? "\u6BEB\u7C73\u7EA7 \u00B7 \u9010\u68F5\u68C0\u67E5\u690D\u7269\u5065\u5EB7" : "mm-level \u00B7 Inspects each plant individually", color: "#66bb6a", scale: isZh ? "\u4E2D\u89C2" : "Meso", highlight: true },
            { title: isZh ? "\u4EBA\u5DE5" : "Human", detail: isZh ? "\u6700\u4F73\u6570\u636E \u00B7 45\u00B0C\u4E0B\u6781\u5371\u9669" : "Best data \u00B7 But dangerous in 45\u00B0C heat", color: "#ffa726", scale: isZh ? "\u5FAE\u89C2" : "Micro" },
          ].map((g, i) => (
            <div key={i} className={`gap-card ${g.highlight ? "highlight" : ""}`} style={{ borderTopColor: g.color }}>
              <span className="gap-scale" style={{ color: g.color }}>{g.scale}</span>
              <h3>{g.title}</h3>
              <p>{g.detail}</p>
            </div>
          ))}
        </div>
      </FadeSection>

      {/* ── WHY SNAKE ── */}
      <FadeSection className="snake-section">
        <h2 className="snake-section-title">
          {isZh ? "\u4E3A\u4EC0\u4E48\u662F\u86C7\uFF1F" : "Why a Snake?"}
        </h2>
        <div className="snake-bio-card">
          <div className="snake-bio-left">
            <h3>{isZh ? "\u4FA7\u7ED5\u8FD0\u52A8" : "Sidewinding Locomotion"}</h3>
            <p>
              {isZh
                ? "\u89D2\u54CD\u5C3E\u86C7\uFF08Crotalus cerastes\uFF09\u8FDB\u5316\u51FA\u4E13\u9002\u5E94\u677E\u6563\u6C99\u5730\u7684\u4FA7\u7ED5\u8FD0\u52A8\u3002\u7EA660%\u7684\u8EAB\u4F53\u59CB\u7EC8\u79BB\u5F00\u5730\u9762\uFF0C\u5927\u5E45\u51CF\u5C11\u6469\u64E6\u3002"
                : "The sidewinder rattlesnake (Crotalus cerastes) evolved locomotion specifically for loose sand. ~60% of its body stays lifted off the surface, dramatically reducing friction."}
            </p>
            <div className="snake-bio-bullets">
              <div className="bio-bullet fail"><span>{isZh ? "\u8F6E\u5B50" : "Wheels"}</span> {isZh ? "\u5728\u6C99\u4E2D\u6253\u6ED1\u4E0B\u9677" : "spin and sink in sand"}</div>
              <div className="bio-bullet fail"><span>{isZh ? "\u8DB3\u5F0F" : "Legs"}</span> {isZh ? "\u523A\u7A7F\u6C99\u58F3\u53D8\u5F97\u4E0D\u7A33" : "punch through crust, unstable"}</div>
              <div className="bio-bullet pass"><span>{isZh ? "\u86C7\u5F62" : "Snake"}</span> {isZh ? "\u5206\u6563\u91CD\u91CF\uFF0C\u7545\u884C\u65E0\u963B" : "distributes weight, glides smoothly"}</div>
            </div>
          </div>
          <div className="snake-bio-right">
            <div className="snake-body-diagram-v2">
              <div className="diagram-label-row">
                <span className="dl cam">CAM</span>
                <span className="dl spacer" />
                <span className="dl spacer" />
                <span className="dl tmp">T/H</span>
                <span className="dl spacer" />
                <span className="dl soil">SOIL</span>
                <span className="dl batt">BATT</span>
                <span className="dl batt">BATT</span>
              </div>
              <div className="diagram-segments">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="dseg-wrapper" style={{ animationDelay: `${i * 0.12}s` }}>
                    <div className={`dseg ${i % 2 === 0 ? "dark" : "light"} ${i >= 6 ? "battery" : ""}`}>
                      <span className="dseg-num">{i + 1}</span>
                    </div>
                    {i < 7 && <div className="dseg-joint" />}
                  </div>
                ))}
              </div>
              <div className="diagram-ground" />
              <span className="diagram-dim">~60 cm</span>
            </div>
            <span className="diagram-caption">{isZh ? "8\u6BB5\u5F0F\u86C7\u5F62\u673A\u5668\u4EBA\u4FA7\u89C6\u56FE" : "8-segment snake robot \u2014 side view"}</span>
          </div>
        </div>
      </FadeSection>

      {/* ── TERRAIN CHART ── */}
      <FadeSection className="snake-section">
        <h2 className="snake-section-title">
          {isZh ? "\u5730\u5F62\u6027\u80FD\u5BF9\u6BD4" : "Terrain Performance"}
        </h2>
        <div className="terrain-chart">
          <div className="terrain-legend">
            <span><span className="t-dot" style={{ background: "#66bb6a" }} />{isZh ? "\u86C7\u5F62" : "Snake"}</span>
            <span><span className="t-dot" style={{ background: "#4fc3f7" }} />{isZh ? "\u8F6E\u5F0F" : "Wheeled"}</span>
            <span><span className="t-dot" style={{ background: "#ffa726" }} />{isZh ? "\u8DB3\u5F0F" : "Legged"}</span>
          </div>
          {TERRAIN.map((t) => (
            <div key={t.en} className="terrain-row">
              <span className="terrain-label">{isZh ? t.zh : t.en}</span>
              <div className="terrain-bars">
                <div className="t-bar" style={{ width: `${t.snake * 10}%`, background: "#66bb6a" }}><span>{t.snake}</span></div>
                <div className="t-bar" style={{ width: `${t.wheeled * 10}%`, background: "#4fc3f7" }}><span>{t.wheeled}</span></div>
                <div className="t-bar" style={{ width: `${t.legged * 10}%`, background: "#ffa726" }}><span>{t.legged}</span></div>
              </div>
            </div>
          ))}
        </div>
      </FadeSection>

      {/* ── SPECS ── */}
      <FadeSection className="snake-section">
        <h2 className="snake-section-title">{isZh ? "\u6838\u5FC3\u89C4\u683C" : "Core Specifications"}</h2>
        <div className="snake-specs-grid">
          {SPECS.map((s, i) => (
            <div key={i} className="snake-spec-card">
              <span className="spec-value">{s.value}</span>
              <span className="spec-label">{isZh ? s.labelZh : s.labelEn}</span>
              <span className="spec-detail">{s.detail}</span>
            </div>
          ))}
        </div>
      </FadeSection>

      {/* ── SENSORS ── */}
      <FadeSection className="snake-section">
        <h2 className="snake-section-title">{isZh ? "\u4F20\u611F\u5668\u5957\u4EF6" : "Sensor Suite"}</h2>
        <div className="snake-sensors">
          {SENSORS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="sensor-card" style={{ borderLeftColor: s.color }}>
                <div className="sensor-header">
                  <Icon size={18} style={{ color: s.color }} />
                  <div>
                    <strong>{isZh ? s.zh : s.en}</strong>
                    <span className="sensor-pos">{s.pos}</span>
                  </div>
                </div>
                <p>{isZh ? s.descZh : s.descEn}</p>
              </div>
            );
          })}
        </div>
      </FadeSection>

      {/* ── POWER ── */}
      <FadeSection className="snake-section">
        <h2 className="snake-section-title">
          <FiSun size={18} />
          {isZh ? "\u592A\u9633\u80FD\u5145\u7535\u7AD9" : "Solar Charging Station"}
        </h2>
        <div className="snake-power-grid">
          <div className="power-card"><FiZap size={20} style={{ color: "#ffa726" }} /><div><strong>{isZh ? "\u529F\u8017" : "Draw"}</strong><span>~14.5W</span></div></div>
          <div className="power-card"><FiZap size={20} style={{ color: "#4fc3f7" }} /><div><strong>{isZh ? "\u7535\u6C60" : "Battery"}</strong><span>3S LiPo 2200mAh</span></div></div>
          <div className="power-card"><FiSun size={20} style={{ color: "#ffc107" }} /><div><strong>{isZh ? "\u592A\u9633\u80FD" : "Solar"}</strong><span>20W mono</span></div></div>
          <div className="power-card"><FiClock size={20} style={{ color: "#66bb6a" }} /><div><strong>{isZh ? "\u5145\u7535" : "Charge"}</strong><span>~2h {isZh ? "\u5145\u6EE1" : "full"}</span></div></div>
        </div>
        <div className="power-cycle">
          <p>
            {isZh
              ? "\u673A\u5668\u4EBA\u4F7F\u7528\u53EF\u66F4\u6362LiPo\u7535\u6C60\uFF0C\u6BCF\u6B21\u4EFB\u52A1\u540E\u8FD4\u56DE\u592A\u9633\u80FD\u5145\u7535\u7AD9\u3002\u7AD9\u70B9\u540C\u65F6\u4E0A\u4F20\u6570\u636E\u3002\u6BCF\u5929\u53EF\u5145\u75354\u20135\u6B21\u3002"
              : "The robot returns to a solar charging station after each sortie. The station doubles as a data relay. 4\u20135 sorties per day in full sun."}
          </p>
          <div className="cycle-steps">
            {[
              { en: "Charge", zh: "\u5145\u7535", icon: FiZap },
              { en: "Deploy", zh: "\u90E8\u7F72", icon: FiPlay },
              { en: "Inspect", zh: "\u5DE1\u68C0", icon: FiCamera },
              { en: "Return", zh: "\u8FD4\u56DE", icon: FiRepeat },
              { en: "Upload", zh: "\u4E0A\u4F20", icon: FiUploadCloud },
            ].map((s, i, arr) => {
              const Icon = s.icon;
              return (
                <span key={i} className="cycle-step">
                  <Icon size={14} className="cycle-feather-icon" />
                  {isZh ? s.zh : s.en}
                  {i < arr.length - 1 && <FiArrowRight size={12} className="cycle-arrow-icon" />}
                </span>
              );
            })}
          </div>
        </div>
      </FadeSection>

      {/* ── CONCRETE USE CASE ── */}
      <FadeSection className="snake-section">
        <h2 className="snake-section-title">
          {isZh ? "\u5177\u4F53\u4EFB\u52A1\u793A\u4F8B" : "Example Inspection Run"}
        </h2>
        <div className="use-case-card">
          <p className="use-case-scenario">
            {isZh
              ? "\u536B\u661F\u6807\u8BB0\u548C\u7530\u7EFF\u5E26\u4E00\u6BB5100\u7C73\u533A\u57DFNDVI\u4E0B\u964D\u3002\u673A\u5668\u4EBA\u51FA\u52A8\uFF1A"
              : "Satellite flags a 100m section of the Hotan green belt where NDVI has dropped. Robot deploys:"}
          </p>
          <div className="use-case-steps">
            <div className="uc-step"><span className="uc-num">1</span><span>{isZh ? "\u4FA7\u7ED5\u8FDB\u5165\u6811\u884C\uFF0C\u907F\u5F00\u6EF4\u704C\u7BA1" : "Sidewinds into tree row, avoids drip lines"}</span></div>
            <div className="uc-step"><span className="uc-num">2</span><span>{isZh ? "\u5728\u6BCF\u68F5\u6811\u524D\u505C\u4E0B\uFF0C\u62CD\u6444\u6811\u5E72\u57FA\u90E8" : "Stops at each tree, photographs stem base"}</span></div>
            <div className="uc-step"><span className="uc-num">3</span><span>{isZh ? "\u6D4B\u91CF\u6839\u533A\u571F\u58E4\u6E7F\u5EA6" : "Measures root-zone soil moisture"}</span></div>
            <div className="uc-step"><span className="uc-num">4</span><span>{isZh ? "50\u7C73\u5185\u68C0\u67E520\u68F5\u6811\uFF0C\u8017\u65F618\u5206\u949F" : "Inspects 20 trees in 50m, takes 18 minutes"}</span></div>
            <div className="uc-step"><span className="uc-num">5</span><span>{isZh ? "\u751F\u6210\u5B58\u6D3B\u5730\u56FE\uFF1A14\u68F5\u5B58\u6D3B\uFF0C6\u68F5\u6B7B\u4EA1\uFF0C\u6807\u8BB0\u8865\u79CD\u4F4D\u7F6E" : "Outputs survival map: 14 alive, 6 dead, marks replacement locations"}</span></div>
          </div>
          <p className="use-case-result">
            {isZh
              ? "\u7ED3\u679C\uFF1A\u4E00\u5F20\u536B\u661F\u65E0\u6CD5\u751F\u6210\u7684\u9010\u68F5\u5B58\u6D3B\u5730\u56FE\uFF0C\u65E0\u9700\u5DE5\u4EBA\u5728\u9177\u70ED\u4E2D\u884C\u8D70\u6570\u5C0F\u65F6\u3002"
              : "Result: a per-tree survival map that satellites cannot produce, without workers walking for hours in extreme heat."}
          </p>
        </div>
      </FadeSection>

      {/* ── BOM ── */}
      <FadeSection className="snake-section">
        <h2 className="snake-section-title">{isZh ? "\u7269\u6599\u6E05\u5355" : "Bill of Materials"}</h2>
        <div className="snake-bom">
          <div className="bom-header">
            <span>{isZh ? "\u7EC4\u4EF6" : "Component"}</span>
            <span>{isZh ? "\u6570\u91CF" : "Qty"}</span>
            <span>{isZh ? "\u4F30\u4EF7" : "Cost"}</span>
            <span>{isZh ? "\u5907\u6CE8" : "Notes"}</span>
          </div>
          {BOM.map((b, i) => (
            <div key={i} className="bom-row">
              <span>{b.item}</span>
              <span>{b.qty}</span>
              <span>{b.cost}</span>
              <span className="bom-note">{b.note}</span>
            </div>
          ))}
          <div className="bom-total">
            <span><strong>{isZh ? "\u603B\u8BA1" : "TOTAL"}</strong></span>
            <span />
            <span><strong>~$149</strong></span>
            <span className="bom-note">{isZh ? "\u4E0D\u542B3D\u6253\u5370\u673A" : "Excl. 3D printer"}</span>
          </div>
        </div>
      </FadeSection>

      {/* ── BUILD TIMELINE ── */}
      <FadeSection className="snake-section">
        <h2 className="snake-section-title"><FiClock size={18} /> {isZh ? "\u5EFA\u9020\u65F6\u95F4\u7EBF" : "Build Timeline"}</h2>
        <div className="snake-build-timeline">
          {TIMELINE_STEPS.map((s, i) => (
            <div key={i} className={`build-step ${s.status}`}>
              <div className="build-dot">
                {s.status === "current" ? <div className="build-pulse" /> : <FiCheckCircle size={14} />}
              </div>
              <div className="build-info">
                <strong>{isZh ? s.zh : s.en}</strong>
                <span>{s.months} 2026</span>
              </div>
              {s.status === "current" && (
                <span className="build-badge">{isZh ? "\u5F53\u524D" : "In Progress"}</span>
              )}
              {i < TIMELINE_STEPS.length - 1 && <div className="build-line" />}
            </div>
          ))}
        </div>
      </FadeSection>

      {/* ── FIELD TEST PLAN ── */}
      <FadeSection className="snake-section">
        <h2 className="snake-section-title">
          {isZh ? "\u5B9E\u5730\u6D4B\u8BD5\u8BA1\u5212 \u2014 2026\u5E74\u590F\u5B63" : "Field Test Plan \u2014 Summer 2026"}
        </h2>
        <div className="field-test-grid">
          {FIELD_TESTS.map((t, i) => (
            <div key={i} className="field-test-card">
              <span className="ft-num">Test {i + 1}</span>
              <strong>{isZh ? t.zh : t.en}</strong>
              <p>{isZh ? t.descZh : t.descEn}</p>
            </div>
          ))}
        </div>
      </FadeSection>

      {/* ── FIELD FOOTAGE PLACEHOLDER ── */}
      <FadeSection className="snake-section">
        <h2 className="snake-section-title">
          {isZh ? "\u5B9E\u5730\u6D4B\u8BD5\u7ED3\u679C" : "Field Test Results"}
        </h2>
        <div className="footage-placeholder">
          <FiCamera size={32} />
          <strong>{isZh ? "2026\u5E74\u590F\u5B63\u66F4\u65B0" : "Coming Summer 2026"}</strong>
          <p>{isZh ? "\u5B9E\u5730\u6D4B\u8BD5\u89C6\u9891\u3001\u7167\u7247\u548C\u6570\u636E\u5C06\u5728\u8FD9\u91CC\u5C55\u793A" : "Field test footage, photos, and data will appear here after the Taklimakan expedition"}</p>
        </div>
      </FadeSection>

      {/* ── STATUS ── */}
      <FadeSection className="snake-section snake-status-section">
        <div className="snake-status-card">
          <FiAlertCircle size={18} style={{ color: "#ffa726" }} />
          <div>
            <strong>{isZh ? "\u9879\u76EE\u72B6\u6001\uFF1A\u8BBE\u8BA1\u9636\u6BB5" : "Status: Design Phase"}</strong>
            <p>
              {isZh
                ? "\u539F\u578B\u673A\u6B63\u5728\u8BBE\u8BA1\u4E2D\u3002\u8BA1\u52122026\u5E74\u590F\u5B63\u5728\u5854\u514B\u62C9\u739B\u5E72\u6C99\u6F20\u8FDB\u884C\u5B9E\u5730\u6D4B\u8BD5\u3002"
                : "Prototype currently in design. Field testing planned for summer 2026 at the Taklimakan Desert."}
            </p>
          </div>
        </div>
      </FadeSection>
    </div>
  );
}
