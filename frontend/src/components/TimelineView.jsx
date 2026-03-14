import { useLanguage } from "../i18n/LanguageContext";

const MILESTONES_DATA = [
  {
    year: 1978,
    titleKey: "tl_threeNorth",
    descKey: "tl_threeNorthDesc",
    icon: "🌲",
    color: "#1a9850",
  },
  {
    year: 1995,
    titleKey: "tl_shelterbelts",
    descKey: "tl_shelterbeltsDesc",
    icon: "🌿",
    color: "#91cf60",
  },
  {
    year: 2003,
    titleKey: "tl_highway",
    descKey: "tl_highwayDesc",
    icon: "🛣️",
    color: "#4a90d9",
  },
  {
    year: 2005,
    titleKey: "tl_waterDiv",
    descKey: "tl_waterDivDesc",
    icon: "💧",
    color: "#2da0c3",
  },
  {
    year: 2010,
    titleKey: "tl_expansion",
    descKey: "tl_expansionDesc",
    icon: "📈",
    color: "#e0a030",
  },
  {
    year: 2024,
    titleKey: "tl_gapClosed",
    descKey: "tl_gapClosedDesc",
    icon: "🎉",
    color: "#1a6b35",
  },
];

export default function TimelineView({ onNavigateToProject }) {
  const { t } = useLanguage();

  return (
    <div className="timeline-view">
      <h2>{t("viewTimeline")}</h2>
      <p className="timeline-subtitle">{t("timelineSubtitle")}</p>

      <div className="timeline-track-container">
        <div className="timeline-track-line" />
        <div className="timeline-cards">
          {MILESTONES_DATA.map((m, i) => (
            <div
              key={m.year}
              className={`timeline-card ${i % 2 === 0 ? "above" : "below"}`}
              onClick={() => onNavigateToProject && onNavigateToProject(m.year)}
            >
              <div className="timeline-dot" style={{ background: m.color }} />
              <div className="timeline-card-content" style={{ borderTopColor: m.color }}>
                <div className="timeline-card-icon">{m.icon}</div>
                <div className="timeline-card-year">{m.year}</div>
                <h3 className="timeline-card-title">{t(m.titleKey)}</h3>
                <p className="timeline-card-desc">{t(m.descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
