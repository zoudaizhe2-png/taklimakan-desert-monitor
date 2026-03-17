import FadeSection from "../FadeSection";
import { FiCheck, FiLock } from "react-icons/fi";

const RECENT_DONORS = [
  { name: "Zhang W.", tier: "guardian", snake: "Explorer-7", time: "2m ago", time_zh: "2分钟前" },
  { name: "Sarah K.", tier: "patron", snake: "Dune Runner", time: "8m ago", time_zh: "8分钟前" },
  { name: "Anonymous", tier: "supporter", snake: null, time: "12m ago", time_zh: "12分钟前" },
  { name: "Li M.", tier: "founder", snake: "Oasis Watch", time: "25m ago", time_zh: "25分钟前" },
  { name: "David R.", tier: "patron", snake: "Green Scout", time: "41m ago", time_zh: "41分钟前" },
  { name: "王芳", tier: "guardian", snake: "Sandwalker", time: "1h ago", time_zh: "1小时前" },
  { name: "Emma L.", tier: "supporter", snake: null, time: "1h ago", time_zh: "1小时前" },
  { name: "陈明", tier: "patron", snake: "Desert Eye", time: "2h ago", time_zh: "2小时前" },
  { name: "Alex T.", tier: "supporter", snake: null, time: "3h ago", time_zh: "3小时前" },
  { name: "赵丽", tier: "founder", snake: "Star Watcher", time: "4h ago", time_zh: "4小时前" },
];

const TIER_COLORS = { supporter: "#4fc3f7", patron: "#66bb6a", guardian: "#FFC107", founder: "#E040FB" };

const MILESTONES_LIST = [
  { donors: 1000, label_en: "Community Forum Launched", label_zh: "社区论坛上线", reached: true },
  { donors: 2000, label_en: "Live Feed Access for All", label_zh: "全员直播", reached: true },
  { donors: 2500, label_en: "Monthly Video Report", label_zh: "月度视频报告", reached: true },
  { donors: 3000, label_en: "Real-time Snake Dashboard", label_zh: "实时蛇形仪表盘", reached: false },
  { donors: 5000, label_en: "Community Voting on Snake Names", label_zh: "社区投票命名蛇形机器人", reached: false },
  { donors: 10000, label_en: "24/7 Multi-Camera Stream", label_zh: "24/7多机位直播", reached: false },
];

export default function DonorWall({ zh }) {
  return (
    <FadeSection className="donor-wall-section">
      <h2>{zh ? "社区动态" : "Community Activity"}</h2>
      <div className="donor-wall-layout">
        <div className="donor-ticker">
          <h3>{zh ? "最近捐赠" : "Recent Donors"}</h3>
          <div className="donor-ticker-list">
            {RECENT_DONORS.map((d, i) => (
              <div key={i} className="donor-ticker-item">
                <span className="donor-badge" style={{ background: TIER_COLORS[d.tier] }}>{d.tier[0].toUpperCase()}</span>
                <div className="donor-ticker-info">
                  <span className="donor-ticker-name">{d.name}</span>
                  {d.snake && <span className="donor-ticker-snake">{zh ? "认领了" : "adopted"} {d.snake}</span>}
                </div>
                <span className="donor-ticker-time">{zh ? d.time_zh : d.time}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="milestone-timeline">
          <h3>{zh ? "里程碑" : "Milestones"}</h3>
          <div className="milestone-list">
            {MILESTONES_LIST.map((m, i) => (
              <div key={i} className={`milestone-item ${m.reached ? "reached" : "locked"}`}>
                <div className="milestone-icon-wrap">
                  {m.reached ? <FiCheck size={14} /> : <FiLock size={12} />}
                </div>
                <div className="milestone-info">
                  <span className="milestone-label">{zh ? m.label_zh : m.label_en}</span>
                  <span className="milestone-donors">{m.donors.toLocaleString()} {zh ? "位捐赠者" : "donors"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </FadeSection>
  );
}
