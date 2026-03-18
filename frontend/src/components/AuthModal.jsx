import { useState } from "react";
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

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{mode === "login" ? t("auth_login") : t("auth_register")}</h2>
        <form onSubmit={handleSubmit}>
          <input
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
