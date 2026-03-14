import { useLanguage } from "../i18n/LanguageContext";

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  return (
    <div className="lang-toggle">
      <button
        className={lang === "en" ? "active" : ""}
        onClick={() => setLang("en")}
      >
        EN
      </button>
      <span className="lang-divider">|</span>
      <button
        className={lang === "zh" ? "active" : ""}
        onClick={() => setLang("zh")}
      >
        中文
      </button>
    </div>
  );
}
