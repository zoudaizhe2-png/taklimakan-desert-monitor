import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { DESERT_OUTLINE, GREEN_BELT_SEGMENTS, RIVERS, toSVG } from "../data/mapShapes";
import { FiRadio, FiPlay, FiPause, FiAlertTriangle, FiTrendingUp, FiTrendingDown, FiEye, FiGitPullRequest, FiLayers } from "react-icons/fi";

const API = import.meta.env.DEV ? "http://localhost:8000/api" : "/api";

const ZONES = [
  { id: "hotan",   label: "Hotan",       bounds: [79.5, 36.8, 80.5, 37.5], emoji: "🌿" },
  { id: "alar",    label: "Alar",        bounds: [80.5, 40.2, 81.5, 40.9], emoji: "🌲" },
  { id: "korla",   label: "Korla",       bounds: [85.5, 41.4, 86.5, 42.0], emoji: "🏙️" },
  { id: "highway", label: "Highway",     bounds: [83.2, 37.5, 84.0, 39.5], emoji: "🛣️" },
  { id: "minfeng", label: "Minfeng",     bounds: [82.3, 36.8, 83.2, 37.4], emoji: "🌱" },
  { id: "full",    label: "Full Desert", bounds: [75, 36, 90, 43],         emoji: "🏜️" },
];

const CITIES = [
  { name: "Hotan", lng: 79.93, lat: 37.1 },
  { name: "Alar", lng: 81.28, lat: 40.55 },
  { name: "Korla", lng: 86.15, lat: 41.76 },
  { name: "Kashgar", lng: 75.99, lat: 39.47 },
  { name: "Aksu", lng: 80.26, lat: 41.17 },
  { name: "Kuqa", lng: 82.94, lat: 41.73 },
];

const MODES = [
  { id: "monitor",  label: "Monitor",  zh: "监测", icon: FiEye },
  { id: "change",   label: "Change",   zh: "变化", icon: FiGitPullRequest },
  { id: "classify", label: "Classify", zh: "分类", icon: FiLayers },
];

const CLASS_META = {
  bare:      { label: "Bare Sand/Rock",  color: "#8B4513", zh: "裸沙/岩石" },
  sparse:    { label: "Very Sparse",     color: "#D4A843", zh: "极稀疏" },
  scrub:     { label: "Sparse Scrub",    color: "#CDDC39", zh: "稀疏灌丛" },
  grassland: { label: "Grassland",       color: "#8BC34A", zh: "草地" },
  shrub:     { label: "Shrubland",       color: "#4CAF50", zh: "灌木林" },
  forest:    { label: "Forest/Dense",    color: "#1B5E20", zh: "密林" },
};

// ─── Data generation ────────────────────────────

function seed(x) { const s = Math.sin(x * 127.1) * 43758.5; return s - Math.floor(s); }

const GREEN_ZONES = [[80,37.15,.8],[81,40.55,.7],[86,41.75,.7],[76.5,39.5,.6],[80.3,41.2,.6],[83,41.2,.5],[83.6,39,.3],[80.5,39,.2],[77.5,38,.2]];

function genGrid(bounds, year, res = 60) {
  const [x0, y0, x1, y1] = bounds;
  const dx = (x1 - x0) / res, dy = (y1 - y0) / res;
  const yb = (year - 2015) * 0.004;
  const pts = [];
  for (let i = 0; i < res; i++) for (let j = 0; j < res; j++) {
    const lng = x0 + (i + .5) * dx, lat = y0 + (j + .5) * dy;
    let b = 0.02 + Math.max(0, (Math.sqrt((lng - 82.5) ** 2 + (lat - 39) ** 2) - 2) * .04);
    if (lat > 41.5) b += .15 + (lat - 41.5) * .1;
    else if (lat < 37) b += .1 + (37 - lat) * .15;
    for (const [gl, ga, gs] of GREEN_ZONES) { const d = Math.sqrt((lng-gl)**2+(lat-ga)**2); if (d < 1.5) b += gs * Math.max(0, 1 - d / 1.5); }
    pts.push({ lat, lng, ndvi: Math.max(-.1, Math.min(.85, b + yb + (seed(i * res + j + year) - .5) * .04)) });
  }
  return pts;
}

