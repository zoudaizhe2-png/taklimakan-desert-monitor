import { useState, useEffect, useRef, useCallback } from "react";
import IllustratedMap from "./components/IllustratedMap";
import Timeline from "./components/Timeline";
import NDVIChart from "./components/NDVIChart";
import NDVICompareSlider from "./components/NDVICompareSlider";
import ChangeStats from "./components/ChangeStats";
import Legend from "./components/Legend";
import DashboardBar from "./components/DashboardBar";
import SearchFilterBar from "./components/SearchFilterBar";
import SlidePanel from "./components/SlidePanel";
import FeatureDetails from "./components/FeatureDetails";
import FullscreenButton from "./components/FullscreenButton";
import ExportButton from "./components/ExportButton";
import LanguageToggle from "./components/LanguageToggle";
import Sidebar from "./components/Sidebar";
import StatusBar from "./components/StatusBar";
import MapYearSlider from "./components/MapYearSlider";
import MonitorView from "./components/MonitorView";
import ProjectsView from "./components/ProjectsView";
import TimelineView from "./components/TimelineView";
import MissionView from "./components/MissionView";
import SnakeRobotView from "./components/SnakeRobotView";
import DonateView from "./components/DonateView";
import SatellitePlayground from "./components/SatellitePlayground";
import SatellitePhoto, { prefetchSatelliteImages } from "./components/SatellitePhoto";
import { FiRadio } from "react-icons/fi";
import { useLanguage } from "./i18n/LanguageContext";
import {
  fetchFeatures,
  fetchDashboard,
  fetchTimeseries,
  fetchAnalysis,
  fetchGrid,
  fetchNdviGridCache,
} from "./api/client";
import "./App.css";

const ALL_CATEGORIES = new Set(["vegetation", "desert", "city", "project", "water"]);

