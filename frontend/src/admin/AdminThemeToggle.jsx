import { useEffect, useState } from "react";

// Same logic as ThemeToggle.jsx — sirf className alag hai
// ThemeToggle: "theme-toggle"  → sits on hero gradient (white translucent button)
// AdminThemeToggle: "adm-theme-toggle" → sits on adm-surface topbar (border + bg-2)
function getInitialTheme() {
  const saved = localStorage.getItem("nagrik_theme");
  return saved === "dark" ? "dark" : "light";
}

export default function AdminThemeToggle() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(
    function () {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("nagrik_theme", theme);
    },
    [theme]
  );

  function toggle() {
    setTheme(function (current) { return current === "dark" ? "light" : "dark"; });
  }

  return (
    <button className="adm-theme-toggle" onClick={toggle} aria-label="Toggle dark mode">
      {theme === "light" ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
        </svg>
      )}
    </button>
  );
}
