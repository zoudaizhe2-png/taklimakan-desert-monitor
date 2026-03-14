import { useLanguage } from "../i18n/LanguageContext";
import { FiMaximize2, FiMinimize2 } from "react-icons/fi";

export default function FullscreenButton({ isFullscreen, onToggle }) {
  const { t } = useLanguage();
  return (
    <button
      className="fullscreen-btn"
      onClick={onToggle}
      title={isFullscreen ? t("exitFullscreen") : t("fullscreen")}
    >
      {isFullscreen ? <FiMinimize2 size={18} /> : <FiMaximize2 size={18} />}
    </button>
  );
}
