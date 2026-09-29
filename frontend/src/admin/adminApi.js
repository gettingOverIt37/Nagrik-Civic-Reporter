// BASE_URL — ek jagah se change karo, sab jagah reflect hoga
// Production mein sirf ye line change karni hai
export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

let authToken = null;

export function setToken(token) {
  authToken = token;
}

export function getToken() {
  return authToken;
}

export function clearToken() {
  authToken = null;
}

// JWT payload decode — no library needed, just base64
// username nikalne ke liye AdminApp mein use hoga
export function decodeTokenPayload(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function adminFetch(url, options = {}) {
  return fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authToken}`,
      ...(options.headers || {}),
    },
  });
}

export async function adminLogin(username, password) {
  const response = await fetch(`${BASE_URL}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return response.json();
}

export async function adminSignup(inviteCode, username, password) {
  const response = await fetch(`${BASE_URL}/admin/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      invite_code: inviteCode,
      username: username,
      password: password,
    }),
  });
  return response.json();
}

export async function verifyToken() {
  const response = await adminFetch("/admin/me");
  return response;
}

export async function fetchAdminIssues(lang = "en") {
  const response = await adminFetch(`/admin/issues?lang=${lang}`);
  return response.json();
}

export async function updateIssueStatus(issueId, newStatus) {
  const response = await adminFetch(`/admin/issues/${issueId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: newStatus }),
  });
  return response.json();
}

export async function fetchAdminStats() {
  const response = await adminFetch("/admin/stats");
  return response.json();
}

export async function generateInvite() {
  const response = await adminFetch("/admin/generate-invite", {
    method: "POST",
  });
  return response.json();
}

export async function fetchAnalytics() {
  const response = await adminFetch("/admin/analytics");
  return response.json();
}

// Weekly summary — public read, protected generate
export async function fetchWeeklySummary(lang = "en") {
  const lang_code = (lang || "en").split("-")[0];
  const response = await fetch(`${BASE_URL}/weekly-summary?lang=${lang_code}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export async function generateWeeklySummary(lang = "en") {
  const lang_code = (lang || "en").split("-")[0];
  const response = await adminFetch(`/generate-weekly-summary?lang=${lang_code}`, {
    method: "POST",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
} // <-- 3. Function yahan close hoga
