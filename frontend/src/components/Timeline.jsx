import { useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";

const YEARS = [];
for (let y = 2015; y <= 2025; y++) YEARS.push(y);

export default function Timeline({ onYearChange, onCompare }) {
  const { t } = useLanguage();
  const [selectedYear, setSelectedYear] = useState(2024);
  const [compareYear, setCompareYear] = useState(2018);

  function handleYearChange(e) {
    const year = parseInt(e.target.value);
    setSelectedYear(year);
    onYearChange(year);
  }

  function handleCompare() {
    onCompare(compareYear, selectedYear);
  }

  return (
    <div className="timeline">
      <div className="timeline-section">
        <label>{t("viewYear")}</label>
        <input
          type="range"
          min={2015}
          max={2025}
          value={selectedYear}
          onChange={handleYearChange}
        />
        <span className="year-display">{selectedYear}</span>
      </div>
      <div className="timeline-section">
        <label>{t("compareFrom")}</label>
        <select
          value={compareYear}
          onChange={(e) => setCompareYear(parseInt(e.target.value))}
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <span className="year-arrow">&#8594;</span>
        <span className="year-display">{selectedYear}</span>
        <button className="btn-compare" onClick={handleCompare}>
          {t("compare")}
        </button>
      </div>
    </div>
  );
}
