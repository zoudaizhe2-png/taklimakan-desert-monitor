import { useLanguage } from "../i18n/LanguageContext";

export default function Legend() {
  const { t } = useLanguage();

  const items = [
    { color: "#d73027", label: t("bareSand"), range: "< 0.1" },
    { color: "#fc8d59", label: t("verySparse"), range: "0.1 - 0.2" },
    { color: "#fee08b", label: t("sparseLegend"), range: "0.2 - 0.3" },
    { color: "#d9ef8b", label: t("moderate"), range: "0.3 - 0.4" },
    { color: "#91cf60", label: t("good"), range: "0.4 - 0.6" },
    { color: "#1a9850", label: t("dense"), range: "> 0.6" },
  ];

  return (
    <div className="legend">
      <h4>{t("ndviLegendTitle")}</h4>
      {items.map((item) => (
        <div key={item.range} className="legend-item">
          <span className="legend-color" style={{ backgroundColor: item.color }} />
          <span className="legend-label">{item.label}</span>
          <span className="legend-range">{item.range}</span>
        </div>
      ))}
    </div>
  );
}
