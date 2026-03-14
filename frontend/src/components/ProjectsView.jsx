import { useState, useMemo } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { FiSearch, FiArrowUp, FiArrowDown } from "react-icons/fi";

const HEALTH_COLOR = { good: "#1a9850", moderate: "#e0a030", poor: "#d73027" };

function getHealth(feature) {
  if (feature.category === "project") {
    const area = feature.stats?.area_sqkm || feature.stats?.length_km || 100;
    if (area > 300) return "good";
    if (area > 100) return "moderate";
    return "poor";
  }
  if (feature.category === "vegetation") return "good";
  return "moderate";
}

function getProgress(feature) {
  if (feature.stats?.planted) {
    const start = parseInt(feature.stats.planted);
    if (!isNaN(start)) {
      return Math.min(1, (2025 - start) / 30);
    }
  }
  return 0.5;
}

export default function ProjectsView({ features, onSelectFeature }) {
  const { lang, t } = useLanguage();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  const projectFeatures = useMemo(() => {
    return features.filter(
      (f) => f.category === "project" || f.category === "vegetation"
    );
  }, [features]);

  const filtered = useMemo(() => {
    let list = projectFeatures;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (f) =>
          f.name_en.toLowerCase().includes(q) ||
          f.name_zh.includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      let va, vb;
      if (sortKey === "name") {
        va = lang === "zh" ? a.name_zh : a.name_en;
        vb = lang === "zh" ? b.name_zh : b.name_en;
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      if (sortKey === "area") {
        va = a.stats?.area_sqkm || 0;
        vb = b.stats?.area_sqkm || 0;
      }
      if (sortKey === "status") {
        va = a.category;
        vb = b.category;
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      if (sortKey === "progress") {
        va = getProgress(a);
        vb = getProgress(b);
      }
      return sortDir === "asc" ? (va || 0) - (vb || 0) : (vb || 0) - (va || 0);
    });
    return list;
  }, [projectFeatures, search, sortKey, sortDir, lang]);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const SortIcon = sortDir === "asc" ? FiArrowUp : FiArrowDown;

  return (
    <div className="projects-view">
      <div className="projects-header">
        <h2>{t("viewProjects")}</h2>
        <div className="projects-search">
          <FiSearch size={14} />
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="projects-table">
        <div className="projects-table-header">
          <div className="pt-cell pt-name" onClick={() => handleSort("name")}>
            {t("projectName")} {sortKey === "name" && <SortIcon size={12} />}
          </div>
          <div className="pt-cell pt-status" onClick={() => handleSort("status")}>
            {t("statusLabel")} {sortKey === "status" && <SortIcon size={12} />}
          </div>
          <div className="pt-cell pt-area" onClick={() => handleSort("area")}>
            {t("area")} (km²) {sortKey === "area" && <SortIcon size={12} />}
          </div>
          <div className="pt-cell pt-progress" onClick={() => handleSort("progress")}>
            {t("progressLabel")} {sortKey === "progress" && <SortIcon size={12} />}
          </div>
          <div className="pt-cell pt-health">
            {t("healthLabel")}
          </div>
        </div>

        {filtered.map((f) => {
          const name = lang === "zh" ? f.name_zh : f.name_en;
          const health = getHealth(f);
          const progress = getProgress(f);
          const area = f.stats?.area_sqkm || f.stats?.length_km || "--";
          return (
            <div
              key={f.id}
              className="projects-table-row"
              onClick={() => onSelectFeature(f)}
            >
              <div className="pt-cell pt-name">{name}</div>
              <div className="pt-cell pt-status">
                <span className={`status-badge ${f.category}`}>
                  {t(f.category)}
                </span>
              </div>
              <div className="pt-cell pt-area">{typeof area === "number" ? area.toLocaleString() : area}</div>
              <div className="pt-cell pt-progress">
                <div className="progress-bar-bg">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${progress * 100}%`, background: progress >= 1 ? "#1a9850" : "#4a90d9" }}
                  />
                </div>
                <span className="progress-text">{Math.round(progress * 100)}%</span>
              </div>
              <div className="pt-cell pt-health">
                <span className="health-dot" style={{ background: HEALTH_COLOR[health] }} />
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="projects-empty">{t("noResults")}</div>
        )}
      </div>
    </div>
  );
}
