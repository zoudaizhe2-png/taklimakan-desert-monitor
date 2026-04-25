import { useState, useMemo } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import {
  FiCompass,
  FiRadio,
  FiCpu,
  FiActivity,
  FiArrowRight,
  FiLock,
  FiUsers,
  FiBriefcase,
  FiBookOpen,
  FiHeart,
  FiChevronDown,
  FiExternalLink,
  FiCheck,
  FiX,
} from "react-icons/fi";
import FadeSection from "./FadeSection";
import "./VisionView.css";

/* ────────────────────────────────────────────────────────────────────
 * Static data — keys reference translations.js
 * ──────────────────────────────────────────────────────────────────── */

const LAYERS = [
  {
    id: "L1",
    icon: FiRadio,
    color: "var(--accent-blue)",
    titleKey: "vision_l1_title",
    statusKey: "vision_l1_status",
    statusType: "partial",
    descKey: "vision_l1_desc",
    nowKey: "vision_l1_now",
    nextKey: "vision_l1_next",
  },
  {
    id: "L3",
    icon: FiCpu,
    color: "var(--accent-orange)",
    titleKey: "vision_l3_title",
    statusKey: "vision_l3_status",
    statusType: "build",
    descKey: "vision_l3_desc",
    nowKey: "vision_l3_now",
    nextKey: "vision_l3_next",
  },
  {
    id: "L2",
    icon: FiActivity,
    color: "var(--accent-green-bright)",
    titleKey: "vision_l2_title",
    statusKey: "vision_l2_status",
    statusType: "concept",
    descKey: "vision_l2_desc",
    nowKey: "vision_l2_now",
    nextKey: "vision_l2_next",
  },
];

const PHASES = [
  {
    id: "A",
    titleKey: "vision_phaseA_title",
    windowKey: "vision_phaseA_window",
    descKey: "vision_phaseA_desc",
    canKey: "vision_phaseA_can",
    wontKey: "vision_phaseA_wont",
    color: "var(--accent-green-bright)",
    current: true,
  },
  {
    id: "B",
    titleKey: "vision_phaseB_title",
    windowKey: "vision_phaseB_window",
    descKey: "vision_phaseB_desc",
    canKey: "vision_phaseB_can",
    wontKey: "vision_phaseB_wont",
    color: "var(--accent-blue)",
    current: false,
  },
  {
    id: "C",
    titleKey: "vision_phaseC_title",
    windowKey: "vision_phaseC_window",
    descKey: "vision_phaseC_desc",
    canKey: "vision_phaseC_can",
    wontKey: "vision_phaseC_wont",
    color: "var(--accent-orange)",
    current: false,
  },
];

const PERSONAS = [
  {
    id: "A",
    icon: FiBriefcase,
    color: "var(--accent-orange)",
    nameKey: "vision_personaA_name",
    tagKey: "vision_personaA_tag",
    painKey: "vision_personaA_pain",
    helpKey: "vision_personaA_help",
    coverageKey: "vision_personaA_coverage",
    coverageLevel: 80,
  },
  {
    id: "B",
    icon: FiBookOpen,
    color: "var(--accent-blue)",
    nameKey: "vision_personaB_name",
    tagKey: "vision_personaB_tag",
    painKey: "vision_personaB_pain",
    helpKey: "vision_personaB_help",
    coverageKey: "vision_personaB_coverage",
    coverageLevel: 25,
  },
  {
    id: "C",
    icon: FiHeart,
    color: "var(--accent-green-bright)",
    nameKey: "vision_personaC_name",
    tagKey: "vision_personaC_tag",
    painKey: "vision_personaC_pain",
    helpKey: "vision_personaC_help",
    coverageKey: "vision_personaC_coverage",
    coverageLevel: 50,
  },
];

