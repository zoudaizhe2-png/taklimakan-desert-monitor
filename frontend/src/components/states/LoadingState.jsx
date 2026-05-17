import { useLanguage } from "../../i18n/LanguageContext";
import "./states.css";

/**
 * Unified loading indicator. Replaces ad-hoc spinners / "Loading..." text.
 *
 * Props:
 *   size:     "small" | "medium" | "large"   (default "medium")
 *   message:  optional override; falls back to t("stateLoadingData")
 *   inline:   true → no min-height block; renders a one-line indicator
 *   className: extra classes for the wrapper
 */
export default function LoadingState({
  size = "medium",
  message,
  inline = false,
  className = "",
}) {
  const { t } = useLanguage();
  const text = message ?? t("stateLoadingData");
  return (
    <div
      className={`ui-state ui-loading ui-loading-${size} ${inline ? "ui-loading-inline" : ""} ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <span className={`ui-loading-spinner ui-loading-spinner-${size}`} aria-hidden="true" />
      {text && <span className="ui-loading-text">{text}</span>}
    </div>
  );
}