function App() {
  const { t } = useLanguage();
  const panelRef = useRef(null);

  const [activeView, setActiveView] = useState("map");

  // Data
  const [features, setFeatures] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [timeseriesData, setTimeseriesData] = useState([]);
  const [changeData, setChangeData] = useState(null);
  const [gridData, setGridData] = useState([]);
  const [gridYear1, setGridYear1] = useState([]);
  const [gridYear2, setGridYear2] = useState([]);
  const [compareYears, setCompareYears] = useState(null);

  // UI state
  const [activeFilters, setActiveFilters] = useState(new Set(ALL_CATEGORIES));
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(2024);
  const [mapYear, setMapYear] = useState(2024);
  const [showSatBg, setShowSatBg] = useState(false);

  const [loadingTs, setLoadingTs] = useState(false);
  const [loadingChange, setLoadingChange] = useState(false);
  const [error, setError] = useState(null);
  const [ndviGrid, setNdviGrid] = useState(null);

  useEffect(() => {
    fetchFeatures()
      .then((data) => setFeatures(Array.isArray(data) ? data : []))
      .catch(() => setError("Could not connect to backend. Is the server running on port 8000?"));
    fetchDashboard().then(setDashboardData).catch(() => {});
    prefetchSatelliteImages();

    // Poll for cached NDVI grid (background GEE fetch)
    let pollId;
    function pollNdvi() {
      fetchNdviGridCache().then((res) => {
        if (res.status === "ready" && res.data) {
          setNdviGrid(res.data);
        } else if (res.status === "loading") {
          pollId = setTimeout(pollNdvi, 5000);
        }
      }).catch(() => {});
    }
    pollNdvi();
    return () => clearTimeout(pollId);
  }, []);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isFullscreen) setIsFullscreen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  const filteredFeatures = features.filter((f) => {
    if (!activeFilters.has(f.category)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return f.name_en.toLowerCase().includes(q) || f.name_zh.includes(q);
    }
    return true;
  });

  function handleToggleFilter(category) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      next.has(category) ? next.delete(category) : next.add(category);
      return next;
    });
  }

  const handleFeatureClick = useCallback(async (feature) => {
    setSelectedFeature(feature);
    setPanelOpen(true);
    setChangeData(null);
    setGridYear1([]);
    setGridYear2([]);
    setCompareYears(null);

    if (feature.geometry) {
      setLoadingTs(true);
      try {
        const [tsResult, gridResult] = await Promise.all([
          fetchTimeseries(feature.geometry),
          fetchGrid(feature.geometry, selectedYear),
        ]);
        setTimeseriesData(tsResult.data);
        setGridData(gridResult.data);
      } catch {
        setError("Failed to fetch analysis data.");
      }
      setLoadingTs(false);
    } else {
      setTimeseriesData([]);
      setGridData([]);
    }
  }, [selectedYear]);

  async function handleYearChange(year) {
    setSelectedYear(year);
    if (!selectedFeature?.geometry) return;
    try {
      const gridResult = await fetchGrid(selectedFeature.geometry, year);
      setGridData(gridResult.data);
    } catch { /* silent */ }
  }

  async function handleCompare(year1, year2) {
    if (!selectedFeature?.geometry) return;
    setLoadingChange(true);
    setCompareYears({ year1, year2 });
    try {
      const [result, g1, g2] = await Promise.all([
        fetchAnalysis(selectedFeature.geometry, year1, year2),
        fetchGrid(selectedFeature.geometry, year1),
        fetchGrid(selectedFeature.geometry, year2),
      ]);
      setChangeData(result.data);
      setGridYear1(g1.data);
      setGridYear2(g2.data);
    } catch {
      setError("Failed to analyze changes.");
    }
    setLoadingChange(false);
  }

  function handleSelectFeatureAndGoToMap(feature) {
    setActiveView("map");
    handleFeatureClick(feature);
  }

  function handleMapYearChange(yearOrFn) {
    if (typeof yearOrFn === "function") {
      setMapYear((prev) => yearOrFn(prev));
    } else {
      setMapYear(yearOrFn);
    }
  }

  return (
    <div className={`app ${isFullscreen ? "fullscreen" : ""}`}>
      <header className="app-header">
        <div className="header-left">
          <h1>{t("appTitle")}</h1>
          <p className="subtitle">{t("appSubtitle")}</p>
        </div>
        <LanguageToggle />
      </header>

      {error && <div className="error-banner">{error}</div>}

      <div className="app-shell">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />

        <div className="app-main-content">
          {/* ===== MAP ===== */}
          <div className={`view-panel ${activeView === "map" ? "active" : ""}`}>
            <div className="map-area map-fullbleed">
              {showSatBg && (
                <SatellitePhoto bounds={[75, 36, 90, 43]} year={mapYear} band="truecolor" width={1200} className="map-sat-bg" showLabel={false} />
              )}
              <IllustratedMap features={filteredFeatures} onFeatureClick={handleFeatureClick} selectedFeature={selectedFeature} year={mapYear} ndviGrid={ndviGrid} />

              {/* Overlaid controls */}
              <div className="map-overlay-top">
                <SearchFilterBar activeFilters={activeFilters} onToggleFilter={handleToggleFilter} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
              </div>

              <button className={`map-sat-toggle ${showSatBg ? "active" : ""}`} onClick={() => setShowSatBg(!showSatBg)} title={showSatBg ? "Hide satellite" : "Show satellite"}>
                <FiRadio size={16} />
              </button>
              <FullscreenButton isFullscreen={isFullscreen} onToggle={() => setIsFullscreen(!isFullscreen)} />
              <MapYearSlider year={mapYear} onYearChange={handleMapYearChange} />

              <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)}>
                <div ref={panelRef}>
                  <FeatureDetails feature={selectedFeature} />
                  {selectedFeature?.geometry && (
                    <>
                      <NDVIChart data={timeseriesData} loading={loadingTs} />
                      <Legend />
                      <Timeline onYearChange={handleYearChange} onCompare={handleCompare} />
                      <NDVICompareSlider gridYear1={gridYear1} gridYear2={gridYear2} year1={compareYears?.year1} year2={compareYears?.year2} />
                      <ChangeStats data={changeData} loading={loadingChange} />
                    </>
                  )}
                  <ExportButton targetRef={panelRef} />
                </div>
              </SlidePanel>
            </div>
          </div>

          {/* ===== MONITOR (merged dashboard + satellite) ===== */}
          <div className={`view-panel ${activeView === "monitor" ? "active" : ""}`}>
            <MonitorView />
          </div>

          {/* ===== PROJECTS ===== */}
          <div className={`view-panel ${activeView === "projects" ? "active" : ""}`}>
            <ProjectsView features={features} onSelectFeature={handleSelectFeatureAndGoToMap} />
          </div>

          {/* ===== TIMELINE ===== */}
          <div className={`view-panel ${activeView === "timeline" ? "active" : ""}`}>
            <TimelineView onNavigateToProject={() => setActiveView("map")} />
          </div>

          {/* ===== MISSION ===== */}
          <div className={`view-panel ${activeView === "mission" ? "active" : ""}`}>
            <MissionView onNavigate={setActiveView} />
          </div>

          {/* ===== SNAKE ROBOT ===== */}
          <div className={`view-panel ${activeView === "snake" ? "active" : ""}`}>
            <SnakeRobotView onNavigate={setActiveView} />
          </div>

          {/* ===== SATELLITE PLAYGROUND ===== */}
          <div className={`view-panel ${activeView === "playground" ? "active" : ""}`}>
            <SatellitePlayground />
          </div>

          {/* ===== DONATE ===== */}
          <div className={`view-panel ${activeView === "donate" ? "active" : ""}`}>
            <DonateView />
          </div>
        </div>
      </div>

      <StatusBar dashboardData={dashboardData} />
    </div>
  );
}

export default App;
