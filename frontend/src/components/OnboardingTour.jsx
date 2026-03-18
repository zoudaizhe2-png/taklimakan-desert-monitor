import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (!localStorage.getItem("onboarding_done")) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  }

  function dismiss() {
    localStorage.setItem("onboarding_done", "1");
    setVisible(false);
  }

  const currentStep = STEPS[step];

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        {step === 0 && <h3>{t("onboarding_welcome")}</h3>}
        <p className="onboarding-text">{t(currentStep.key)}</p>
        <div className="onboarding-progress">
          {STEPS.map((_, i) => (
            <span key={i} className={`onboarding-dot ${i === step ? "active" : ""} ${i < step ? "done" : ""}`} />
          ))}
        </div>
        <div className="onboarding-actions">
          <button className="onboarding-skip" onClick={dismiss}>{t("onboarding_skip")}</button>
          <button className="onboarding-next" onClick={handleNext}>
            {step === STEPS.length - 1 ? t("onboarding_finish") : t("onboarding_next")}
          </button>
        </div>
      </div>
    </div>
  );
}
