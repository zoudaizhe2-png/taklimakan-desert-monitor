import { useLanguage } from "../i18n/LanguageContext";

export default function DashboardBar({ data }) {
  const { t } = useLanguage();

  if (!data) return null;

  const cards = [
    {
      label: t("totalGreenArea"),
      value: `${data.total_green_area_sqkm?.toLocaleString()} ${t("sqkm")}`,
      color: "#1a9850",
    },
    {
      label: t("totalDesertArea"),
      value: `${data.total_desert_area_sqkm?.toLocaleString()} ${t("sqkm")}`,
      color: "#e8a838",
    },
    {
      label: t("yoyChange"),
      value: `+${data.yoy_green_change_pct}%`,
      color: data.yoy_green_change_pct > 0 ? "#1a9850" : "#d73027",
    },
    {
      label: t("activeProjects"),
      value: data.total_projects,
      color: "#4a90d9",
    },
  ];

  return (
    <div className="dashboard-bar">
      {cards.map((card) => (
        <div key={card.label} className="dashboard-card">
          <div className="dashboard-value" style={{ color: card.color }}>
            {card.value}
          </div>
          <div className="dashboard-label">{card.label}</div>
        </div>
      ))}
    </div>
  );
}
