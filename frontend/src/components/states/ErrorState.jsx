import { FiAlertTriangle, FiRefreshCw } from "react-icons/fi";
import { useLanguage } from "../../i18n/LanguageContext";
import "./states.css";

/**
 * Unified error state. Use for fetch failures, validation collapses,
 * or any user-visible error that needs a retry affordance.
 *
 * Props:
 *   title:       override (default t("stateErrorTitle"))
 *   description: override; if a string is passed, shown as message
 *   onRetry:     callback; if provided, render Retry button
 *   retryLabel:  override (default t("stateErrorRetry"))
 *   variant:     "warning" | "error" (default "error")
 */
export default function ErrorState({
  title,
  description,
  onRetry,
  retryLabel,
  variant = "error",
  className = "",
}) {
  const { t } = useLanguage();
  const t1 = title ?? t("stateErrorTitle");
  const t2 = description;
  return (
    <div
      className={`ui-state ui-error ui-error-${variant} ${className}`.trim()}
      role="alert"
      aria-live="assertive"
    >
      <FiAlertTriangle size={26} className="ui-error-icon" aria-hidden="true" />
      <div className="ui-error-body">
        {t1 && <h3 className="ui-error-title">{t1}</h3>}
        {t2 && <p className="ui-error-desc">{t2}</p>}
      </div>
      {onRetry && (
        <button
          type="button"
          className="ui-state-btn ui-error-retry"
          onClick={onRetry}
        >
          <FiRefreshCw size={13} aria-hidden="true" />
          {retryLabel ?? t("stateErrorRetry")}
        </button>
      )}
    </div>
  );
}