function ndviRGB(v) {
  if (v < 0.05) return [58,32,5]; if (v < 0.1) return [139,69,19]; if (v < 0.15) return [215,48,39];
  if (v < 0.2) return [252,141,89]; if (v < 0.25) return [254,224,139]; if (v < 0.3) return [217,239,139];
  if (v < 0.4) return [145,207,96]; if (v < 0.5) return [76,175,80]; if (v < 0.6) return [26,152,80];
  return [0,104,55];
}

function classify(v) {
  if (v < .1) return "bare"; if (v < .2) return "sparse"; if (v < .3) return "scrub";
  if (v < .45) return "grassland"; if (v < .6) return "shrub"; return "forest";
}

// ─── Canvas rendering ───────────────────────────

function geoToCanvas(lng, lat, bounds, w, h) {
  const [x0, y0, x1, y1] = bounds;
  return [(lng - x0) / (x1 - x0) * w, (y1 - lat) / (y1 - y0) * h];
}

function drawOverlays(ctx, bounds, w, h) {
  ctx.save();
  // Desert outline
  ctx.beginPath();
  DESERT_OUTLINE.forEach(([lng, lat], i) => {
    const [x, y] = geoToCanvas(lng, lat, bounds, w, h);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.strokeStyle = "rgba(255,200,100,0.35)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Rivers
  ctx.strokeStyle = "rgba(100,181,246,0.3)";
  ctx.lineWidth = 1;
  for (const r of RIVERS) {
    ctx.beginPath();
    r.points.forEach(([lng, lat], i) => {
      const [x, y] = geoToCanvas(lng, lat, bounds, w, h);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  // Green belt outlines
  ctx.strokeStyle = "rgba(76,175,80,0.25)";
  ctx.lineWidth = 2;
  for (const seg of GREEN_BELT_SEGMENTS) {
    ctx.beginPath();
    seg.points.forEach(([lng, lat], i) => {
      const [x, y] = geoToCanvas(lng, lat, bounds, w, h);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  // City dots
  for (const c of CITIES) {
    const [x, y] = geoToCanvas(c.lng, c.lat, bounds, w, h);
    if (x > 0 && x < w && y > 0 && y < h) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fill();
      ctx.font = "9px -apple-system, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.textAlign = "center";
      ctx.fillText(c.name, x, y - 6);
    }
  }
  ctx.restore();
}

function renderGrid(ctx, grid, bounds, w, h, mode, gridB) {
  const n = Math.round(Math.sqrt(grid.length));
  const cw = w / n + .5, ch = h / n + .5;

  ctx.fillStyle = "#080c12";
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < grid.length; i++) {
    const p = grid[i];
    const [px, py] = geoToCanvas(p.lng, p.lat, bounds, w, h);

    if (mode === "change" && gridB && gridB[i]) {
      const diff = p.ndvi - gridB[i].ndvi;
      if (diff > 0) {
        const t = Math.min(1, diff / .15);
        ctx.fillStyle = `rgb(${Math.round(30*(1-t))},${Math.round(60+195*t)},${Math.round(30*(1-t))})`;
      } else {
        const t = Math.min(1, -diff / .15);
        ctx.fillStyle = `rgb(${Math.round(60+195*t)},${Math.round(30*(1-t))},${Math.round(30*(1-t))})`;
      }
    } else if (mode === "classify") {
      ctx.fillStyle = CLASS_META[classify(p.ndvi)].color;
    } else {
      const [r, g, b] = ndviRGB(p.ndvi);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
    }
    ctx.fillRect(Math.round(px - cw / 2), Math.round(py - ch / 2), Math.ceil(cw), Math.ceil(ch));
  }

  drawOverlays(ctx, bounds, w, h);
}

// ─── MAIN COMPONENT ─────────────────────────────

export default function SatelliteView() {
  const { lang } = useLanguage();
  const canvasRef = useRef(null);
  const frameRef = useRef(null);

  const [zone, setZone] = useState(ZONES[0]);
  const [year, setYear] = useState(2024);
  const [yearB, setYearB] = useState(2018);
  const [mode, setMode] = useState("monitor");
  const [dataSource, setDataSource] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [hover, setHover] = useState(null);
  const [geeImage, setGeeImage] = useState(null);
  const [geeLoading, setGeeLoading] = useState(false);
  const [band, setBand] = useState("ndvi");

  useEffect(() => { fetch(`${API}/data-source`).then(r => r.json()).then(setDataSource).catch(() => {}); }, []);
  const isLive = dataSource?.source === "gee";

  // Grids (local, instant — for canvas rendering)
  const grid = useMemo(() => genGrid(zone.bounds, year), [zone, year]);
  const gridB = useMemo(() => mode === "change" ? genGrid(zone.bounds, yearB) : null, [zone, yearB, mode]);

  // Local stats (instant fallback)
  const localStats = useMemo(() => {
    const ndvis = grid.map(p => p.ndvi);
    const mean = ndvis.reduce((a, b) => a + b, 0) / ndvis.length;
    const classes = {};
    grid.forEach(p => { const c = classify(p.ndvi); classes[c] = (classes[c] || 0) + 1; });
    const total = grid.length;
    const pcts = {};
    for (const [k, v] of Object.entries(classes)) pcts[k] = Math.round(v / total * 100);
    return { mean, max: Math.max(...ndvis), min: Math.min(...ndvis), vegPct: ndvis.filter(v => v > .2).length / total * 100, barePct: ndvis.filter(v => v < .1).length / total * 100, pcts, source: "local" };
  }, [grid]);

  // Real GEE stats (fetched async)
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  useEffect(() => {
    setStats(localStats); // show local instantly
    if (!isLive || playing) return;
    setStatsLoading(true);
    fetch(`${API}/satellite/stats`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bounds: zone.bounds, year }),
    }).then(r => r.json()).then(data => {
      if (data.source === "gee") setStats({ ...localStats, mean: data.mean, min: data.min, max: data.max, vegPct: data.vegPct, barePct: data.barePct, source: "gee" });
      setStatsLoading(false);
    }).catch(() => setStatsLoading(false));
  }, [zone, year, isLive, localStats, playing]);

  // Real GEE change detection (fetched async)
  const [changeStats, setChangeStats] = useState(null);
  const [changeLoading, setChangeLoading] = useState(false);
  useEffect(() => {
    if (mode !== "change") { setChangeStats(null); return; }
    // Local fallback first
    let gained = 0, lost = 0, tot = 0;
    for (let i = 0; i < grid.length && gridB && i < gridB.length; i++) {
      const d = grid[i].ndvi - gridB[i].ndvi; tot += d;
      if (d > .05) gained++; if (d < -.05) lost++;
    }
    const n = gridB ? Math.min(grid.length, gridB.length) : grid.length;
    const local = { meanChange: tot / n, gainedPct: gained / n * 100, lostPct: lost / n * 100, stablePct: (n - gained - lost) / n * 100, source: "local" };
    setChangeStats(local);

    if (!isLive || playing) return;
    setChangeLoading(true);
    fetch(`${API}/satellite/change`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bounds: zone.bounds, year1: yearB, year2: year }),
    }).then(r => r.json()).then(data => {
      if (data.source === "gee") setChangeStats({ ...data, source: "gee" });
      setChangeLoading(false);
    }).catch(() => setChangeLoading(false));
  }, [zone, year, yearB, mode, grid, gridB, isLive, playing]);

  // Alerts (local)
  const alerts = useMemo(() => {
    const prev = genGrid(zone.bounds, year - 1, 30);
    const curr = genGrid(zone.bounds, year, 30);
    const items = [];
    for (let i = 0; i < curr.length && i < prev.length; i++) {
      const d = curr[i].ndvi - prev[i].ndvi;
      if (d < -.08 && prev[i].ndvi > .15)
        items.push({ lat: curr[i].lat.toFixed(2), lng: curr[i].lng.toFixed(2), drop: (d * 100).toFixed(1), from: prev[i].ndvi.toFixed(2) });
    }
    return items.slice(0, 5);
  }, [zone, year]);

  // Zone health (local, cheap)
  const zoneHealth = useMemo(() => ZONES.slice(0, 5).map(z => {
    const g = genGrid(z.bounds, year, 12);
    const m = g.reduce((a, p) => a + p.ndvi, 0) / g.length;
    const gP = genGrid(z.bounds, year - 1, 12);
    const mP = gP.reduce((a, p) => a + p.ndvi, 0) / gP.length;
    return { ...z, mean: m, trend: m - mP };
  }), [year]);

  // Time-lapse
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setYear(y => { if (y >= 2025) { setPlaying(false); return 2025; } return y + 1; });
    }, 800);
    return () => clearInterval(id);
  }, [playing]);

  // Fetch GEE image
  const fetchGeeImage = useCallback(async () => {
    if (!isLive) return;
    setGeeLoading(true);
    try {
      const res = await fetch(`${API}/satellite/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bounds: zone.bounds, year, band, width: 1000 }),
      });
      const data = await res.json();
      if (data.url) setGeeImage(data.url);
      else setGeeImage(null);
    } catch { setGeeImage(null); }
    setGeeLoading(false);
  }, [zone, year, band, isLive]);

  // Render canvas (responsive)
  useEffect(() => {
    if (!canvasRef.current || !frameRef.current) return;
    const frame = frameRef.current;
    const w = frame.clientWidth - 24;
    const h = frame.clientHeight - 24;
    if (w < 100 || h < 100) return;
    const canvas = canvasRef.current;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    renderGrid(ctx, grid, zone.bounds, w, h, mode, gridB);
  }, [grid, gridB, mode, zone]);

  // Resize observer
  useEffect(() => {
    if (!frameRef.current || !canvasRef.current) return;
    const ro = new ResizeObserver(() => {
      const frame = frameRef.current;
      if (!frame) return;
      const w = frame.clientWidth - 24;
      const h = frame.clientHeight - 24;
      if (w < 100 || h < 100) return;
      canvasRef.current.width = w;
      canvasRef.current.height = h;
      renderGrid(canvasRef.current.getContext("2d"), grid, zone.bounds, w, h, mode, gridB);
    });
    ro.observe(frameRef.current);
    return () => ro.disconnect();
  }, [grid, gridB, mode, zone]);

  // Hover handler
  const handleCanvasMove = useCallback((e) => {
    if (!canvasRef.current || !grid.length) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const w = canvasRef.current.width, h = canvasRef.current.height;
    const [x0, y0, x1, y1] = zone.bounds;
    const lng = x0 + (mx / w) * (x1 - x0);
    const lat = y1 - (my / h) * (y1 - y0);
    // Find nearest grid point
    let best = null, bestDist = Infinity;
    for (const p of grid) {
      const d = (p.lng - lng) ** 2 + (p.lat - lat) ** 2;
      if (d < bestDist) { bestDist = d; best = p; }
    }
    setHover(best ? { x: mx, y: my, ndvi: best.ndvi, lat: best.lat, lng: best.lng, cls: classify(best.ndvi) } : null);
  }, [grid, zone]);

  return (
    <div className="sat-page">
      {/* TOP BAR */}
      <div className="sat-topbar">
        <div className="sat-topbar-left">
          <FiRadio size={18} className="sat-pulse-icon" />
          <h2>{lang === "zh" ? "卫星监测中心" : "Satellite Monitoring Center"}</h2>
          <div className="sat-live-badge" data-live={isLive}><span className="sat-live-dot" />{isLive ? "LIVE" : "DEMO"}</div>
        </div>
        <div className="sat-mode-tabs">
          {MODES.map(m => (
            <button key={m.id} className={`sat-mode-tab ${mode === m.id ? "active" : ""}`} onClick={() => setMode(m.id)}>
              <m.icon size={14} /> {lang === "zh" ? m.zh : m.label}
            </button>
          ))}
        </div>
      </div>

      {/* ZONE STRIP */}
      <div className="sat-zone-strip">
        {zoneHealth.map(z => (
          <button key={z.id} className={`sat-zone-card ${zone.id === z.id ? "selected" : ""}`} onClick={() => setZone(ZONES.find(zz => zz.id === z.id))}>
            <span className="sat-zone-emoji">{z.emoji}</span>
            <div className="sat-zone-info">
              <span className="sat-zone-name">{z.label}</span>
              <span className="sat-zone-ndvi">{z.mean.toFixed(3)}</span>
            </div>
            <span className={`sat-zone-trend ${z.trend >= 0 ? "up" : "down"}`}>
              {z.trend >= 0 ? <FiTrendingUp size={12} /> : <FiTrendingDown size={12} />}
            </span>
          </button>
        ))}
      </div>

      {/* MAIN */}
      <div className="sat-main">
        {/* LEFT: Canvas */}
        <div className="sat-canvas-col">
          <div className="sat-controls-row">
            <div className="sat-ctrl">
              <label>{lang === "zh" ? "年份" : "Year"}</label>
              <select value={year} onChange={e => setYear(+e.target.value)}>
                {Array.from({ length: 9 }, (_, i) => 2025 - i).map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {mode === "change" && (
              <div className="sat-ctrl">
                <label>{lang === "zh" ? "对比" : "vs"}</label>
                <select value={yearB} onChange={e => setYearB(+e.target.value)}>
                  {Array.from({ length: 9 }, (_, i) => 2025 - i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            )}
            {/* Time-lapse play */}
            <button className="sat-play-btn" onClick={() => { if (!playing && year >= 2025) setYear(2017); setPlaying(!playing); }}>
              {playing ? <FiPause size={14} /> : <FiPlay size={14} />}
              <span>{playing ? (lang === "zh" ? "暂停" : "Pause") : (lang === "zh" ? "播放" : "Play")}</span>
            </button>
            {/* GEE image button */}
            {isLive && mode === "monitor" && (
              <button className="sat-gee-btn" onClick={fetchGeeImage} disabled={geeLoading}>
                {geeLoading ? "Loading..." : (lang === "zh" ? "获取卫星影像" : "Fetch Satellite Image")}
              </button>
            )}
            <div className="sat-ctrl-spacer" />
            <span className="sat-coord-label">{zone.bounds[0].toFixed(1)}°E–{zone.bounds[2].toFixed(1)}°E</span>
          </div>

          <div className="sat-canvas-frame" ref={frameRef}>
            {/* GEE satellite image (shown behind/above canvas when available) */}
            {geeImage && mode === "monitor" && (
              <img src={geeImage} alt="Sentinel-2 satellite imagery" className="sat-gee-img" />
            )}
            {/* Canvas (always rendered, hidden when GEE image is shown) */}
            <canvas
              ref={canvasRef}
              className={`sat-canvas ${geeImage && mode === "monitor" ? "sat-canvas-hidden" : ""}`}
              onMouseMove={handleCanvasMove}
              onMouseLeave={() => setHover(null)}
            />
            {/* Hover tooltip */}
            {hover && (
              <div className="sat-hover" style={{ left: hover.x + 12, top: hover.y - 40 }}>
                <span className="sat-hover-ndvi">{hover.ndvi.toFixed(3)}</span>
                <span className="sat-hover-cls">{lang === "zh" ? CLASS_META[hover.cls].zh : CLASS_META[hover.cls].label}</span>
                <span className="sat-hover-coord">{hover.lat.toFixed(3)}°N, {hover.lng.toFixed(3)}°E</span>
              </div>
            )}
            {/* Canvas labels */}
            <div className="sat-canvas-tag">
              <span>{geeImage && mode === "monitor" ? "Sentinel-2 L2A" : (isLive ? "GEE-modeled" : "Simulated")} · Apr–Oct {year}</span>
              {mode === "change" && <span className="sat-tag-change">{yearB} → {year}</span>}
            </div>
            {/* Year indicator during playback */}
            {playing && <div className="sat-year-overlay">{year}</div>}
          </div>

          {/* Legend */}
          <div className="sat-legend-strip">
            {mode === "monitor" && <><div className="sat-legend-bar ndvi-legend" /><div className="sat-legend-ticks"><span>0.0 Bare</span><span>0.2</span><span>0.4</span><span>0.6+ Dense</span></div></>}
            {mode === "change" && <><div className="sat-legend-bar change-legend" /><div className="sat-legend-ticks"><span>Loss</span><span>No change</span><span>Gain</span></div></>}
            {mode === "classify" && (
              <div className="sat-class-legend">
                {Object.entries(CLASS_META).map(([k, v]) => (
                  <span key={k} className="sat-class-chip"><span className="sat-class-dot" style={{ background: v.color }} />{lang === "zh" ? v.zh : v.label}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Analysis */}
        <div className="sat-analysis">
          {stats && mode !== "change" && (
            <div className="sat-panel-card">
              <h4>
                {lang === "zh" ? "区域概况" : "Region Overview"}
                <span className={`sat-src-badge ${stats.source === "gee" ? "gee" : ""}`}>{stats.source === "gee" ? "GEE" : "LOCAL"}</span>
                {statsLoading && <span className="sat-loading-dot" />}
              </h4>
              <div className="sat-stat-grid">
                <div className="sat-stat-item"><span className="sat-stat-num" style={{ color: "#91cf60" }}>{stats.mean.toFixed(3)}</span><span className="sat-stat-label">Mean NDVI</span></div>
                <div className="sat-stat-item"><span className="sat-stat-num" style={{ color: "#4CAF50" }}>{stats.vegPct.toFixed(0)}%</span><span className="sat-stat-label">{lang === "zh" ? "植被" : "Vegetated"}</span></div>
                <div className="sat-stat-item"><span className="sat-stat-num" style={{ color: "#D4A843" }}>{stats.barePct.toFixed(0)}%</span><span className="sat-stat-label">{lang === "zh" ? "裸地" : "Bare"}</span></div>
                <div className="sat-stat-item"><span className="sat-stat-num" style={{ color: "#1a9850" }}>{stats.max.toFixed(3)}</span><span className="sat-stat-label">Peak</span></div>
              </div>
            </div>
          )}

          {mode === "change" && changeStats && (
            <div className="sat-panel-card">
              <h4>
                {lang === "zh" ? "变化分析" : "Change Analysis"} ({yearB}→{year})
                <span className={`sat-src-badge ${changeStats.source === "gee" ? "gee" : ""}`}>{changeStats.source === "gee" ? "GEE" : "LOCAL"}</span>
                {changeLoading && <span className="sat-loading-dot" />}
              </h4>
              <div className="sat-change-summary">
                <div className="sat-change-row"><span className="sat-change-indicator gain" /><span>{lang === "zh" ? "植被增长" : "Gain"}</span><strong>{changeStats.gainedPct.toFixed(1)}%</strong></div>
                <div className="sat-change-row"><span className="sat-change-indicator loss" /><span>{lang === "zh" ? "退化" : "Loss"}</span><strong>{changeStats.lostPct.toFixed(1)}%</strong></div>
                <div className="sat-change-row"><span className="sat-change-indicator stable" /><span>{lang === "zh" ? "稳定" : "Stable"}</span><strong>{changeStats.stablePct.toFixed(1)}%</strong></div>
                <div className="sat-change-mean">{lang === "zh" ? "均值变化" : "Mean Δ"}: <strong style={{ color: changeStats.meanChange >= 0 ? "#4CAF50" : "#ef5350" }}>{changeStats.meanChange >= 0 ? "+" : ""}{changeStats.meanChange.toFixed(4)}</strong></div>
              </div>
            </div>
          )}

          {mode === "classify" && stats && (
            <div className="sat-panel-card">
              <h4>{lang === "zh" ? "土地分类" : "Land Classification"}</h4>
              <div className="sat-class-bars">
                {Object.entries(CLASS_META).map(([k, v]) => (
                  <div key={k} className="sat-class-bar-row">
                    <span className="sat-class-bar-label">{lang === "zh" ? v.zh : v.label}</span>
                    <div className="sat-class-bar-track"><div className="sat-class-bar-fill" style={{ width: `${stats.pcts[k] || 0}%`, background: v.color }} /></div>
                    <span className="sat-class-bar-pct">{stats.pcts[k] || 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="sat-panel-card">
            <h4><FiAlertTriangle size={13} style={{ color: "#FF9800" }} /> {lang === "zh" ? "关注区域" : "Alerts"}{alerts.length > 0 && <span className="sat-alert-count">{alerts.length}</span>}</h4>
            {alerts.length === 0 ? (
              <p className="sat-no-alerts">{lang === "zh" ? "无显著退化" : "No degradation detected"}</p>
            ) : (
              <div className="sat-alert-list">
                {alerts.map((a, i) => (
                  <div key={i} className="sat-alert-item">
                    <span className="sat-alert-dot" />
                    <div><span className="sat-alert-loc">{a.lat}°N, {a.lng}°E</span><span className="sat-alert-detail">NDVI {a.drop}% · was {a.from}</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="sat-panel-card sat-info-footer">
            <div className="sat-info-row"><span>Source</span><span>{isLive ? "Sentinel-2 L2A" : "Simulated"}</span></div>
            <div className="sat-info-row"><span>Resolution</span><span>{isLive ? "10m/pixel" : "~1km"}</span></div>
            <div className="sat-info-row"><span>Cloud mask</span><span>{isLive ? "SCL < 20%" : "N/A"}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
