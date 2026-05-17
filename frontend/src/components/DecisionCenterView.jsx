import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiInbox,
  FiRefreshCw,
  FiCheck,
  FiX,
  FiClock,
  FiSkipForward,
  FiPlayCircle,
  FiAlertTriangle,
  FiChevronDown,
  FiExternalLink,
  FiInfo,
  FiMapPin,
  FiX as FiClose,
} from "react-icons/fi";
import { useLanguage } from "../i18n/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchRecommendations,
  fetchActionCatalog,
  decideRecommendation,
  evaluateRegion,
  ApiError,
} from "../api/client";
import LoadingState from "./states/LoadingState";
import ErrorState from "./states/ErrorState";
import EmptyState from "./states/EmptyState";
import "./DecisionCenterView.css";

/* ────────────────────────────────────────────────────────────────────
 * Static filter definitions — labels resolved via t()
 * ──────────────────────────────────────────────────────────────────── */

const STATUS_FILTERS = [
  { id: "all", labelKey: "dc_status_all" },
  { id: "pending", labelKey: "dc_status_pending" },
  { id: "approved", labelKey: "dc_status_approved" },
  { id: "rejected", labelKey: "dc_status_rejected" },
  { id: "deferred", labelKey: "dc_status_deferred" },
  { id: "executed", labelKey: "dc_status_executed" },
  { id: "expired", labelKey: "dc_status_expired" },
];

const CATEGORY_FILTERS = [
  { id: "all", labelKey: "dc_cat_all", emoji: "" },
  { id: "planting", labelKey: "dc_cat_planting", emoji: "🌱" },
  { id: "irrigation", labelKey: "dc_cat_irrigation", emoji: "💧" },
  { id: "inspection", labelKey: "dc_cat_inspection", emoji: "🔍" },
  { id: "alert", labelKey: "dc_cat_alert", emoji: "⚠️" },
];

const APPROVAL_FILTERS = [
  { id: "all", labelKey: "dc_appr_all" },
  { id: "local", labelKey: "dc_appr_local" },
  { id: "project_office", labelKey: "dc_appr_project" },
  { id: "prefecture", labelKey: "dc_appr_prefecture" },
  { id: "regional", labelKey: "dc_appr_regional" },
];

const CATEGORY_META = {
  planting: { emoji: "🌱", color: "#66bb6a" },
  irrigation: { emoji: "💧", color: "#4fc3f7" },
  inspection: { emoji: "🔍", color: "#ffa726" },
  alert: { emoji: "⚠️", color: "#ef5350" },
};

const STATUS_META = {
  pending: { color: "var(--accent-blue)", icon: FiClock },
  approved: { color: "#66bb6a", icon: FiCheck },
  rejected: { color: "#ef5350", icon: FiX },
  deferred: { color: "#ffa726", icon: FiSkipForward },
  executed: { color: "#26a69a", icon: FiPlayCircle },
  expired: { color: "#9e9e9e", icon: FiAlertTriangle },
};

const DOCS_URL =
  "https://github.com/zoudaizhe2-png/taklimakan-desert-monitor/blob/main/docs/L3-action-vocabulary.md";

/* ────────────────────────────────────────────────────────────────────
 * Fallback demo recommendations — rendered when the backend API is
 * unreachable (this is a B2G demo deployment; the backend may be down).
 * Mirrors the 8 rows seeded in `backend/seed.py::_demo_recommendations`,
 * with the same institution-attributed feature_id strings so the UI
 * looks identical in both code paths.
 * ──────────────────────────────────────────────────────────────────── */

const NOW_MS = Date.now();
const hoursAgo = (h) => new Date(NOW_MS - h * 3600 * 1000).toISOString();
const daysAgo = (d) => new Date(NOW_MS - d * 86400 * 1000).toISOString();

