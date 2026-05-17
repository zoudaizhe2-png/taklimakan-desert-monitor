import { FiInbox } from "react-icons/fi";
import { useLanguage } from "../../i18n/LanguageContext";
import "./states.css";

/**
 * Unified empty state. Use whenever a list/section legitimately has
 * zero items (vs. an error or still-loading).
 *
 * Props:
 *   icon:        optional component (default FiInbox)
 *   title:       optional override (default t("stateEmptyTitle"))
 *   description: optional override (default t("stateEmptyDesc"))
 *   actionLabel: button text; if provided AND onAction is set, render CTA
 *   onAction:    callback for the CTA
 */
export default function EmptyState({
  icon: Icon = FiInbox,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}) {
  const { t } = useLanguage();
  const t1 = title ?? t("stateEmptyTitle");
  const t2 = description ?? t("stateEmptyDesc");
  return (
    <div
      className={`ui-state ui-empty ${className}`.trim()}
      role="status"
    >
      <Icon size={36} className="ui-empty-icon" aria-hidden="true" />
      {t1 && <h3 className="ui-empty-title">{t1}</h3>}
      {t2 && <p className="ui-empty-desc">{t2}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          className="ui-state-btn ui-empty-action"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
