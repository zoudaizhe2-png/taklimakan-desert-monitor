import { createContext, useContext, useState } from "react";
import { translations } from "./translations";

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState("en");

  function t(key) {
    return translations[lang]?.[key] || translations.en[key] || key;
  }

  function localize(feature) {
    if (!feature) return { name: "", description: "" };
    return {
      name: lang === "zh" ? feature.name_zh : feature.name_en,
      description: lang === "zh" ? feature.description_zh : feature.description_en,
    };
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, localize }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