const FALLBACK_RECOMMENDATIONS = [
  {
    id: -1,
    action_code: "PLANT_HALOXYLON",
    feature_id: "新疆林业和草原局 · 和田绿洲项目",
    trigger_data_snapshot: { ndvi: 0.12, annual_rainfall_mm: 80, soil_type: "sandy", elevation_m: 1300, ndvi_low_years: 4 },
    output_params: { density: 800, spacing_m: 4, region_area_hm2: 245.0 },
    confidence: 0.78,
    estimated_cost_yuan: 245.0 * 15000.0,
    eta_months: 36,
    approval_level: "project_office",
    status: "pending",
    engine_note: null,
    created_at: hoursAgo(2),
  },
  {
    id: -2,
    action_code: "ALERT_NDVI_DEGRADATION",
    feature_id: "新疆阿克苏地区林业局 · 阿拉尔防护林",
    trigger_data_snapshot: { ndvi: 0.13, ndvi_drop: 0.11, ndvi_drop_periods: 4, ndvi_low_months: 7 },
    output_params: {},
    confidence: 0.82,
    estimated_cost_yuan: null,
    eta_months: 0,
    approval_level: "local",
    status: "approved",
    engine_note: null,
    created_at: daysAgo(1),
    decided_at: hoursAgo(18),
    decision_notes: "Confirmed via Sentinel-2 review; dispatched drone survey.",
  },
  {
    id: -3,
    action_code: "INSPECT_SNAKE_ROBOT",
    feature_id: "新疆和田地区林草局 · 民丰防护林",
    trigger_data_snapshot: { ndvi: 0.08, ndvi_drop: 0.18, terrain: "sand_dune", slope_degrees: 22 },
    output_params: {},
    confidence: 0.55,
    estimated_cost_yuan: null,
    eta_months: 0,
    approval_level: "project_office",
    status: "rejected",
    engine_note: null,
    created_at: daysAgo(2),
    decided_at: hoursAgo(36),
    decision_notes: "Sandstorm forecast for next 72h — defer until visibility >5km.",
  },
  {
    id: -4,
    action_code: "IRRIGATION_DRIP_PULSE",
    feature_id: "新疆巴音郭楞自治州林业局 · 库尔勒绿洲边缘",
    trigger_data_snapshot: { soil_moisture_pct: 4.2, forecast_rainfall_mm_14d: 2, is_growth_season: true, has_drip: true },
    output_params: {},
    confidence: 0.85,
    estimated_cost_yuan: 32.0 * 550.0,
    eta_months: 0,
    approval_level: "local",
    status: "deferred",
    engine_note: null,
    created_at: hoursAgo(12),
    decided_at: hoursAgo(4),
    decision_notes: "Defer 48h — pump station maintenance in progress.",
  },
  {
    id: -5,
    action_code: "PLANT_TAMARIX",
    feature_id: "甘肃酒泉市林草局 · 河西走廊试点段",
    trigger_data_snapshot: { ndvi: 0.16, ndvi_low_years: 3 },
    output_params: {},
    confidence: 0.18,
    estimated_cost_yuan: 18.5 * 22500.0,
    eta_months: 12,
    approval_level: "project_office",
    status: "pending",
    engine_note: "awaiting L1 expansion: soil_moisture, groundwater_depth",
    created_at: hoursAgo(6),
  },
  {
    id: -6,
    action_code: "ALERT_DUST_STORM",
    feature_id: "内蒙古阿拉善盟林草局 · 巴丹吉林沙漠东缘",
    trigger_data_snapshot: { forecast_wind_m_per_s: 22, forecast_visibility_km: 0.6, season: "apr", has_young_seedlings: true },
    output_params: {},
    confidence: 0.88,
    estimated_cost_yuan: null,
    eta_months: 0,
    approval_level: "local",
    status: "executed",
    engine_note: null,
    created_at: daysAgo(3),
    decided_at: daysAgo(3),
    decision_notes: "Warning broadcast; drip + drone ops paused 72h; checkerboards reinforced.",
  },
  {
    id: -7,
    action_code: "INSPECT_DRONE",
    feature_id: "宁夏银川林草局 · 灵武白芨滩防护林",
    trigger_data_snapshot: { ndvi: 0.18, forecast_wind_m_per_s: 5, forecast_visibility_km: 12 },
    output_params: {},
    confidence: 0.81,
    estimated_cost_yuan: null,
    eta_months: 0,
    approval_level: "local",
    status: "pending",
    engine_note: null,
    created_at: hoursAgo(4),
  },
  {
    id: -8,
    action_code: "INSPECT_SCHEDULED",
    feature_id: "新疆林业和草原局 · 和田绿洲项目",
    trigger_data_snapshot: { days_since_last_inspection: 95, is_priority_zone: true },
    output_params: {},
    confidence: 0.90,
    estimated_cost_yuan: null,
    eta_months: 0,
    approval_level: "local",
    status: "expired",
    engine_note: null,
    created_at: daysAgo(45),
  },
];

