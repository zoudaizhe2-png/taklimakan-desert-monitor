import { useState, useEffect, useRef } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import "./OnboardingTour.css";

const STEPS = [
  { key: "onboarding_step1", target: ".map-area" },
  { key: "onboarding_step2", target: ".filter-chips" },
  { key: "onboarding_step3", target: ".map-sat-toggle" },
  { key: "onboarding_step4", target: ".slide-panel" },
  { key: "onboarding_step5", target: ".export-btn" },
];

export default function OnboardingTour() {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const skipBtnRef = useRef(null);
  const cardRef = useRef(null);

  useEffect(() => {
    if (!localStorage.getItem("onboarding_done")) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem("onboarding_done", "1");
    setVisible(false);
  }

  // ESC dismisses the tour + focus trap.
  useEffect(() => {
    if (!visible) return undefined;
    function onKey(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        dismiss();
      } else if (e.key === "Tab") {
        const root = cardRef.current;
        if (!root) return;
        const focusable = root.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible]);

  // Focus the Skip button on first render.
  useEffect(() => {
    if (visible && skipBtnRef.current) {
      skipBtnRef.current.focus();
    }
  }, [visible]);

  if (!visible) return null;

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  }

  const currentStep = STEPS[step];
  const titleId = "onboarding-title";

  return (
    <div className="onboarding-overlay">
      <div
        ref={cardRef}
        className="onboarding-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {step === 0 && <h3 id={titleId}>{t("onboarding_welcome")}</h3>}
        <p id={step === 0 ? undefined : titleId} className="onboarding-text">{t(currentStep.key)}</p>
        <div className="onboarding-progress">
          {STEPS.map((_, i) => (
            <span key={i} className={`onboarding-dot ${i === step ? "active" : ""} ${i < step ? "done" : ""}`} />
          ))}
        </div>
        <div className="onboarding-actions">
          <button ref={skipBtnRef} className="onboarding-skip" onClick={dismiss}>{t("onboarding_skip")}</button>
          <button className="onboarding-next" onClick={handleNext}>
            {step === STEPS.length - 1 ? t("onboarding_finish") : t("onboarding_next")}
          </button>
        </div>
      </div>
    </div>
  );
}
