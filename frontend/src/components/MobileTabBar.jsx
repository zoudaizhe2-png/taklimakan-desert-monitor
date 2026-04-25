import { useEffect, useRef, useState } from "react";
import {
  FiHome, FiMap, FiInbox, FiTarget, FiMoreHorizontal,
  FiActivity, FiClock, FiGlobe, FiFolder, FiCompass,
  FiFileText, FiGift, FiX,
} from "react-icons/fi";
import SnakeIcon from "./icons/SnakeIcon";
import { useLanguage } from "../i18n/LanguageContext";
import "./MobileTabBar.css";

/* ─────────────────────────────────────────────────────────────────
 * MobileTabBar (Phase 5b)
 * Replaces Sidebar on screens <= 720px. 4 primary entries + a
 * "More" button that slides up a sheet listing the other views.
 * ───────────────────────────────────────────────────────────────── */

const PRIMARY = [
  { id: "home",      icon: FiHome,   labelKey: "mtb_home" },
  { id: "map",       icon: FiMap,    labelKey: "mtb_map" },
  { id: "decisions", icon: FiInbox,  labelKey: "mtb_decide" },
  { id: "vision",    icon: FiTarget, labelKey: "mtb_vision" },
];

const PRIMARY_IDS = new Set(PRIMARY.map((p) => p.id));

/* ID → icon for the More drawer. Mirrors Sidebar's icon choices so
 * users see the same glyph in both surfaces. */
const DRAWER_ICONS = {
  monitor:    { icon: FiActivity,    labelKey: "viewMonitor" },
  timeline:   { icon: FiClock,       labelKey: "viewTimeline" },
  playground: { icon: FiGlobe,       labelKey: "viewPlayground" },
  projects:   { icon: FiFolder,      labelKey: "viewProjects" },
  snake:      { icon: SnakeIcon,     labelKey: "viewSnake" },
  research:   { icon: FiCompass,     labelKey: "viewResearch" },
  news:       { icon: FiFileText,    labelKey: "viewNews" },
  donate:     { icon: FiGift,        labelKey: "viewDonate" },
};

const DRAWER_ORDER = [
  "monitor", "timeline", "playground", "projects",
  "snake", "research", "news", "donate",
];

export default function MobileTabBar({ activeView, onViewChange }) {
  const { t } = useLanguage();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef(null);
  const previouslyFocused = useRef(null);

  const moreActive = !PRIMARY_IDS.has(activeView);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    previouslyFocused.current = document.activeElement;
    drawerRef.current?.focus();
    function onKey(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setDrawerOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previouslyFocused.current?.focus?.();
    };
  }, [drawerOpen]);

  // Auto-close drawer when the active view changes (after a tap inside it).
  useEffect(() => {
    if (drawerOpen) setDrawerOpen(false);
    // We intentionally only react to activeView, not drawerOpen, so that
    // opening the drawer doesn't immediately close it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);

  const handleSelect = (id) => {
    onViewChange(id);
    setDrawerOpen(false);
  };

  return (
    <>
      <nav
        className="mtb"
        role="tablist"
        aria-label="Mobile primary navigation"
      >
        {PRIMARY.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "page" : undefined}
              className={`mtb-tab ${isActive ? "active" : ""}`}
              onClick={() => handleSelect(item.id)}
            >
              <Icon size={20} aria-hidden="true" />
              <span className="mtb-label">{t(item.labelKey)}</span>
            </button>
          );
        })}
        <button
          type="button"
          role="tab"
          aria-selected={moreActive}
          aria-haspopup="dialog"
          aria-expanded={drawerOpen}
          aria-controls="mtb-drawer"
          className={`mtb-tab mtb-more ${moreActive ? "active" : ""}`}
          onClick={() => setDrawerOpen((v) => !v)}
        >
          <FiMoreHorizontal size={20} aria-hidden="true" />
          <span className="mtb-label">{t("mtb_more")}</span>
        </button>
      </nav>

      {drawerOpen && (
        <div
          className="mtb-drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        id="mtb-drawer"
        ref={drawerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mtb-drawer-title"
        className={`mtb-drawer ${drawerOpen ? "open" : ""}`}
      >
        <header className="mtb-drawer-head">
          <h2 id="mtb-drawer-title">{t("mtb_drawer_title")}</h2>
          <button
            type="button"
            className="mtb-drawer-close"
            aria-label={t("mtb_drawer_close")}
            onClick={() => setDrawerOpen(false)}
          >
            <FiX size={18} />
          </button>
        </header>
        <ul className="mtb-drawer-list" role="menu">
          {DRAWER_ORDER.map((id) => {
            const cfg = DRAWER_ICONS[id];
            if (!cfg) return null;
            const Icon = cfg.icon;
            const isActive = activeView === id;
            return (
              <li key={id} role="none">
                <button
                  type="button"
                  role="menuitem"
                  className={`mtb-drawer-item ${isActive ? "active" : ""}`}
                  onClick={() => handleSelect(id)}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{t(cfg.labelKey)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>
    </>
  );
}
