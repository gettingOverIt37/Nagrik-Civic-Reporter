import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";

const HELPLINES = [
  { name: "help_police", number: "100" },
  { name: "help_fire", number: "101" },
  { name: "help_ambulance", number: "102" },
  { name: "help_disaster", number: "108" },
  { name: "help_women", number: "1091" },
  { name: "help_child", number: "1098" },
  { name: "help_bbmp", number: "1533" },
  { name: "help_water", number: "1916" },
  { name: "help_electricity", number: "1912" },
  { name: "help_anti_corruption", number: "1064" },
  { name: "help_traffic", number: "1095" },
];

export default function HelplineButton() {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <>
      {/* Dropdown list — opens upward from button */}
      {open && (
        <>
          {/* Backdrop to close on outside click */}
          <div
            style={{
              position: "fixed", inset: 0, zIndex: 998,
            }}
            onClick={function () { setOpen(false); }}
          />

          <div className="helpline-dropdown">
            <div className="helpline-header">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 2 .7 2.9a2 2 0 01-.5 2.1L8.1 9.9a16 16 0 006 6l1.2-1.2a2 2 0 012.1-.5c.9.3 1.9.6 2.9.7A2 2 0 0122 16.9z"/>
              </svg>
              {t("helpline_title", "Emergency Helplines")}
            </div>

            <ul className="helpline-list">
              {HELPLINES.map(function (h) {
                return (
                  <li key={h.number} className="helpline-item">
                    <span className="helpline-name">{t(h.name)}</span>
                    <a className="helpline-number" href={"tel:" + h.number}>{h.number}</a>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}

      {/* Trigger button — fixed bottom right */}
      <button
        className="helpline-trigger"
        onClick={function () { setOpen(!open); }}
        aria-label="Emergency helplines"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 2 .7 2.9a2 2 0 01-.5 2.1L8.1 9.9a16 16 0 006 6l1.2-1.2a2 2 0 012.1-.5c.9.3 1.9.6 2.9.7A2 2 0 0122 16.9z"/>
        </svg>
        {t("helpline_btn", "Helplines")}
      </button>
    </>
  );
}
