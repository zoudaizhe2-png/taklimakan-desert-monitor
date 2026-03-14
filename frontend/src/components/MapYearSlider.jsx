import { useState, useRef, useEffect, useCallback } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { FiPlay, FiPause, FiClock, FiX } from "react-icons/fi";

const MILESTONES = [
  { year: 2003, labelKey: "milestone2003" },
  { year: 2024, labelKey: "milestone2024" },
];

const MIN_YEAR = 2000;
const MAX_YEAR = 2025;

export default function MapYearSlider({ year, onYearChange }) {
  const { t } = useLanguage();
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef(null);

  const stop = useCallback(() => {
    setPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        onYearChange((prev) => {
          if (prev >= MAX_YEAR) {
            stop();
            return MAX_YEAR;
          }
          return prev + 1;
        });
      }, 600);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, onYearChange, stop]);

  function togglePlay() {
    if (playing) {
      stop();
    } else {
      // Always start from the beginning
      onYearChange(MIN_YEAR);
      setTimeout(() => setPlaying(true), 50);
    }
  }

  const pct = ((year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;

  // Show just a small toggle button when hidden
  if (!visible) {
    return (
      <button
        className="year-slider-toggle"
        onClick={() => setVisible(true)}
        title="Show timeline"
      >
        <FiClock size={16} />
      </button>
    );
  }

  return (
    <div className="map-year-slider">
      <button className="year-play-btn" onClick={togglePlay}>
        {playing ? <FiPause size={16} /> : <FiPlay size={16} />}
      </button>
      <span className="year-big">{year}</span>
      <div className="slider-track-wrapper">
        <input
          type="range"
          min={MIN_YEAR}
          max={MAX_YEAR}
          value={year}
          onChange={(e) => {
            if (playing) stop();
            onYearChange(Number(e.target.value));
          }}
          className="year-range-input"
        />
        <div className="slider-fill" style={{ width: `${pct}%` }} />
        {MILESTONES.map((m) => {
          const mPct = ((m.year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;
          return (
            <div
              key={m.year}
              className="milestone-tick"
              style={{ left: `${mPct}%` }}
              title={t(m.labelKey)}
            >
              <div className="milestone-dot" />
              <span className="milestone-label">{m.year}</span>
            </div>
          );
        })}
      </div>
      <button className="year-close-btn" onClick={() => { stop(); setVisible(false); }}>
        <FiX size={14} />
      </button>
    </div>
  );
}
