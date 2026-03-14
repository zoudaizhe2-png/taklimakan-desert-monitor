import { useRef, useEffect } from "react";
import { ReactCompareSlider } from "react-compare-slider";

function ndviToColor(ndvi) {
  if (ndvi < 0.1) return "#d73027";
  if (ndvi < 0.2) return "#fc8d59";
  if (ndvi < 0.3) return "#fee08b";
  if (ndvi < 0.4) return "#d9ef8b";
  if (ndvi < 0.6) return "#91cf60";
  return "#1a9850";
}

function NDVICanvas({ gridData, year, width = 300, height = 200 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!gridData || gridData.length === 0 || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, width, height);

    const lats = gridData.map((p) => p.lat);
    const lngs = gridData.map((p) => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const latRange = maxLat - minLat || 1;
    const lngRange = maxLng - minLng || 1;

    const dotSize = Math.max(3, Math.min(width, height) / 45);

    gridData.forEach((point) => {
      const x = ((point.lng - minLng) / lngRange) * (width - 20) + 10;
      const y = height - (((point.lat - minLat) / latRange) * (height - 20) + 10);
      ctx.fillStyle = ndviToColor(point.ndvi);
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(x, y, dotSize, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }, [gridData, width, height]);

  return (
    <div style={{ position: "relative" }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ width: "100%", height: "auto", borderRadius: 6 }} />
      <div className="compare-year-label">{year}</div>
    </div>
  );
}

export default function NDVICompareSlider({ gridYear1, gridYear2, year1, year2 }) {
  if (!gridYear1?.length || !gridYear2?.length) return null;

  return (
    <div className="compare-slider-container">
      <h3>Before / After Comparison</h3>
      <ReactCompareSlider
        itemOne={<NDVICanvas gridData={gridYear1} year={year1} />}
        itemTwo={<NDVICanvas gridData={gridYear2} year={year2} />}
        style={{ borderRadius: 8 }}
      />
      <div className="compare-labels">
        <span>{year1}</span>
        <span>{year2}</span>
      </div>
    </div>
  );
}
