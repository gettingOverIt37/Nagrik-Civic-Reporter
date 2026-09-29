import { useState } from "react";
import { adminSignup } from "./adminApi";

export default function AdminSignup({ onSuccess, onSwitchToLogin }) {
  const [username,    setUsername]    = useState("");
  const [password,    setPassword]    = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [inviteCode,  setInviteCode]  = useState("");
  const [error,       setError]       = useState("");
  const [loading,     setLoading]     = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await adminSignup(inviteCode, username, password);
      if (data.message) {
        onSuccess();
      } else {
        setError(data.detail || "Signup failed. Check your invite code.");
      }
    } catch (err) {
      setError("Could not reach server. Is the backend running?");
    }
    setLoading(false);
  }

  return (
    <div className="admin-form-box">
      <div className="admin-form-header">
        <h2 className="admin-form-title">Create account</h2>
        <p className="admin-form-subtitle">You need a valid invite code to register</p>
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
          <label className="admin-label">Invite code</label>
          <div className="admin-input-wrap">
            <svg className="admin-input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
            </svg>
            <input
              className="admin-input"
              type="text"
              placeholder="Paste your invite code"
              value={inviteCode}
              onChange={function (e) { setInviteCode(e.target.value); }}
              required
              autoFocus
              autoComplete="off"
            />
          </div>
        </div>

        <div className="admin-field">
          <label className="admin-label">Username</label>
          <div className="admin-input-wrap">
            <svg className="admin-input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            <input
              className="admin-input"
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={function (e) { setUsername(e.target.value); }}
              required
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
              placeholder="Choose a strong password"
              value={password}
              onChange={function (e) { setPassword(e.target.value); }}
              required
              autoComplete="new-password"
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
              Create account
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </>
          )}
        </button>
      </form>

      <div className="admin-form-switch">
        Already have an account?{" "}
        <button className="admin-switch-link" onClick={onSwitchToLogin}>
          Sign in
        </button>
      </div>
    </div>
  );
}
