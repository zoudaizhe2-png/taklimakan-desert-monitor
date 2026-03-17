import { useLanguage } from "../i18n/LanguageContext";

export default function StatusBar({ dashboardData }) {
  const { t } = useLanguage();
  const now = new Date().toLocaleTimeString();

  return (
    <div className="status-bar">
      <span className="status-item status-updated">
        {t("lastUpdated")}: {now}
      </span>
      <div className="status-spacer" />
      {dashboardData && (
        <>
          <span className="status-item">
            {t("totalGreenArea")}: {dashboardData.total_green_area_sqkm?.toLocaleString()} km²
          </span>
          <span className="status-item">
            {t("activeProjects")}: {dashboardData.total_projects}
          </span>
          <span className="status-item status-highlight">
            YoY: +{dashboardData.yoy_green_change_pct}%
          </span>
        </>
      )}
    </div>
  );
}
