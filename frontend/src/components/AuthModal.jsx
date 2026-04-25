import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import "./AuthModal.css";

export default function AuthModal({ open, onClose }) {
  const { t } = useLanguage();
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const emailInputRef = useRef(null);
  const modalRef = useRef(null);

  // ESC closes the modal.
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      } else if (e.key === "Tab") {
        // Trap focus inside the modal.
        const root = modalRef.current;
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
  }, [open, onClose]);

  // Focus the email input when modal opens.
  useEffect(() => {
    if (open && emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, displayName, password);
      }
      onClose();
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  const titleId = "auth-modal-title";

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div
        ref={modalRef}
        className="auth-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId}>{mode === "login" ? t("auth_login") : t("auth_register")}</h2>
        <form onSubmit={handleSubmit}>
          <input
            ref={emailInputRef}
            type="email"
            placeholder={t("auth_email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {mode === "register" && (
            <input
              type="text"
              placeholder={t("auth_displayName")}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          )}
          <input
            type="password"
            placeholder={t("auth_password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "..." : mode === "login" ? t("auth_login") : t("auth_register")}
          </button>
        </form>
        <p className="auth-switch">
          {mode === "login" ? t("auth_noAccount") : t("auth_hasAccount")}{" "}
          <button type="button" className="auth-switch-btn" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}>
            {mode === "login" ? t("auth_register") : t("auth_login")}
          </button>
        </p>
      </div>
    </div>
  );
}
