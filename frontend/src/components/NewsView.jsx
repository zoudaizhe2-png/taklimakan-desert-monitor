import { useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { FiExternalLink, FiArrowRight } from "react-icons/fi";
import { NEWS_ARTICLES, CATEGORIES, LAST_UPDATED } from "../data/news-data";
import FadeSection from "./FadeSection";
import "./NewsView.css";

/* ── Category helpers ── */
const CAT_COLORS = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.color]));

function categoryColor(cat) {
  return CAT_COLORS[cat] || "#8b95a5";
}

/* ── Main component ── */
export default function NewsView({ onNavigate }) {
  const { t, language } = useLanguage();
  const [activeCat, setActiveCat] = useState("all");

  const filtered = activeCat === "all"
    ? NEWS_ARTICLES
    : NEWS_ARTICLES.filter((a) => a.category === activeCat);

  return (
    <div className="news-page">
      {/* Hero */}
      <div className="news-hero">
        <h1>{t("news_title")}</h1>
        <p className="news-hero-sub">{t("news_subtitle")}</p>
        <span className="news-hero-stat">{t("news_heroStat")}</span>
      </div>

      <div className="news-content">
        {/* Filter bar */}
        <FadeSection>
          <div className="news-filter-bar">
            <div className="news-pills">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  className={`news-pill ${activeCat === cat.id ? "active" : ""}`}
                  onClick={() => setActiveCat(cat.id)}
                  style={activeCat === cat.id ? { borderColor: cat.color + "50", color: cat.color, background: cat.color + "18" } : undefined}
                >
                  {t(`news_cat${cat.id === "all" ? "All" : cat.id === "greenbelt" ? "GreenBelt" : cat.id === "water" ? "Water" : cat.id === "policy" ? "Policy" : cat.id === "kekeya" ? "Kekeya" : "Tech"}`)}
                </button>
              ))}
            </div>
            <span className="news-updated">{t("news_lastUpdated")}: {LAST_UPDATED}</span>
          </div>
        </FadeSection>

        {/* Card grid */}
        <div className="news-grid">
          {filtered.length === 0 && (
            <div className="news-no-results">{t("news_noResults")}</div>
          )}
          {filtered.map((article, i) => (
            <FadeSection key={article.id}>
              <a
                className="news-card"
                href={article.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div
                  className="news-card-gradient"
                  style={{ background: `linear-gradient(90deg, ${categoryColor(article.category)}, ${categoryColor(article.category)}44)` }}
                />
                <span
                  className="news-card-category"
                  style={{ color: categoryColor(article.category), background: categoryColor(article.category) + "18" }}
                >
                  {t(`news_cat${article.category === "greenbelt" ? "GreenBelt" : article.category === "water" ? "Water" : article.category === "policy" ? "Policy" : article.category === "kekeya" ? "Kekeya" : "Tech"}`)}
                </span>
                <h3 className="news-card-title">
                  {language === "zh" ? article.titleZh : article.titleEn}
                </h3>
                <p className="news-card-desc">
                  {language === "zh" ? article.descZh : article.descEn}
                </p>
                <div className="news-card-footer">
                  <span>
                    <span className="news-card-source">{article.source}</span> · {article.date}
                  </span>
                  <FiExternalLink size={13} className="news-card-link-icon" />
                </div>
              </a>
            </FadeSection>
          ))}
        </div>

        {/* CTA */}
        <FadeSection>
          <div className="news-cta-section">
            <p>{t("news_ctaMonitor")}</p>
            <button className="news-cta-btn" onClick={() => onNavigate("monitor")}>
              {t("viewMonitor")} <FiArrowRight size={14} />
            </button>
          </div>
        </FadeSection>
      </div>
    </div>
  );
}
