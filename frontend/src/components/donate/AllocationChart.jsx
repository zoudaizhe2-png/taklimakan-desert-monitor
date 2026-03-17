import FadeSection from "../FadeSection";

const SEGMENTS = [
  { label_en: "Snake Robot Fleet", label_zh: "蛇形机器人队", pct: 35, color: "#4fc3f7" },
  { label_en: "Satellite Monitoring", label_zh: "卫星监测", pct: 25, color: "#66bb6a" },
  { label_en: "Tree Planting", label_zh: "植树造林", pct: 20, color: "#FFC107" },
  { label_en: "Field Research", label_zh: "实地研究", pct: 15, color: "#CE93D8" },
  { label_en: "Operations", label_zh: "运营开支", pct: 5, color: "#ef5350" },
];

export default function AllocationChart({ zh }) {
  const R = 80, CX = 100, CY = 100, STROKE = 28;
  const CIRC = 2 * Math.PI * R;

  // Pre-compute offsets to avoid reassigning during render
  const offsets = [];
  let runningOffset = 0;
  for (const seg of SEGMENTS) {
    offsets.push(runningOffset);
    runningOffset += (seg.pct / 100) * CIRC;
  }

  return (
    <FadeSection className="allocation-section">
      <h2>{zh ? "资金分配" : "Fund Allocation"}</h2>
      <div className="allocation-layout">
        <svg viewBox="0 0 200 200" className="allocation-donut" width="200" height="200">
          {SEGMENTS.map((seg, idx) => {
            const dash = (seg.pct / 100) * CIRC;
            const gap = CIRC - dash;
            return (
              <circle
                key={seg.label_en}
                cx={CX} cy={CY} r={R}
                fill="none"
                stroke={seg.color}
                strokeWidth={STROKE}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={-offsets[idx]}
                style={{ transition: "stroke-dashoffset 0.8s ease" }}
              />
            );
          })}
          <text x={CX} y={CY - 4} textAnchor="middle" fill="#e0e8f0" fontSize="18" fontWeight="800">100%</text>
          <text x={CX} y={CY + 14} textAnchor="middle" fill="#6a7a8a" fontSize="10">{zh ? "透明分配" : "Transparent"}</text>
        </svg>
        <div className="allocation-legend">
          {SEGMENTS.map(seg => (
            <div key={seg.label_en} className="allocation-legend-row">
              <span className="allocation-dot" style={{ background: seg.color }} />
              <span className="allocation-label">{zh ? seg.label_zh : seg.label_en}</span>
              <span className="allocation-pct">{seg.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </FadeSection>
  );
}
