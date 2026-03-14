import { useLanguage } from "../i18n/LanguageContext";
import { getCategoryColor } from "./MapMarkerIcons";
import SatellitePhoto from "./SatellitePhoto";

export default function FeatureDetails({ feature }) {
  const { t, localize } = useLanguage();

  if (!feature) return null;

  const { name, description } = localize(feature);
  const color = getCategoryColor(feature.category);

  // Build bounds from geometry or lat/lng
  const bounds = feature.geometry
    ? (() => {
        const coords = feature.geometry.coordinates[0];
        const lngs = coords.map(c => c[0]);
        const lats = coords.map(c => c[1]);
        return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
      })()
    : feature.lat && feature.lng
    ? [feature.lng - 0.3, feature.lat - 0.2, feature.lng + 0.3, feature.lat + 0.2]
    : null;

  return (
    <div className="feature-details">
      {/* 1. Satellite photo — evidence first */}
      {bounds && (
        <SatellitePhoto
          bounds={bounds}
          year={2024}
          band="truecolor"
          width={400}
          className="feature-sat-photo"
          showLabel={true}
        />
      )}

      {/* 2. Name & category — quick identification */}
      <div className="feature-header">
        <span className="category-badge" style={{ background: color }}>
          {t(feature.category)}
        </span>
        <h2 className="feature-name">{name}</h2>
      </div>

      {/* 3. Key stats — the numbers */}
      {feature.stats && (
        <div className="feature-stats-grid">
          {Object.entries(feature.stats).map(([key, val]) => (
            <div key={key} className="feature-stat">
              <span className="feature-stat-label">{key.replace(/_/g, " ")}</span>
              <span className="feature-stat-value">{val?.toLocaleString?.() ?? val}</span>
            </div>
          ))}
        </div>
      )}

      {/* 4. Description — context, read later */}
      <p className="feature-description">{description}</p>
    </div>
  );
}
