import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchWeeklySummary, generateWeeklySummary } from "./adminApi";

export default function WeeklySummaryCard() {
  const { t, i18n } = useTranslation();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState("");

  async function loadSummary() {
    setLoading(true);
    try {
      const data = await fetchWeeklySummary(i18n.language);
      setSummary(data);
    } catch {
      setSummary(null);
    }
    setLoading(false);
  }

  useEffect(function () { loadSummary(); }, [i18n.language]);

  async function handleGenerate() {
    setGenerating(true);
    setGenMsg("");
    try {
      const result = await generateWeeklySummary(i18n.language);
      if (result.summary_text) {
        setGenMsg(t("admin_gen_success"));
        await loadSummary();
      } else {
        setGenMsg(t("admin_gen_timeout", "Generation timed out — please try again."));
      }
    } catch {
      setGenMsg(t("admin_gen_timeout", "Generation timed out — please try again."));
    }
    setGenerating(false);
    setTimeout(function () { setGenMsg(""); }, 4000);
  }

  return (
    <div>
      {/* Generate button row */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        <button className="adm-generate-btn" onClick={handleGenerate} disabled={generating}>
          {generating ? (
            <>
              <span className="adm-generate-spinner" />
              {t("admin_generating")}
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 110 20 10 10 0 010-20z" /><path d="M12 6v6l4 2" />
              </svg>
              {t("admin_generate_btn")}
            </>
          )}
        </button>
        {genMsg && (
          <span style={{
            fontSize: "13px",
            color: genMsg === t("admin_gen_success") ? "var(--teal)" : "var(--coral)",
            fontWeight: 600,
          }}>
            {genMsg}
          </span>
        )}
      </div>

      {/* Summary card */}
      <div className="adm-weekly-card">
        {loading ? (
          <>
            <div className="adm-skeleton" style={{ height: "16px", width: "180px", marginBottom: "14px" }} />
            <div className="adm-skeleton" style={{ height: "13px", width: "100%", marginBottom: "8px" }} />
            <div className="adm-skeleton" style={{ height: "13px", width: "85%" }} />
          </>
        ) : !summary || !summary.summary_text ? (
          <div className="adm-weekly-header">
            <h3 className="adm-weekly-title">🤖 {t("admin_weekly_title")}</h3>
            <p className="adm-weekly-empty" style={{ marginTop: "10px" }}>
              {t("admin_weekly_empty")}
            </p>
          </div>
        ) : (
          <>
            <div className="adm-weekly-header">
              <h3 className="adm-weekly-title">🤖 {t("admin_weekly_title")}</h3>
              {summary.week_start && summary.week_end && (
                <span className="adm-weekly-date-chip">
                  {summary.week_start} → {summary.week_end}
                </span>
              )}
            </div>
            <p className="adm-weekly-text">{summary.summary_text}</p>
            {summary.generated_at && (
              <p className="adm-weekly-generated">
                {t("admin_weekly_generated")} {summary.generated_at}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
