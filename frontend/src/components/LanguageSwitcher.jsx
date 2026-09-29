import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

const RTL_LANGUAGES = ["ur"];

const LANGUAGES = [
  { code: "en", label: "English",   script: "EN"   },
  { code: "hi", label: "Hindi",     script: "हिं"  },
  { code: "ta", label: "Tamil",     script: "த"    },
  { code: "bn", label: "Bengali",   script: "বাং"  },
  { code: "te", label: "Telugu",    script: "తె"   },
  { code: "mr", label: "Marathi",   script: "म"    },
  { code: "gu", label: "Gujarati",  script: "ગુ"   },
  { code: "kn", label: "Kannada",   script: "ಕ"    },
  { code: "ml", label: "Malayalam", script: "മ"    },
  { code: "pa", label: "Punjabi",   script: "ਪੰ"  },
  { code: "ur", label: "Urdu",      script: "اردو" },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dropPos, setDropPos] = useState({ top: 0, right: 0 });
  const triggerRef = useRef(null);

  function openDropdown() {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropPos({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen(true);
  }

  const currentLang = LANGUAGES.find(function (l) {
    return l.code === i18n.language;
  }) || LANGUAGES[0];

  const filtered = LANGUAGES.filter(function (l) {
    return l.label.toLowerCase().includes(search.toLowerCase());
  });

  function selectLanguage(code) {
    i18n.changeLanguage(code);

    // Yahan save karo — refresh ke baad bhi yaad rahega
    localStorage.setItem("nagrik_lang", code);

    // RTL support for Urdu
    document.documentElement.dir = RTL_LANGUAGES.includes(code) ? "rtl" : "ltr";

    setOpen(false);
    setSearch("");
  }

  return (
    <div className="lang-switcher">
      <button
        ref={triggerRef}
        className="lang-trigger"
        onClick={function () { open ? setOpen(false) : openDropdown(); }}
      >
        <svg className="lang-globe" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.6 4 6 4 9s-1.5 6.4-4 9c-2.5-2.6-4-6-4-9s1.5-6.4 4-9z" />
        </svg>
        <span className="lang-active-name">{currentLang.script}</span>
        <svg className="lang-chevron" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          className="lang-dropdown"
          style={{ top: dropPos.top, right: dropPos.right }}
        >
          <input
            className="lang-search"
            autoFocus
            type="text"
            placeholder="Search language..."
            value={search}
            onChange={function (e) { setSearch(e.target.value); }}
          />

          <ul className="lang-list">
            {filtered.map(function (lang) {
              const isActive = i18n.language === lang.code;
              return (
                <li
                  key={lang.code}
                  className={"lang-item" + (isActive ? " lang-item--active" : "")}
                  onClick={function () { selectLanguage(lang.code); }}
                >
                  <span className="lang-native">{lang.script}</span>
                  <span className="lang-english">{lang.label}</span>
                  {isActive && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: "auto" }}>
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </li>
              );
            })}
            {filtered.length === 0 && (
              <p className="lang-no-result">No match found</p>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
