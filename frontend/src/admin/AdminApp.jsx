import AdminLogin from "./AdminLogin";
import AdminSignup from "./AdminSignup";
import AdminDashboard from "./AdminDashboard";
import { setToken, decodeTokenPayload, verifyToken } from "./adminApi";
import { useState, useEffect } from "react";

export default function AdminApp() {
  const [screen, setScreen]     = useState("login"); // "login" | "signup" | "dashboard"
  const [username, setUsername] = useState("");

  // Page load pe localStorage se token restore karo
  useEffect(function () {
    const saved = localStorage.getItem("nagrik_admin_token");
    if (saved) {
      setToken(saved);
      verifyToken().then(function (res) {
        if (res.ok) {
          const payload = decodeTokenPayload(saved);
          setUsername(payload?.sub || "admin");
          setScreen("dashboard");
        } else {
          localStorage.removeItem("nagrik_admin_token");
        }
      });
    }
  }, []);

  function handleLoginSuccess(token) {
    setToken(token);
    localStorage.setItem("nagrik_admin_token", token);
    // JWT payload se username nikalo — no extra /me call needed
    const payload = decodeTokenPayload(token);
    setUsername(payload?.sub || "admin");
    setScreen("dashboard");
  }

  function handleLogout() {
    setToken(null);
    localStorage.removeItem("nagrik_admin_token");
    setUsername("");
    setScreen("login");
  }

  if (screen === "dashboard") {
    return <AdminDashboard username={username} onLogout={handleLogout} />;
  }

  return (
    <div className="admin-shell">
      {/* Left — branding panel */}
      <div className="admin-brand-panel">
        <div className="admin-brand-glow" />
        <div className="admin-brand-content">
          <div className="admin-brand-mark">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="13" r="4.2" />
              <path d="M4 8.5h3l1.5-2.5h7L17 8.5h3a1.5 1.5 0 011.5 1.5v9A1.5 1.5 0 0120 20.5H4A1.5 1.5 0 012.5 19v-9A1.5 1.5 0 014 8.5z" />
            </svg>
          </div>
          <h1 className="admin-brand-name">Nagrik</h1>
          <p className="admin-brand-sub">Civic Authority Portal</p>

          <div className="admin-brand-stats">
            <div className="admin-brand-stat">
              <div className="admin-brand-stat-num">JWT</div>
              <div className="admin-brand-stat-label">Secured</div>
            </div>
            <div className="admin-brand-stat-div" />
            <div className="admin-brand-stat">
              <div className="admin-brand-stat-num">AI</div>
              <div className="admin-brand-stat-label">Powered</div>
            </div>
            <div className="admin-brand-stat-div" />
            <div className="admin-brand-stat">
              <div className="admin-brand-stat-num">Live</div>
              <div className="admin-brand-stat-label">Dashboard</div>
            </div>
          </div>

          <div className="admin-brand-features">
            {[
              "Manage reported civic issues",
              "Update status in real time",
              "View analytics & trends",
              "AI-generated weekly summaries",
            ].map(function (f) {
              return (
                <div className="admin-brand-feature" key={f}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </div>
              );
            })}
          </div>
        </div>

        <p className="admin-brand-footer">
          Nagrik — a record for every ward.
        </p>
      </div>

      {/* Right — form panel */}
      <div className="admin-form-panel">
        {screen === "login" ? (
          <AdminLogin
            onSuccess={handleLoginSuccess}
            onSwitchToSignup={function () { setScreen("signup"); }}
          />
        ) : (
          <AdminSignup
            onSuccess={function () { setScreen("login"); }}
            onSwitchToLogin={function () { setScreen("login"); }}
          />
        )}
      </div>
    </div>
  );
}
