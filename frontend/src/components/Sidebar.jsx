import { useLanguage } from "../i18n/LanguageContext";
import {
  FiMap, FiActivity, FiFolder, FiClock, FiHome, FiGift, FiGlobe,
  FiFileText, FiSun, FiCompass, FiTarget, FiInbox,
} from "react-icons/fi";
import SnakeIcon from "./icons/SnakeIcon";
import "./Sidebar.css";

/* ─────────────────────────────────────────────────────────────────
 * IA grouping (Phase 5b): 5 sections aligned to the closed-loop
 * narrative — Story / Sense (L1) / Decide (L3) / Act (L2) / Support.
 * Order matters; each group's items render under a small heading.
 * ───────────────────────────────────────────────────────────────── */
const GROUPS = [
  {
    id: "story",
    labelKey: "groupStory",
    items: [
      { id: "home", icon: FiHome, labelKey: "viewHome" },
      { id: "vision", icon: FiTarget, labelKey: "viewVision" },
      { id: "news", icon: FiFileText, labelKey: "viewNews" },
    ],
  },
  {
    id: "sense",
    labelKey: "groupSense",
    items: [
      { id: "map", icon: FiMap, labelKey: "viewMap" },
      { id: "monitor", icon: FiActivity, labelKey: "viewMonitor" },
      { id: "timeline", icon: FiClock, labelKey: "viewTimeline" },
      { id: "playground", icon: FiGlobe, labelKey: "viewPlayground" },
    ],
  },
  {
    id: "decide",
    labelKey: "groupDecide",
    items: [
      { id: "decisions", icon: FiInbox, labelKey: "viewDecisions" },
      { id: "projects", icon: FiFolder, labelKey: "viewProjects" },
    ],
  },
  {
    id: "act",
    labelKey: "groupAct",
    items: [
      { id: "snake", icon: SnakeIcon, labelKey: "viewSnake" },
      { id: "research", icon: FiCompass, labelKey: "viewResearch" },
    ],
  },
  {
    id: "support",
    labelKey: "groupSupport",
    items: [
      { id: "donate", icon: FiGift, labelKey: "viewDonate" },
    ],
  },
];

export default function Sidebar({ activeView, onViewChange }) {
  const { t } = useLanguage();

  const renderButton = (v) => {
    const Icon = v.icon;
    return (
      <button
        key={v.id}
        className={`sidebar-icon ${activeView === v.id ? "active" : ""}`}
        onClick={() => onViewChange(v.id)}
        aria-current={activeView === v.id ? "page" : undefined}
        aria-label={t(v.labelKey)}
      >
        <Icon size={20} />
        <span className="sidebar-tooltip">{t(v.labelKey)}</span>
      </button>
    );
  };

  return (
    <nav className="sidebar" role="navigation" aria-label="Main navigation">
      <div className="sidebar-brand">
        <FiSun size={16} />
      </div>
      {GROUPS.map((g) => (
        <div key={g.id} className={`sidebar-group sidebar-group-${g.id}`}>
          <span
            className="sidebar-group-label"
            role="presentation"
            aria-hidden="true"
          >
            {t(g.labelKey)}
          </span>
          {g.items.map(renderButton)}
        </div>
      ))}
      <div className="sidebar-spacer" />
    </nav>
  );
}
