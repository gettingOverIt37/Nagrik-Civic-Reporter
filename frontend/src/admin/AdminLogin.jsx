import { useState } from "react";
import { adminLogin } from "./adminApi";

export default function AdminLogin({ onSuccess, onSwitchToSignup }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await adminLogin(username, password);
      if (data.token) {
        onSuccess(data.token);
      } else {
        setError(data.detail || "Invalid credentials.");
      }
    } catch (err) {
      setError("Server unreachable — please try again later.");
    }
    setLoading(false);
  }

  return (
    <div className="admin-form-box">
      <div className="admin-form-header">
        <h2 className="admin-form-title">Welcome back</h2>
        <p className="admin-form-subtitle">Sign in to the authority portal</p>
      </div>

      {error && (
        <div className="admin-error-banner">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l10 18H2L12 3z" /><path d="M12 10v4M12 17.5v.01" />
          </svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="admin-form">
        <div className="admin-field">
          <label className="admin-label">Username</label>
          <div className="admin-input-wrap">
            <svg className="admin-input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            <input
              className="admin-input"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={function (e) { setUsername(e.target.value); }}
              required
              autoFocus
              autoComplete="username"
            />
          </div>
        </div>

        <div className="admin-field">
          <label className="admin-label">Password</label>
          <div className="admin-input-wrap">
            <svg className="admin-input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <input
              className="admin-input"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={function (e) { setPassword(e.target.value); }}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="admin-input-toggle"
              onClick={function () { setShowPassword(!showPassword); }}
              tabIndex={-1}
            >
              {showPassword ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.9 17.9A10.5 10.5 0 0112 19C6 19 1 12 1 12a18.5 18.5 0 015.1-5.9M9.9 4.2A9.7 9.7 0 0112 4c6 0 11 7 11 8a18.5 18.5 0 01-2.2 3.2M1 1l22 22" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="admin-submit-btn"
          disabled={loading}
        >
          {loading ? (
            <span className="admin-btn-spinner" />
          ) : (
            <>
              Sign in
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </>
          )}
        </button>
      </form>

      <div className="admin-form-switch">
        Have an invite code?{" "}
        <button className="admin-switch-link" onClick={onSwitchToSignup}>
          Create account
        </button>
      </div>
    </div>
  );
}
