import { DESERT_OUTLINE, GREEN_BELT_SEGMENTS } from "../../data/mapShapes";

const ZONES = [
  { id: "hotan", lng: 80.0, lat: 37.3, label_en: "Hotan", label_zh: "和田" },
  { id: "highway", lng: 83.6, lat: 39.0, label_en: "Highway", label_zh: "公路" },
  { id: "korla", lng: 86.5, lat: 41.0, label_en: "Korla", label_zh: "库尔勒" },
  { id: "minfeng", lng: 82.5, lat: 37.1, label_en: "Minfeng", label_zh: "民丰" },
  { id: "alar", lng: 81.0, lat: 40.8, label_en: "Alar", label_zh: "阿拉尔" },
];

// Map to a smaller viewBox for compact display
const VB_W = 400, VB_H = 230;
function proj(lng, lat) {
  const x = ((lng - 76) / 13) * VB_W;
  const y = ((42 - lat) / 6) * VB_H;
  return [x, y];
}

function miniPath(points, closed = false) {
  return points
    .map((p, i) => {
      const [x, y] = proj(p[0], p[1]);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ") + (closed ? " Z" : "");
}

export default function ZoneSelectMap({ selectedZone, onSelectZone, zh }) {
  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="zone-select-map" width="100%" style={{ maxWidth: 400 }}>
      {/* Desert outline */}
      <path d={miniPath(DESERT_OUTLINE, true)} fill="rgba(210,168,67,0.12)" stroke="#8B6914" strokeWidth="1" />

      {/* Green belts */}
      {GREEN_BELT_SEGMENTS.map(belt => (
        <path
          key={belt.id}
          d={miniPath(belt.points)}
          fill="none"
          stroke="rgba(102,187,106,0.5)"
          strokeWidth={belt.thickness * 0.8}
          strokeLinecap="round"
          strokeDasharray={belt.dashed ? "6 4" : "none"}
        />
      ))}

      {/* Zone dots */}
      {ZONES.map(z => {
        const [cx, cy] = proj(z.lng, z.lat);
        const active = selectedZone === z.id;
        return (
          <g key={z.id} onClick={() => onSelectZone(z.id)} style={{ cursor: "pointer" }}>
            {active && <circle cx={cx} cy={cy} r="14" fill="none" stroke="#4fc3f7" strokeWidth="2" opacity="0.6">
              <animate attributeName="r" from="12" to="18" dur="1.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite" />
            </circle>}
            <circle
              cx={cx} cy={cy} r="6"
              fill={active ? "#4fc3f7" : "#66bb6a"}
              stroke={active ? "#fff" : "none"}
              strokeWidth={active ? 2 : 0}
            />
            <text
              x={cx} y={cy - 10}
              textAnchor="middle"
              fill={active ? "#4fc3f7" : "#8a9aaa"}
              fontSize="9"
              fontWeight={active ? "700" : "400"}
            >
              {zh ? z.label_zh : z.label_en}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