const ACTION_GROUPS = [
  {
    id: "plant",
    emoji: "🌱",
    color: "#66bb6a",
    titleKey: "vision_actionsPlant_title",
    countKey: "vision_actionsPlant_count",
    actions: [
      { code: "PLANT_HALOXYLON", nameKey: "vision_action_haloxylon_name", triggerKey: "vision_action_haloxylon_trigger", outputKey: "vision_action_haloxylon_output", approvalKey: "vision_action_haloxylon_approval" },
      { code: "PLANT_TAMARIX", nameKey: "vision_action_tamarix_name", triggerKey: "vision_action_tamarix_trigger", outputKey: "vision_action_tamarix_output", approvalKey: "vision_action_tamarix_approval" },
      { code: "PLANT_CALLIGONUM", nameKey: "vision_action_calligonum_name", triggerKey: "vision_action_calligonum_trigger", outputKey: "vision_action_calligonum_output", approvalKey: "vision_action_calligonum_approval" },
      { code: "PLANT_POPULUS", nameKey: "vision_action_populus_name", triggerKey: "vision_action_populus_trigger", outputKey: "vision_action_populus_output", approvalKey: "vision_action_populus_approval" },
      { code: "PLANT_HEDYSARUM", nameKey: "vision_action_hedysarum_name", triggerKey: "vision_action_hedysarum_trigger", outputKey: "vision_action_hedysarum_output", approvalKey: "vision_action_hedysarum_approval" },
      { code: "PLANT_MIXED_COMMUNITY", nameKey: "vision_action_mixed_name", triggerKey: "vision_action_mixed_trigger", outputKey: "vision_action_mixed_output", approvalKey: "vision_action_mixed_approval" },
    ],
  },
  {
    id: "water",
    emoji: "💧",
    color: "#4fc3f7",
    titleKey: "vision_actionsWater_title",
    countKey: "vision_actionsWater_count",
    actions: [
      { code: "IRRIGATION_DRIP_PULSE", nameKey: "vision_action_drip_name", triggerKey: "vision_action_drip_trigger", outputKey: "vision_action_drip_output", approvalKey: "vision_action_drip_approval" },
      { code: "IRRIGATION_FLOOD_ECOLOGICAL", nameKey: "vision_action_flood_name", triggerKey: "vision_action_flood_trigger", outputKey: "vision_action_flood_output", approvalKey: "vision_action_flood_approval" },
      { code: "GROUNDWATER_CAUTION", nameKey: "vision_action_gwcaution_name", triggerKey: "vision_action_gwcaution_trigger", outputKey: "vision_action_gwcaution_output", approvalKey: "vision_action_gwcaution_approval" },
      { code: "IRRIGATION_SKIP", nameKey: "vision_action_skip_name", triggerKey: "vision_action_skip_trigger", outputKey: "vision_action_skip_output", approvalKey: "vision_action_skip_approval" },
    ],
  },
  {
    id: "inspect",
    emoji: "🔍",
    color: "#ffa726",
    titleKey: "vision_actionsInspect_title",
    countKey: "vision_actionsInspect_count",
    actions: [
      { code: "INSPECT_HUMAN", nameKey: "vision_action_human_name", triggerKey: "vision_action_human_trigger", outputKey: "vision_action_human_output", approvalKey: "vision_action_human_approval" },
      { code: "INSPECT_SNAKE_ROBOT", nameKey: "vision_action_snake_name", triggerKey: "vision_action_snake_trigger", outputKey: "vision_action_snake_output", approvalKey: "vision_action_snake_approval" },
      { code: "INSPECT_DRONE", nameKey: "vision_action_drone_name", triggerKey: "vision_action_drone_trigger", outputKey: "vision_action_drone_output", approvalKey: "vision_action_drone_approval" },
      { code: "INSPECT_SCHEDULED", nameKey: "vision_action_scheduled_name", triggerKey: "vision_action_scheduled_trigger", outputKey: "vision_action_scheduled_output", approvalKey: "vision_action_scheduled_approval" },
    ],
  },
  {
    id: "alert",
    emoji: "⚠️",
    color: "#ef5350",
    titleKey: "vision_actionsAlert_title",
    countKey: "vision_actionsAlert_count",
    actions: [
      { code: "ALERT_DUST_STORM", nameKey: "vision_action_dust_name", triggerKey: "vision_action_dust_trigger", outputKey: "vision_action_dust_output", approvalKey: "vision_action_dust_approval" },
      { code: "ALERT_HEAT_WAVE", nameKey: "vision_action_heat_name", triggerKey: "vision_action_heat_trigger", outputKey: "vision_action_heat_output", approvalKey: "vision_action_heat_approval" },
      { code: "ALERT_NDVI_DEGRADATION", nameKey: "vision_action_ndvi_name", triggerKey: "vision_action_ndvi_trigger", outputKey: "vision_action_ndvi_output", approvalKey: "vision_action_ndvi_approval" },
    ],
  },
];

