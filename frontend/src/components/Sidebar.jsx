import { useLanguage } from "../i18n/LanguageContext";
import { FiMap, FiActivity, FiFolder, FiClock, FiHeart, FiCpu, FiGift, FiGlobe } from "react-icons/fi";
import "./Sidebar.css";

const VIEWS = [
  { id: "mission", icon: FiHeart, labelKey: "viewMission" },
  { id: "map", icon: FiMap, labelKey: "viewMap" },
  { id: "monitor", icon: FiActivity, labelKey: "viewMonitor" },
  { id: "playground", icon: FiGlobe, labelKey: "viewPlayground" },
  { id: "projects", icon: FiFolder, labelKey: "viewProjects" },
  { id: "snake", icon: FiCpu, labelKey: "viewSnake" },
  { id: "donate", icon: FiGift, labelKey: "viewDonate" },
  { id: "timeline", icon: FiClock, labelKey: "viewTimeline" },
];

export default function Sidebar({ activeView, onViewChange }) {
  const { t } = useLanguage();
  return (
    <nav className="sidebar">
      {VIEWS.map((v) => {
        const Icon = v.icon;
        return (
          <button
            key={v.id}
            className={`sidebar-icon ${activeView === v.id ? "active" : ""}`}
            onClick={() => onViewChange(v.id)}
          >
            <Icon size={20} />
            <span className="sidebar-tooltip">{t(v.labelKey)}</span>
          </button>
        );
      })}
      <div className="sidebar-spacer" />
    </nav>
  );
}
