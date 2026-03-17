import { useState, useEffect, useRef } from "react";
import useFadeIn from "../../hooks/useFadeIn";

const MILESTONES = [
  { amount: 50000, label_en: "10 New Snakes", label_zh: "10条新蛇" },
  { amount: 100000, label_en: "Satellite Upgrade", label_zh: "卫星升级" },
  { amount: 175000, label_en: "Field Trip Funded", label_zh: "考察经费" },
  { amount: 250000, label_en: "Full Year Ops", label_zh: "全年运营" },
];

const GOAL = 250000;
const RAISED = 147800;
const DONORS = 2891;

export default function FundingGoalBar({ zh }) {
  const ref = useFadeIn();
  const [animatedPct, setAnimatedPct] = useState(0);
  const barRef = useRef(null);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setAnimatedPct((RAISED / GOAL) * 100); obs.unobserve(el); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} className="fade-section funding-goal-section">
      <div className="funding-bar-wrap" ref={barRef}>
        <div className="funding-bar-track">
          <div
            className="funding-bar-fill"
            style={{ width: `${animatedPct}%` }}
          />
          {MILESTONES.map(m => {
            const pct = (m.amount / GOAL) * 100;
            const reached = RAISED >= m.amount;
            return (
              <div key={m.amount} className={`funding-milestone ${reached ? "reached" : ""}`} style={{ left: `${pct}%` }}>
                <div className="funding-milestone-dot" />
                <span className="funding-milestone-label">{zh ? m.label_zh : m.label_en}</span>
                <span className="funding-milestone-amt">${(m.amount / 1000).toFixed(0)}k</span>
              </div>
            );
          })}
        </div>
        <div className="funding-stats">
          <span className="funding-raised">
            <strong>${RAISED.toLocaleString()}</strong> {zh ? "已筹集" : "raised"}{" "}
            {zh ? `共 $${GOAL.toLocaleString()}` : `of $${GOAL.toLocaleString()}`}
          </span>
          <span className="funding-pct">{Math.round((RAISED / GOAL) * 100)}% {zh ? "已完成" : "funded"}</span>
          <span className="funding-donors">{DONORS.toLocaleString()} {zh ? "位捐赠者" : "donors"}</span>
        </div>
      </div>
    </section>
  );
}