const DOCS_URL =
  "https://github.com/zoudaizhe2-png/taklimakan-desert-monitor/blob/main/docs/L3-action-vocabulary.md";

/* ────────────────────────────────────────────────────────────────────
 * Closed-loop SVG (L1 → L3 → L2 → L1)
 * ──────────────────────────────────────────────────────────────────── */
function ClosedLoopDiagram({ ariaLabel }) {
  return (
    <svg
      className="vision-loop-svg"
      viewBox="0 0 600 180"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <marker id="vision-arrow-end" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 Z" fill="currentColor" />
        </marker>
      </defs>
      <path d="M 130 60 C 200 30, 280 30, 350 60" stroke="currentColor" strokeWidth="1.5" fill="none" markerEnd="url(#vision-arrow-end)" opacity="0.6" />
      <path d="M 380 60 C 440 30, 500 30, 560 60" stroke="currentColor" strokeWidth="1.5" fill="none" markerEnd="url(#vision-arrow-end)" opacity="0.6" />
      <path d="M 560 130 C 380 200, 220 200, 130 130" stroke="currentColor" strokeWidth="1.5" fill="none" strokeDasharray="4 4" markerEnd="url(#vision-arrow-end)" opacity="0.4" />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Main view
 * ──────────────────────────────────────────────────────────────────── */
export default function VisionView({ onNavigate }) {
  const { t } = useLanguage();
  const [openGroup, setOpenGroup] = useState("plant");
  const [activeAction, setActiveAction] = useState(null);

  const loop = useMemo(() => <ClosedLoopDiagram ariaLabel={t("vision_loop_aria")} />, [t]);

  return (
    <div className="vision-page">
      {/* HERO */}
      <section className="vision-hero">
        <div className="vision-hero-inner">
          <div className="vision-hero-badge" aria-hidden="true">
            <FiCompass size={14} />
            <span>{t("vision_hero_badge")}</span>
          </div>
          <h1 className="vision-hero-title">{t("vision_hero_title")}</h1>
          <p className="vision-hero-sub">{t("vision_hero_sub")}</p>
          <div className="vision-hero-cta">
            <button type="button" className="vision-cta-primary" onClick={() => onNavigate?.("map")}>
              {t("vision_hero_cta_map")} <FiArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 1 — Three Layers */}
      <FadeSection className="vision-section">
        <h2 className="vision-section-title">{t("vision_layers_title")}</h2>
        <p className="vision-section-desc">{t("vision_layers_desc")}</p>

        <div className="vision-loop-wrapper" aria-hidden="true">{loop}</div>

        <div className="vision-layers-grid">
          {LAYERS.map((layer) => {
            const Icon = layer.icon;
            return (
              <article key={layer.id} className="vision-layer-card" style={{ "--layer-color": layer.color }}>
                <header className="vision-layer-head">
                  <div className="vision-layer-icon" aria-hidden="true" style={{ color: layer.color }}>
                    <Icon size={22} />
                  </div>
                  <div className="vision-layer-id">{layer.id}</div>
                  <span className={`vision-layer-status status-${layer.statusType}`}>{t(layer.statusKey)}</span>
                </header>
                <h3 className="vision-layer-name">{t(layer.titleKey)}</h3>
                <p className="vision-layer-desc">{t(layer.descKey)}</p>
                <dl className="vision-layer-meta">
                  <div>
                    <dt>{t("vision_layer_now")}</dt>
                    <dd>{t(layer.nowKey)}</dd>
                  </div>
                  <div>
                    <dt>{t("vision_layer_next")}</dt>
                    <dd>{t(layer.nextKey)}</dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      </FadeSection>

      {/* SECTION 2 — Autonomy Roadmap */}
      <FadeSection className="vision-section">
        <h2 className="vision-section-title">{t("vision_phases_title")}</h2>
        <p className="vision-section-desc">{t("vision_phases_desc")}</p>

        <ol className="vision-phases-rail" role="list">
          {PHASES.map((p, i) => (
            <li key={p.id} className={`vision-phase ${p.current ? "current" : ""}`} style={{ "--phase-color": p.color }}>
              <div className="vision-phase-head">
                <span className="vision-phase-letter" aria-hidden="true">{p.id.toLowerCase()}</span>
                <div className="vision-phase-titles">
                  <h3 className="vision-phase-title">{t(p.titleKey)}</h3>
                  <span className="vision-phase-window">{t(p.windowKey)}</span>
                </div>
                {p.current && (
                  <span className="vision-phase-now-badge">{t("vision_phase_currentBadge")}</span>
                )}
              </div>
              <p className="vision-phase-desc">{t(p.descKey)}</p>
              <div className="vision-phase-bullets">
                <div className="vision-phase-can">
                  <span className="vision-phase-label">
                    <FiCheck size={14} aria-hidden="true" />
                    {t("vision_phase_canDo")}
                  </span>
                  <p>{t(p.canKey)}</p>
                </div>
                <div className="vision-phase-wont">
                  <span className="vision-phase-label">
                    <FiX size={14} aria-hidden="true" />
                    {t("vision_phase_wontDo")}
                  </span>
                  <p>{t(p.wontKey)}</p>
                </div>
              </div>
              {i < PHASES.length - 1 && (
                <div className="vision-phase-arrow" aria-hidden="true">
                  <FiArrowRight size={18} />
                </div>
              )}
            </li>
          ))}
        </ol>

        <div className="vision-always-human" role="note">
          <FiLock size={16} aria-hidden="true" />
          <div>
            <strong>{t("vision_alwaysHuman_title")}</strong>
            <span>{t("vision_alwaysHuman_desc")}</span>
          </div>
        </div>
      </FadeSection>

      {/* SECTION 3 — Personas */}
      <FadeSection className="vision-section">
        <h2 className="vision-section-title">{t("vision_personas_title")}</h2>
        <p className="vision-section-desc">{t("vision_personas_desc")}</p>

        <div className="vision-personas-grid">
          {PERSONAS.map((p) => {
            const Icon = p.icon;
            return (
              <article key={p.id} className="vision-persona-card" style={{ "--persona-color": p.color }}>
                <header className="vision-persona-head">
                  <div className="vision-persona-icon" aria-hidden="true" style={{ color: p.color }}>
                    <Icon size={20} />
                  </div>
                  <div className="vision-persona-letter">{p.id}</div>
                </header>
                <h3 className="vision-persona-name">{t(p.nameKey)}</h3>
                <span className="vision-persona-tag">{t(p.tagKey)}</span>
                <dl className="vision-persona-meta">
                  <div>
                    <dt>{t("vision_persona_pain")}</dt>
                    <dd>{t(p.painKey)}</dd>
                  </div>
                  <div>
                    <dt>{t("vision_persona_help")}</dt>
                    <dd>{t(p.helpKey)}</dd>
                  </div>
                </dl>
                <div className="vision-persona-coverage">
                  <div className="vision-persona-coverage-head">
                    <span>{t("vision_persona_coverage")}</span>
                    <strong>{t(p.coverageKey)}</strong>
                  </div>
                  <div
                    className="vision-persona-bar"
                    role="progressbar"
                    aria-valuenow={p.coverageLevel}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${t(p.nameKey)} — ${t("vision_persona_coverage")}`}
                  >
                    <div className="vision-persona-bar-fill" style={{ width: `${p.coverageLevel}%`, background: p.color }} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </FadeSection>

      {/* SECTION 4 — 17 Action Vocabulary */}
      <FadeSection className="vision-section">
        <h2 className="vision-section-title">{t("vision_actions_title")}</h2>
        <p className="vision-section-desc">{t("vision_actions_desc")}</p>

        <div className="vision-actions-stack">
          {ACTION_GROUPS.map((g) => {
            const isOpen = openGroup === g.id;
            return (
              <div key={g.id} className={`vision-action-group ${isOpen ? "open" : ""}`} style={{ "--group-color": g.color }}>
                <button
                  type="button"
                  className="vision-action-group-head"
                  aria-expanded={isOpen}
                  aria-controls={`vision-actions-${g.id}`}
                  onClick={() => {
                    setOpenGroup(isOpen ? null : g.id);
                    setActiveAction(null);
                  }}
                >
                  <span className="vision-action-emoji" aria-hidden="true">{g.emoji}</span>
                  <span className="vision-action-group-title">{t(g.titleKey)}</span>
                  <span className="vision-action-group-count">{t(g.countKey)}</span>
                  <FiChevronDown className="vision-action-chevron" size={18} aria-hidden="true" />
                </button>

                {isOpen && (
                  <div id={`vision-actions-${g.id}`} className="vision-action-list">
                    {g.actions.map((a) => {
                      const expanded = activeAction === a.code;
                      return (
                        <div key={a.code} className={`vision-action-item ${expanded ? "expanded" : ""}`}>
                          <button
                            type="button"
                            className="vision-action-row"
                            aria-expanded={expanded}
                            onClick={() => setActiveAction(expanded ? null : a.code)}
                          >
                            <code className="vision-action-code">{a.code}</code>
                            <span className="vision-action-name">{t(a.nameKey)}</span>
                            <FiChevronDown className="vision-action-chevron-small" size={14} aria-hidden="true" />
                          </button>
                          {expanded && (
                            <dl className="vision-action-detail">
                              <div>
                                <dt>{t("vision_action_trigger")}</dt>
                                <dd>{t(a.triggerKey)}</dd>
                              </div>
                              <div>
                                <dt>{t("vision_action_output")}</dt>
                                <dd>{t(a.outputKey)}</dd>
                              </div>
                              <div>
                                <dt>{t("vision_action_approval")}</dt>
                                <dd>{t(a.approvalKey)}</dd>
                              </div>
                            </dl>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="vision-actions-note">
          {t("vision_actions_note_prefix")}{" "}
          <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" className="vision-actions-link">
            docs/L3-action-vocabulary.md
            <FiExternalLink size={12} aria-hidden="true" />
          </a>
        </p>
      </FadeSection>

      {/* SECTION 5 — Why */}
      <FadeSection className="vision-section vision-why">
        <h2 className="vision-section-title">{t("vision_why_title")}</h2>
        <p className="vision-why-body">{t("vision_why_body")}</p>
        <div className="vision-why-cta">
          <button type="button" className="vision-cta-primary" onClick={() => onNavigate?.("map")}>
            {t("vision_why_cta")} <FiArrowRight size={16} />
          </button>
        </div>
      </FadeSection>

      <footer className="vision-footer" role="contentinfo">
        <FiUsers size={12} aria-hidden="true" />
        <span>{t("vision_footer")}</span>
      </footer>
    </div>
  );
}
