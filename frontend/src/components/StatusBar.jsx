import { useLanguage } from "../i18n/LanguageContext";

export default function StatusBar({ dashboardData, wsConnected }) {
  const { t } = useLanguage();
  const now = new Date().toLocaleTimeString();

  return (
    <div className="status-bar">
      <span className="status-item status-updated">
        {t("lastUpdated")}: {now}
      </span>
      {wsConnected !== undefined && (
        <span className={`status-item ${wsConnected ? "" : "status-updated"}`}>
          <span className={`status-dot ${wsConnected ? "live" : "demo"}`} />
          {wsConnected ? t("ws_connected") : t("ws_disconnected")}
        </span>
      )}
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