/* ────────────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────────────── */

function confidenceColor(c) {
  if (c == null) return "var(--text-dim)";
  const pct = c * 100;
  if (pct < 40) return "#ef5350";
  if (pct < 70) return "#ffa726";
  return "#66bb6a";
}

function formatCurrency(value) {
  if (value == null) return "—";
  if (Math.abs(value) >= 10_000) {
    return `¥${(value / 10_000).toFixed(1)}万`;
  }
  return `¥${Math.round(value).toLocaleString()}`;
}

function categoryFromCode(code) {
  if (!code) return null;
  if (code.startsWith("PLANT")) return "planting";
  if (code.startsWith("IRRIGATION") || code.startsWith("GROUNDWATER")) return "irrigation";
  if (code.startsWith("INSPECT")) return "inspection";
  if (code.startsWith("ALERT")) return "alert";
  return null;
}

function safeJsonParse(value) {
  if (value == null) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/* ────────────────────────────────────────────────────────────────────
 * Decision modal — collects optional notes before POST
 * ──────────────────────────────────────────────────────────────────── */

function DecisionModal({ open, decision, recommendation, onConfirm, onClose, busy, error }) {
  if (!open || !recommendation) return null;
  return (
    <DecisionModalInner
      decision={decision}
      recommendation={recommendation}
      onConfirm={onConfirm}
      onClose={onClose}
      busy={busy}
      error={error}
    />
  );
}

function DecisionModalInner({ decision, recommendation, onConfirm, onClose, busy, error }) {
  const { t, lang } = useLanguage();
  const dialogRef = useRef(null);
  const textareaRef = useRef(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const previousActive = document.activeElement;
    const focusable = textareaRef.current;
    focusable?.focus();

    function handleKey(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Tab" && dialogRef.current) {
        const nodes = dialogRef.current.querySelectorAll(
          "button, textarea, input, [href], [tabindex]:not([tabindex='-1'])"
        );
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      previousActive?.focus?.();
    };
  }, [onClose]);

  const titleKey =
    decision === "approved" ? "dc_modal_approveTitle"
    : decision === "rejected" ? "dc_modal_rejectTitle"
    : "dc_modal_deferTitle";

  const recName = lang === "zh"
    ? recommendation.action?.name_zh ?? recommendation.action_code
    : recommendation.action?.name_en ?? recommendation.action_code;

  return (
    <div className="dc-modal-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dc-modal-title"
        className="dc-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="dc-modal-head">
          <h3 id="dc-modal-title">{t(titleKey)}</h3>
          <button
            type="button"
            className="dc-modal-close"
            aria-label={t("close")}
            onClick={onClose}
          >
            <FiClose size={16} />
          </button>
        </header>
        <p className="dc-modal-target">
          <code className="dc-mono">{recommendation.action_code}</code>
          <span> &mdash; {recName}</span>
        </p>
        <label className="dc-modal-label" htmlFor="dc-modal-notes">
          {t("dc_modal_notesLabel")}
        </label>
        <textarea
          id="dc-modal-notes"
          ref={textareaRef}
          className="dc-modal-textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("dc_modal_notesPlaceholder")}
          rows={4}
          maxLength={500}
        />
        {error && <div className="dc-modal-error" role="alert">{error}</div>}
        <div className="dc-modal-actions">
          <button type="button" className="dc-btn dc-btn-ghost" onClick={onClose} disabled={busy}>
            {t("dc_modal_cancel")}
          </button>
          <button
            type="button"
            className={`dc-btn dc-btn-${decision}`}
            onClick={() => onConfirm(notes)}
            disabled={busy}
          >
            {busy ? t("dc_modal_saving") : t("dc_modal_confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Detail drawer — shows full action spec from /api/v1/actions
 * ──────────────────────────────────────────────────────────────────── */

function DetailDrawer({ open, recommendation, action, onClose }) {
  const { t, lang } = useLanguage();
  const drawerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousActive = document.activeElement;
    drawerRef.current?.focus();
    function handleKey(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      previousActive?.focus?.();
    };
  }, [open, onClose]);

  if (!open || !recommendation) return null;

  const cat = categoryFromCode(recommendation.action_code);
  const meta = cat ? CATEGORY_META[cat] : null;
  const name = lang === "zh"
    ? action?.name_zh ?? recommendation.action_code
    : action?.name_en ?? recommendation.action_code;
  const desc = lang === "zh"
    ? action?.description_zh
    : action?.description_en;

  const triggerSnap = safeJsonParse(recommendation.trigger_data_snapshot) ?? {};
  const outputs = safeJsonParse(recommendation.output_params) ?? action?.output_params_schema ?? {};

  return (
    <div className="dc-drawer-backdrop" onClick={onClose}>
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dc-drawer-title"
        tabIndex={-1}
        className="dc-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="dc-drawer-head">
          <div className="dc-drawer-titlewrap">
            {meta && <span className="dc-drawer-emoji" aria-hidden="true">{meta.emoji}</span>}
            <div>
              <code className="dc-mono dc-drawer-code">{recommendation.action_code}</code>
              <h3 id="dc-drawer-title" className="dc-drawer-title">{name}</h3>
            </div>
          </div>
          <button
            type="button"
            className="dc-drawer-close"
            aria-label={t("close")}
            onClick={onClose}
          >
            <FiClose size={18} />
          </button>
        </header>

        <div className="dc-drawer-body">
          {desc && <p className="dc-drawer-desc">{desc}</p>}

          <section className="dc-drawer-section">
            <h4 className="dc-drawer-sectionTitle">{t("dc_drawer_triggerSpec")}</h4>
            {action?.trigger_conditions ? (
              <pre className="dc-codeblock">{JSON.stringify(action.trigger_conditions, null, 2)}</pre>
            ) : (
              <p className="dc-drawer-empty">{t("dc_drawer_noSpec")}</p>
            )}
          </section>

          <section className="dc-drawer-section">
            <h4 className="dc-drawer-sectionTitle">{t("dc_drawer_triggerSnapshot")}</h4>
            <pre className="dc-codeblock">{JSON.stringify(triggerSnap, null, 2)}</pre>
          </section>

          <section className="dc-drawer-section">
            <h4 className="dc-drawer-sectionTitle">{t("dc_drawer_outputParams")}</h4>
            <pre className="dc-codeblock">{JSON.stringify(outputs, null, 2)}</pre>
          </section>

          <section className="dc-drawer-section">
            <h4 className="dc-drawer-sectionTitle">{t("dc_drawer_meta")}</h4>
            <dl className="dc-drawer-metaList">
              <div>
                <dt>{t("dc_drawer_confidenceBaseline")}</dt>
                <dd>{action?.confidence_baseline != null
                  ? `${(action.confidence_baseline * 100).toFixed(0)}%`
                  : "—"}</dd>
              </div>
              <div>
                <dt>{t("dc_drawer_unitCost")}</dt>
                <dd>{action?.cost_yuan_per_hm2 != null
                  ? `¥${action.cost_yuan_per_hm2.toLocaleString()} / hm²`
                  : "—"}</dd>
              </div>
              <div>
                <dt>{t("dc_drawer_etaRange")}</dt>
                <dd>{action?.eta_months_min != null
                  ? `${action.eta_months_min}–${action.eta_months_max} ${t("dc_months")}`
                  : "—"}</dd>
              </div>
              <div>
                <dt>{t("dc_drawer_dataNeeds")}</dt>
                <dd>{action?.data_requirements?.join(", ") || "—"}</dd>
              </div>
              <div>
                <dt>{t("dc_drawer_canAuto")}</dt>
                <dd>{action?.can_autonomous_phase_c ? t("dc_yes") : t("dc_no")}</dd>
              </div>
            </dl>
          </section>

          <section className="dc-drawer-section">
            <h4 className="dc-drawer-sectionTitle">{t("dc_drawer_citations")}</h4>
            <p className="dc-drawer-citenote">{t("dc_drawer_citenote")}</p>
            <a
              className="dc-drawer-citelink"
              href={`${DOCS_URL}#${(recommendation.action_code || "").toLowerCase()}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              docs/L3-action-vocabulary.md
              <FiExternalLink size={12} aria-hidden="true" />
            </a>
          </section>
        </div>
      </aside>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Recommendation card
 * ──────────────────────────────────────────────────────────────────── */

function RecommendationCard({ rec, action, isAuthed, onOpenDetail, onDecide }) {
  const { t, lang } = useLanguage();
  const cat = categoryFromCode(rec.action_code);
  const meta = cat ? CATEGORY_META[cat] : { emoji: "?", color: "var(--accent-blue)" };
  const statusMeta = STATUS_META[rec.status] ?? STATUS_META.pending;
  const StatusIcon = statusMeta.icon;
  const name = lang === "zh"
    ? action?.name_zh ?? rec.action_code
    : action?.name_en ?? rec.action_code;
  const desc = lang === "zh"
    ? action?.description_zh
    : action?.description_en;

  const triggerSnap = safeJsonParse(rec.trigger_data_snapshot) ?? {};
  const triggerKeys = Object.keys(triggerSnap).slice(0, 4);

  const confPct = rec.confidence != null ? Math.round(rec.confidence * 100) : null;
  const isPending = rec.status === "pending";
  const approvalLabelKey = `dc_appr_${rec.approval_level === "project_office"
    ? "project"
    : rec.approval_level}`;

  return (
    <article
      role="article"
      className={`dc-card dc-card-${rec.status}`}
      style={{ "--cat-color": meta.color }}
      aria-labelledby={`dc-card-title-${rec.id}`}
    >
      <header className="dc-card-head">
        <span className="dc-card-emoji" aria-hidden="true">{meta.emoji}</span>
        <code className="dc-mono dc-card-code">{rec.action_code}</code>
        <span
          className="dc-card-status"
          style={{ color: statusMeta.color, borderColor: statusMeta.color }}
        >
          <StatusIcon size={11} aria-hidden="true" />
          {t(`dc_status_${rec.status}`)}
        </span>
      </header>

      <h3 id={`dc-card-title-${rec.id}`} className="dc-card-title">{name}</h3>
      {rec.feature_id && (
        <p className="dc-card-org" title={String(rec.feature_id)}>
          <FiMapPin size={11} aria-hidden="true" /> {String(rec.feature_id)}
        </p>
      )}
      {desc && <p className="dc-card-desc">{desc}</p>}

      <div className="dc-card-grid">
        <div className="dc-card-cell">
          <span className="dc-card-cellLabel">{t("dc_card_confidence")}</span>
          {confPct != null ? (
            <div
              className="dc-conf-bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={confPct}
              aria-label={t("dc_card_confidence")}
            >
              <div
                className="dc-conf-fill"
                style={{ width: `${confPct}%`, background: confidenceColor(rec.confidence) }}
              />
              <span className="dc-conf-pct">{confPct}%</span>
            </div>
          ) : (
            <span className="dc-card-cellValue">—</span>
          )}
        </div>
        <div className="dc-card-cell">
          <span className="dc-card-cellLabel">{t("dc_card_cost")}</span>
          <span className="dc-card-cellValue">{formatCurrency(rec.estimated_cost_yuan)}</span>
        </div>
        <div className="dc-card-cell">
          <span className="dc-card-cellLabel">{t("dc_card_eta")}</span>
          <span className="dc-card-cellValue">
            {rec.eta_months != null
              ? `${rec.eta_months} ${t("dc_months")}`
              : "—"}
          </span>
        </div>
        <div className="dc-card-cell">
          <span className="dc-card-cellLabel">{t("dc_card_approval")}</span>
          <span className="dc-card-approvalBadge">
            {t(approvalLabelKey)}
          </span>
        </div>
      </div>

      {triggerKeys.length > 0 && (
        <details className="dc-card-snapshot">
          <summary>
            <FiInfo size={11} aria-hidden="true" />
            {t("dc_card_snapshot")}
          </summary>
          <dl className="dc-snapshot-list">
            {triggerKeys.map((key) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{String(triggerSnap[key])}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}

      {rec.engine_note && (
        <p className="dc-card-engineNote" role="note">
          <FiAlertTriangle size={11} aria-hidden="true" /> {rec.engine_note}
        </p>
      )}

      <footer className="dc-card-actions">
        <button
          type="button"
          className="dc-card-detailBtn"
          onClick={() => onOpenDetail(rec)}
        >
          {t("dc_card_detail")} <FiChevronDown size={12} aria-hidden="true" />
        </button>
        {isPending && (
          isAuthed ? (
            <div className="dc-card-decideBtns">
              <button
                type="button"
                className="dc-btn dc-btn-approved"
                onClick={() => onDecide(rec, "approved")}
              >
                <FiCheck size={12} aria-hidden="true" /> {t("dc_action_approve")}
              </button>
              <button
                type="button"
                className="dc-btn dc-btn-rejected"
                onClick={() => onDecide(rec, "rejected")}
              >
                <FiX size={12} aria-hidden="true" /> {t("dc_action_reject")}
              </button>
              <button
                type="button"
                className="dc-btn dc-btn-deferred"
                onClick={() => onDecide(rec, "deferred")}
              >
                <FiSkipForward size={12} aria-hidden="true" /> {t("dc_action_defer")}
              </button>
            </div>
          ) : (
            <button type="button" className="dc-btn dc-btn-disabled" disabled>
              {t("dc_action_loginRequired")}
            </button>
          )
        )}
      </footer>
    </article>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Main view
 * ──────────────────────────────────────────────────────────────────── */

export default function DecisionCenterView() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isAuthed = Boolean(user);

  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [approvalFilter, setApprovalFilter] = useState("all");

  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);

  const [actionCatalog, setActionCatalog] = useState({});
  const [completeness, setCompleteness] = useState(null);
  const [evaluating, setEvaluating] = useState(false);

  const [drawerRec, setDrawerRec] = useState(null);
  const [decisionRec, setDecisionRec] = useState(null);
  const [decisionType, setDecisionType] = useState(null);
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [decisionError, setDecisionError] = useState(null);

  // Fetch action catalog once on mount.
  useEffect(() => {
    let cancelled = false;
    fetchActionCatalog()
      .then((data) => {
        if (cancelled) return;
        const map = {};
        for (const a of data?.actions ?? []) {
          map[a.code] = a;
        }
        setActionCatalog(map);
      })
      .catch(() => {
        // catalog is optional — cards still render with raw codes
      });
    return () => { cancelled = true; };
  }, []);

  const loadList = useCallback((signal) => {
    setLoading(true);
    setError(null);
    const filters = {};
    if (statusFilter !== "all") filters.status = statusFilter;
    if (approvalFilter !== "all") filters.approval_level = approvalFilter;
    fetchRecommendations(filters, signal)
      .then((data) => {
        const rows = Array.isArray(data) ? data : [];
        setRecommendations(rows);
        setUsingFallback(false);
        setLoading(false);
      })
      .catch((err) => {
        if (err?.name === "ApiError" && err.status === 0 && err.message?.includes("cancel")) {
          return; // ignore aborts
        }
        // Fallback: render bundled demo set so the page is never empty
        // when the backend is unreachable. This is intentional for the
        // B2G demo deployment — keeps the UX walkable without a server.
        setRecommendations(FALLBACK_RECOMMENDATIONS);
        setUsingFallback(true);
        setError(null);
        setLoading(false);
      });
  }, [statusFilter, approvalFilter]);

  useEffect(() => {
    const controller = new AbortController();
    loadList(controller.signal);
    return () => controller.abort();
  }, [loadList]);

  const filteredRecs = useMemo(() => {
    return recommendations.filter((rec) => {
      if (categoryFilter !== "all") {
        if (categoryFromCode(rec.action_code) !== categoryFilter) return false;
      }
      return true;
    });
  }, [recommendations, categoryFilter]);

  const handleEvaluate = async () => {
    setEvaluating(true);
    setError(null);
    try {
      const res = await evaluateRegion({ feature_id: "hotan_green_belt" });
      setCompleteness(res?.data_completeness ?? null);
      // After evaluating, refresh list
      loadList();
    } catch (err) {
      setError(err?.message ?? "Evaluate failed");
    } finally {
      setEvaluating(false);
    }
  };

  const openDecisionModal = (rec, type) => {
    setDecisionRec(rec);
    setDecisionType(type);
    setDecisionError(null);
  };

  const closeDecisionModal = () => {
    setDecisionRec(null);
    setDecisionType(null);
    setDecisionError(null);
    setDecisionBusy(false);
  };

  const submitDecision = async (notes) => {
    if (!decisionRec || !decisionType) return;
    setDecisionBusy(true);
    setDecisionError(null);
    try {
      const updated = await decideRecommendation(decisionRec.id, {
        decision: decisionType,
        notes: notes?.trim() || null,
      });
      // optimistic in-place replace
      setRecommendations((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
      closeDecisionModal();
    } catch (err) {
      const msg = err instanceof ApiError && err.status === 401
        ? t("dc_modal_authError")
        : err?.message ?? "Decision failed";
      setDecisionError(msg);
      setDecisionBusy(false);
    }
  };

  const completenessPct = completeness != null ? Math.round(completeness * 100) : null;
  const drawerAction = drawerRec ? actionCatalog[drawerRec.action_code] ?? null : null;
  const decisionRecWithAction = decisionRec
    ? { ...decisionRec, action: actionCatalog[decisionRec.action_code] ?? null }
    : null;

  return (
    <div className="dc-page">
      {/* HERO */}
      <header className="dc-hero">
        <div className="dc-hero-inner">
          <div className="dc-hero-badge" aria-hidden="true">
            <FiInbox size={14} />
            <span>{t("dc_hero_badge")}</span>
          </div>
          <h1 className="dc-hero-title">{t("dc_hero_title")}</h1>
          <p className="dc-hero-sub">{t("dc_hero_sub")}</p>
          <div className="dc-hero-status">
            {completenessPct != null && (
              <span className="dc-hero-pill dc-hero-pill-completeness">
                {t("dc_hero_completeness")}: {completenessPct}%
              </span>
            )}
            <span className="dc-hero-pill dc-hero-pill-warn">
              <FiAlertTriangle size={11} aria-hidden="true" />
              {t("dc_hero_demoWarn")}
            </span>
          </div>
        </div>
      </header>

      {/* FILTER BAR */}
      <div className="dc-filterbar" role="region" aria-label={t("dc_filter_aria")}>
        <FilterChipRow
          label={t("dc_filter_status")}
          options={STATUS_FILTERS}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <FilterChipRow
          label={t("dc_filter_category")}
          options={CATEGORY_FILTERS}
          value={categoryFilter}
          onChange={setCategoryFilter}
        />
        <FilterChipRow
          label={t("dc_filter_approval")}
          options={APPROVAL_FILTERS}
          value={approvalFilter}
          onChange={setApprovalFilter}
        />
        <button
          type="button"
          className="dc-evalBtn"
          onClick={handleEvaluate}
          disabled={evaluating}
        >
          <FiRefreshCw size={13} aria-hidden="true" />
          {evaluating ? t("dc_evaluating") : t("dc_reevaluate")}
        </button>
      </div>

      {/* LIST */}
      <main className="dc-list-wrap">
        {usingFallback && (
          <ErrorState
            variant="warning"
            title={t("dc_fallback_title")}
            description={t("dc_fallback_desc")}
          />
        )}

        {error && (
          <ErrorState
            title={t("stateErrorTitle")}
            description={error}
            onRetry={() => loadList()}
          />
        )}

        {loading && <LoadingState size="medium" message={t("dc_loading")} />}

        {!loading && filteredRecs.length === 0 && (
          <EmptyState
            icon={FiInbox}
            title={t("dc_empty_title")}
            description={t("dc_empty_desc")}
          />
        )}

        {!loading && filteredRecs.length > 0 && (
          <div className="dc-list-grid">
            {filteredRecs.map((rec) => (
              <RecommendationCard
                key={rec.id}
                rec={rec}
                action={actionCatalog[rec.action_code]}
                isAuthed={isAuthed}
                onOpenDetail={setDrawerRec}
                onDecide={openDecisionModal}
              />
            ))}
          </div>
        )}
      </main>

      <DetailDrawer
        open={Boolean(drawerRec)}
        recommendation={drawerRec}
        action={drawerAction}
        onClose={() => setDrawerRec(null)}
      />
      <DecisionModal
        open={Boolean(decisionRec)}
        decision={decisionType}
        recommendation={decisionRecWithAction}
        onConfirm={submitDecision}
        onClose={closeDecisionModal}
        busy={decisionBusy}
        error={decisionError}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Subcomponent: filter chip row
 * ──────────────────────────────────────────────────────────────────── */

function FilterChipRow({ label, options, value, onChange }) {
  return (
    <div className="dc-filter-row">
      <span className="dc-filter-rowLabel">{label}</span>
      <div className="dc-filter-chips" role="group" aria-label={label}>
        {options.map((opt) => {
          const active = opt.id === value;
          return (
            <button
              key={opt.id}
              type="button"
              role="button"
              aria-pressed={active}
              className={`dc-chip ${active ? "active" : ""}`}
              onClick={() => onChange(opt.id)}
            >
              {opt.emoji && <span aria-hidden="true">{opt.emoji} </span>}
              <ChipLabel optionId={opt.id} labelKey={opt.labelKey} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ChipLabel({ labelKey }) {
  const { t } = useLanguage();
  return <>{t(labelKey)}</>;
}
