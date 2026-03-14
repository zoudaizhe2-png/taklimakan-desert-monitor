import { useState, useEffect } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { fetchDashboard } from "../api/client";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from "recharts";
import { FiTrendingUp, FiTrendingDown } from "react-icons/fi";
import { SatelliteBeforeAfter } from "./SatellitePhoto";

// Demo data generators
function generateCoverageData() {
  const data = [];
  let val = 8200;
  for (let y = 2000; y <= 2025; y++) {
    val += 300 + Math.random() * 200 + (y > 2015 ? 200 : 0);
    data.push({ year: y, area: Math.round(val) });
  }
  return data;
}

function generateRegionalData(base, trend) {
  const data = [];
  let v = base;
  for (let y = 2015; y <= 2025; y++) {
    v += trend + (Math.random() - 0.4) * 0.01;
    data.push({ year: y, ndvi: parseFloat(v.toFixed(3)) });
  }
  return data;
}

const REGIONS = [
  { key: "north", base: 0.22, trend: 0.009 },
  { key: "south", base: 0.15, trend: 0.006 },
  { key: "east", base: 0.12, trend: 0.004 },
  { key: "west", base: 0.18, trend: 0.007 },
];

const PROJECT_HEALTH = [
  { id: 1, nameKey: "projectHighway", status: "complete", progress: 1.0, health: "green" },
  { id: 2, nameKey: "projectThreeNorth", status: "active", progress: 0.72, health: "green" },
  { id: 3, nameKey: "projectWaterDiv", status: "active", progress: 0.55, health: "yellow" },
  { id: 4, nameKey: "projectEncircle", status: "active", progress: 0.85, health: "green" },
];

function MetricCard({ value, label, trend, color }) {
  const isUp = trend >= 0;
  return (
    <div className="dash-metric-card">
      <div className="dash-metric-value" style={{ color }}>{value}</div>
      <div className="dash-metric-label">{label}</div>
      {trend !== undefined && (
        <div className={`dash-metric-trend ${isUp ? "up" : "down"}`}>
          {isUp ? <FiTrendingUp size={14} /> : <FiTrendingDown size={14} />}
          <span>{isUp ? "+" : ""}{trend}%</span>
        </div>
      )}
    </div>
  );
}

function MiniProgressRing({ progress, size = 36, color = "#1a9850" }) {
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress);
  return (
    <svg width={size} height={size} className="mini-progress-ring">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2a2a4a" strokeWidth={3} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

export default function DashboardView() {
  const { t } = useLanguage();
  const [dashboard, setDashboard] = useState(null);
  const [coverageData] = useState(generateCoverageData);
  const [regionalData] = useState(() =>
    REGIONS.reduce((acc, r) => ({ ...acc, [r.key]: generateRegionalData(r.base, r.trend) }), {})
  );

  useEffect(() => {
    fetchDashboard().then(setDashboard).catch(() => {});
  }, []);

  const healthColor = { green: "#1a9850", yellow: "#e0a030", red: "#d73027" };
  const statusLabel = { active: t("statusActive"), complete: t("statusComplete"), "at-risk": t("statusAtRisk") };

  return (
    <div className="dashboard-view">
      {/* Hero: Before/After satellite comparison */}
      <div className="dash-hero">
        <div className="dash-hero-text">
          <h3>{t("dashHeroTitle")}</h3>
          <p>{t("dashHeroDesc")}</p>
        </div>
        <SatelliteBeforeAfter
          bounds={[79.5, 36.8, 80.5, 37.5]}
          yearBefore={2017}
          yearAfter={2024}
          band="truecolor"
          width={800}
        />
      </div>

      {/* Top metrics */}
      <div className="dash-metrics-row">
        <MetricCard
          value={dashboard ? `${(dashboard.total_green_area_sqkm / 1000).toFixed(1)}k` : "--"}
          label={t("totalGreenArea") + " (km²)"}
          trend={dashboard?.yoy_green_change_pct}
          color="#91cf60"
        />
        <MetricCard
          value={dashboard ? `${(dashboard.total_desert_area_sqkm / 1000).toFixed(0)}k` : "--"}
          label={t("totalDesertArea") + " (km²)"}
          trend={-0.1}
          color="#e8c87a"
        />
        <MetricCard
          value={dashboard ? `+${dashboard.yoy_green_change_pct}%` : "--"}
          label={t("yoyChange")}
          trend={dashboard?.yoy_green_change_pct}
          color="#4a90d9"
        />
        <MetricCard
          value={dashboard ? `${dashboard.trees_planted_billions}B` : "--"}
          label={t("treesPlanted")}
          trend={5.2}
          color="#1a9850"
        />
      </div>

      {/* Main area chart */}
      <div className="dash-chart-card">
        <h3>{t("greenCoverageOverTime")}</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={coverageData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
            <XAxis dataKey="year" stroke="#6a6a8a" fontSize={11} />
            <YAxis stroke="#6a6a8a" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 8, color: "#e0e0e0" }}
            />
            <defs>
              <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1a9850" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#1a9850" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="area" stroke="#1a9850" strokeWidth={2} fill="url(#greenGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Regional breakdown */}
      <div className="dash-regional-row">
        {REGIONS.map((r) => (
          <div key={r.key} className="dash-regional-card">
            <h4>{t(`belt_${r.key}`)}</h4>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={regionalData[r.key]}>
                <XAxis dataKey="year" tick={false} stroke="#2a2a4a" />
                <YAxis domain={[0, 0.4]} tick={false} stroke="#2a2a4a" />
                <Line type="monotone" dataKey="ndvi" stroke="#91cf60" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      {/* Project health grid */}
      <div className="dash-projects-section">
        <h3>{t("projectHealth")}</h3>
        <div className="dash-projects-grid">
          {PROJECT_HEALTH.map((p) => (
            <div key={p.id} className="dash-project-card">
              <div className="dash-project-top">
                <MiniProgressRing progress={p.progress} color={healthColor[p.health]} />
                <div className="dash-project-info">
                  <span className="dash-project-name">{t(p.nameKey)}</span>
                  <span className={`dash-project-status ${p.health}`}>
                    {statusLabel[p.status] || p.status}
                  </span>
                </div>
              </div>
              <div className="dash-project-pct">{Math.round(p.progress * 100)}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
