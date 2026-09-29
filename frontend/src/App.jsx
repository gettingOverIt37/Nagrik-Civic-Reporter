import { useState } from "react";
import { useTranslation } from "react-i18next";
import ReportForm from "./components/ReportForm";
import MapView from "./components/MapView";
import LanguageSwitcher from "./components/LanguageSwitcher";
import ThemeToggle from "./components/ThemeToggle";
import HelplineButton from "./components/HelplineButton";
import CategoryIcon from "./constants/categoryIcons";
import { CATEGORY_COLORS } from "./constants/categoryColors";
import AdminApp from "./admin/AdminApp";

const HERO_CATEGORIES = ["pothole", "garbage", "streetlight", "drainage", "water_leakage", "stray_animals"];

export default function App() {
  const { t, i18n } = useTranslation();
  const [isMapOpen, setIsMapOpen] = useState(false);

  if (window.location.pathname === "/admin") {
    return <AdminApp />;
  }

  // Reuse the existing single translation key as-is (no i18n file changes
  // needed) — just highlight the last word of whatever comes back.
  const heroLead = t("hero_lead", "Spot it. Snap it.");
  const heroHighlight = t("hero_highlight", "Report it.");

  return (
    <div className="app-shell">
      <div className="app-content">

        {/* ── HERO ── */}
        <div className="hero-band">
          <div className="container">
            <nav className="nav-bar">
              <div className="brand-group">
                <div className="brand-mark">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="13" r="4.2" />
                    <path d="M4 8.5h3l1.5-2.5h7L17 8.5h3a1.5 1.5 0 011.5 1.5v9A1.5 1.5 0 0120 20.5H4A1.5 1.5 0 012.5 19v-9A1.5 1.5 0 014 8.5z" />
                  </svg>
                </div>
                <div>
                  <div className="brand-name">Nagrik</div>
                  <div className="brand-tag">Civic reporter</div>
                </div>
              </div>

              <div className="nav-right">
                <a className="admin-link" href="/admin">{t("admin_link", "Admin")}</a>
                <ThemeToggle />
                <LanguageSwitcher />
              </div>
            </nav>

            <div className="hero-grid">
              <div>
                <h1 className="hero-heading">
                  {heroLead} <span className="hl">{heroHighlight}</span>
                </h1>
                <p className="hero-sub">
                  {t("hero_subheading", "Take a photo of any civic issue. AI will categorize, describe, and send it directly to municipal authorities.")}
                </p>
                <div className="hero-stats">
                  <div>
                    <div className="hero-stat-num">AI</div>
                    <div className="hero-stat-label">{t("stat_powered", "Powered")}</div>
                  </div>
                  <div>
                    <div className="hero-stat-num">{Object.keys(i18n.options.resources || {}).length}</div>
                    <div className="hero-stat-label">{t("stat_languages", "Languages")}</div>
                  </div>
                </div>
              </div>

              <div className="cat-grid">
                {HERO_CATEGORIES.map(function (cat) {
                  const color = CATEGORY_COLORS[cat];
                  return (
                    <div className="cat-badge" key={cat} style={{ "--badge-accent": color }}>
                      <div className="cat-icon-wrap" style={{ background: color }}>
                        <CategoryIcon category={cat} size={15} color="#fff" />
                      </div>
                      <span>{t("category_" + cat)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div className="content-band">
          <div className="container content-grid">

            <div>
              <div className="section-head">
                <div className="bar" />
                <h2>{t("report_section_title", "Report a Civic Issue")}</h2>
              </div>

              <ReportForm />

              <div className="map-trigger">
                <div className="map-trigger-text">
                  <div className="map-trigger-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
                      <path d="M9 4v14M15 6v14" />
                    </svg>
                  </div>
                  <div>
                    <div className="map-trigger-title">{t("map_section_title", "Issues Near You")}</div>
                    <div className="map-trigger-sub">{t("map_trigger_sub", "See what's been reported near you")}</div>
                  </div>
                </div>
                <button className="map-btn" onClick={function () { setIsMapOpen(true); }}>
                  {t("view_map", "View map")}
                </button>
              </div>
            </div>

            <div className="side-card">
              <h3>{t("how_it_works_title", "How reporting works")}</h3>
              <div className="side-step">
                <div className="side-step-num">1</div>
                <div className="side-step-text">
                  <b>{t("how_step1_title", "Snap a photo")}</b> {t("how_step1_body", "of the issue — pothole, garbage, broken light, anything civic.")}
                </div>
              </div>
              <div className="side-step">
                <div className="side-step-num">2</div>
                <div className="side-step-text">
                  <b>{t("how_step2_title", "AI reads it")}</b> {t("how_step2_body", "— category, description and severity fill in automatically.")}
                </div>
              </div>
              <div className="side-step">
                <div className="side-step-num">3</div>
                <div className="side-step-text">
                  <b>{t("how_step3_title", "Sent to your ward")}</b> {t("how_step3_body", "office, with your location attached.")}
                </div>
              </div>
            </div>

          </div>
        </div>

        <footer className="site-footer">
          Nagrik — Be the voice of your city
        </footer>

        <HelplineButton />
      </div>

      <MapView isOpen={isMapOpen} onClose={function () { setIsMapOpen(false); }} />
    </div>
  );
}
