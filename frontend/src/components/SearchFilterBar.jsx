import { useLanguage } from "../i18n/LanguageContext";
import { getCategoryColor } from "./MapMarkerIcons";
import { FiSearch } from "react-icons/fi";

const CATEGORIES = ["vegetation", "desert", "city", "project", "water"];

export default function SearchFilterBar({
  activeFilters,
  onToggleFilter,
  searchQuery,
  onSearchChange,
}) {
  const { t } = useLanguage();

  return (
    <div className="search-filter-bar">
      <div className="search-input-wrapper">
        <FiSearch className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder={t("searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="filter-chips">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`filter-chip ${activeFilters.has(cat) ? "active" : ""}`}
            onClick={() => onToggleFilter(cat)}
            style={{
              borderColor: getCategoryColor(cat),
              ...(activeFilters.has(cat) && { background: getCategoryColor(cat) }),
            }}
          >
            <span
              className="chip-dot"
              style={{ background: activeFilters.has(cat) ? "white" : getCategoryColor(cat) }}
            />
            {t(cat)}
          </button>
        ))}
      </div>
    </div>
  );
}
