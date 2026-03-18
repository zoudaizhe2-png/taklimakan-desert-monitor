import { useState, useEffect, useRef } from "react";
import { FiBell } from "react-icons/fi";
import { useLanguage } from "../i18n/LanguageContext";
import { fetchAlerts, acknowledgeAlert } from "../api/client";
import "./AlertBell.css";

export default function AlertBell({ wsMessage }) {
  const { t, language } = useLanguage();
  const [alerts, setAlerts] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    fetchAlerts().then(setAlerts).catch(() => {});
  }, []);

  // Handle incoming WebSocket alerts
  useEffect(() => {
    if (wsMessage?.type === "alert") {
      setAlerts((prev) => [wsMessage, ...prev]);
    }
  }, [wsMessage]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const unread = alerts.filter((a) => !a.acknowledged).length;

  async function handleAcknowledge(id) {
    try {
      await acknowledgeAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch { /* ignore */ }
  }

  return (
    <div className="alert-bell-wrapper" ref={ref}>
      <button className="alert-bell" onClick={() => setOpen(!open)} aria-label={t("alerts_title")}>
        <FiBell size={16} />
        {unread > 0 && <span className="alert-badge">{unread}</span>}
      </button>
      {open && (
        <div className="alert-dropdown" role="region" aria-live="polite">
          <h4>{t("alerts_title")}</h4>
          {alerts.length === 0 && <p className="alert-empty">{t("alerts_empty")}</p>}
          {alerts.map((alert) => (
            <div key={alert.id} className={`alert-item severity-${alert.severity}`}>
              <span className="alert-title">{language === "zh" ? alert.title_zh || alert.title_en : alert.title_en}</span>
              <button className="alert-dismiss" onClick={() => handleAcknowledge(alert.id)}>{t("alerts_acknowledge")}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
