const BASE_URL = "http://localhost:8000";

// Photo upload karke AI se analysis lo
// languageCode: i18n.language — AI usi bhasha mein description + confirmation dega
export async function analyzePhoto(file, languageCode) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("language_code", languageCode);

  const response = await fetch(`${BASE_URL}/analyze-photo`, {
    method: "POST",
    body: formData,
  });
  return response.json();
}

// Report submit karo — formData mein language_code bhi hoga
export async function submitReport(formData) {
  const response = await fetch(`${BASE_URL}/report-issue`, {
    method: "POST",
    body: formData,
  });
  return response.json();
}

// Stage 12 Hissa 3 — Display Translation:
// lang parameter backend ko batata hai ki viewer ki language kya hai
// Backend English descriptions ko on-the-fly us language mein translate karke deta hai
// Default "en" — agar English ho toh backend seedha return kar deta hai (no API call waste)
export async function fetchIssues(lang = "en") {
  const response = await fetch(`${BASE_URL}/issues?lang=${lang}`);
  return response.json();
}