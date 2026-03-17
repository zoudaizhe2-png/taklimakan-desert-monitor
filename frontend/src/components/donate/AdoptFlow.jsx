import { useState } from "react";
import { FiCheck, FiChevronRight } from "react-icons/fi";
import ZoneSelectMap from "./ZoneSelectMap";
import FadeSection from "../FadeSection";

const ZONE_LABELS = {
  hotan: { en: "Hotan Green Belt", zh: "和田绿化带" },
  highway: { en: "Desert Highway", zh: "沙漠公路" },
  korla: { en: "Korla Oasis", zh: "库尔勒绿洲" },
  minfeng: { en: "Minfeng Belt", zh: "民丰防护林" },
  alar: { en: "Alar Shelterbelt", zh: "阿拉尔防护林" },
};

const STEPS = [
  { label_en: "Choose", label_zh: "选择" },
  { label_en: "Name", label_zh: "命名" },
  { label_en: "Confirm", label_zh: "确认" },
];

export default function AdoptFlow({ adoptStep, setAdoptStep, selectedTier, snakeName, setSnakeName, zh, tiers, tierLabels }) {
  const [selectedZone, setSelectedZone] = useState(null);
  const [showToast, setShowToast] = useState(false);

  const tier = tiers.find(t => t.id === selectedTier);
  if (!tier || adoptStep === 0) return null;

  const zoneLabel = selectedZone ? (zh ? ZONE_LABELS[selectedZone].zh : ZONE_LABELS[selectedZone].en) : "";

  const handleComplete = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <FadeSection className="adopt-flow-section">
      {/* Step indicator */}
      <div className="adopt-stepper">
        {STEPS.map((s, i) => (
          <div key={i} className={`adopt-step-dot ${adoptStep > i ? "done" : ""} ${adoptStep === i + 1 ? "active" : ""}`}>
            <div className="adopt-step-circle">
              {adoptStep > i + 1 ? <FiCheck size={12} /> : i + 1}
            </div>
            <span>{zh ? s.label_zh : s.label_en}</span>
          </div>
        ))}
        <div className="adopt-step-line" />
      </div>

      {/* Step 1: Name + Zone */}
      {adoptStep === 1 && (
        <div className="adopt-body">
          <div className="adopt-name-zone">
            <div className="adopt-input-group">
              <label>{zh ? "为你的蛇形机器人命名" : "Name Your Snake"}</label>
              <input
                type="text"
                value={snakeName}
                onChange={e => setSnakeName(e.target.value.slice(0, 20))}
                placeholder={zh ? "例如：沙漠探索者" : "e.g. Desert Explorer"}
                className="adopt-name-input"
                maxLength={20}
              />
              <span className="adopt-char-count">{snakeName.length}/20</span>
            </div>
            <div className="adopt-zone-group">
              <label>{zh ? "选择巡逻区域" : "Select Patrol Zone"}</label>
              <ZoneSelectMap selectedZone={selectedZone} onSelectZone={setSelectedZone} zh={zh} />
            </div>
          </div>
          {/* Preview card */}
          <div className="adopt-preview">
            <div className="adopt-preview-card" style={{ borderColor: tier.color }}>
              <span className="adopt-preview-icon">{tier.icon}</span>
              <div className="adopt-preview-details">
                <strong style={{ color: tier.color }}>{snakeName || (zh ? "未命名" : "Unnamed")}</strong>
                <span>{zoneLabel || (zh ? "未选择区域" : "No zone selected")}</span>
                <span className="adopt-preview-tier">{tierLabels[tier.id].name} — ${tier.price}/{tier.period === "mo" ? (zh ? "月" : "mo") : (zh ? "一次性" : "once")}</span>
              </div>
            </div>
          </div>
          <button
            className="adopt-next-btn"
            disabled={!snakeName.trim() || !selectedZone}
            onClick={() => setAdoptStep(2)}
            style={{ background: tier.color, color: tier.color === "#FFC107" ? "#333" : "#fff" }}
          >
            {zh ? "下一步" : "Next"} <FiChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Step 2: Confirm */}
      {adoptStep === 2 && (
        <div className="adopt-body">
          <div className="adopt-confirm-card" style={{ borderColor: tier.color }}>
            <div className="adopt-confirm-header">
              <span className="adopt-confirm-icon">{tier.icon}</span>
              <h3 style={{ color: tier.color }}>{snakeName}</h3>
            </div>
            <div className="adopt-confirm-grid">
              <div className="adopt-confirm-item">
                <span className="adopt-confirm-label">{zh ? "等级" : "Tier"}</span>
                <span>{tierLabels[tier.id].name}</span>
              </div>
              <div className="adopt-confirm-item">
                <span className="adopt-confirm-label">{zh ? "区域" : "Zone"}</span>
                <span>{zoneLabel}</span>
              </div>
              <div className="adopt-confirm-item">
                <span className="adopt-confirm-label">{zh ? "费用" : "Cost"}</span>
                <span>${tier.price}/{tier.period === "mo" ? (zh ? "月" : "mo") : (zh ? "一次性" : "once")}</span>
              </div>
            </div>
            <button
              className="adopt-complete-btn"
              onClick={handleComplete}
              style={{ background: tier.color, color: tier.color === "#FFC107" ? "#333" : "#fff" }}
            >
              {zh ? "完成认领" : "Complete Adoption"} 🎉
            </button>
            <button className="adopt-back-btn" onClick={() => setAdoptStep(1)}>
              {zh ? "返回修改" : "← Back"}
            </button>
          </div>
          {showToast && (
            <div className="adopt-toast">
              {zh ? "功能即将上线！敬请期待。" : "Coming soon! This feature is under development."}
            </div>
          )}
        </div>
      )}
    </FadeSection>
  );
}
