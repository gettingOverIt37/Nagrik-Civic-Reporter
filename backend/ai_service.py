from datetime import datetime, timedelta
import json
import os
import time
from dotenv import load_dotenv
from google import genai
from google.genai import types
import pandas as pd
from db import get_db_connection

load_dotenv()
client = genai.Client()

SEVERITY_LABELS = {1: "Minor", 2: "Low", 3: "Moderate", 4: "High", 5: "Critical"}
MODEL_NAME = os.environ.get("GEMINI_MODEL_NAME", "gemini-3.5-flash-lite")


def analyze_issue_photo(
    image_bytes: bytes,
    mime_type: str,
    language_code: str = "en",
    max_retries: int = 3,
):
    prompt = f"""
You are analyzing a photo of a civic issue reported by a citizen.
Respond in the "{language_code}" language for the "description" and "confirmation_summary" fields only.
Return JSON with exactly these fields:
- category: one of "pothole", "garbage", "streetlight", "drainage", "water_leakage", "stray_animals", "other"
- description: one sentence describing what you see
- severity: an integer from 1 to 5
- ai_confidence: a number between 0 and 1 representing how confident you are in this analysis
- is_likely_genuine: true or false, whether this looks like a real civic issue
- confirmation_summary: a warm 2-3 sentence message confirming the report to the citizen
"""
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=[
                    types.Part.from_bytes(
                        data=image_bytes, mime_type=mime_type
                    ),
                    prompt,
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                ),
            )
            return json.loads(response.text)
        except Exception:
            if attempt == max_retries - 1:
                raise
            time.sleep(2**attempt)  # 1s, phir 2s, phir 4s ruk ke retry

# ── Language code → full language name mapping ─────────────────────────────
# Gemini ko "hi" nahi "Hindi" samajhna chahiye prompts mein
LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi",
    "ta": "Tamil",
    "bn": "Bengali",
    "te": "Telugu",
    "mr": "Marathi",
    "gu": "Gujarati",
    "kn": "Kannada",
    "ml": "Malayalam",
    "pa": "Punjabi written in Gurmukhi script",
    "ur": "Urdu",
}

def generate_weekly_summary():
    connection = get_db_connection()
    week_end = datetime.now()
    week_start = week_end - timedelta(days=7)

    query = (
        "SELECT category, area_name FROM issues WHERE reported_at BETWEEN %s"
        " AND %s"
    )
    df = pd.read_sql(query, connection, params=(week_start, week_end))

    if df.empty:
        summary_text = "No issues were reported this week." if lang == "en" else translate_text("No issues were reported this week.", lang)
    else:
        counts = df["category"].value_counts().to_dict()
        counts_text = ", ".join(f"{k}: {v}" for k, v in counts.items())
        prompt = (
            "Write a professional 3-4 sentence summary in English for a civic authority"
            f" based on this week's issue counts: {counts_text}."
        )
        try:
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt,
            )
            summary_text = response.text
        except Exception as e:
            print(f"[generate_weekly_summary ERROR] {e}")
            connection.close()
            return None

    cursor = connection.cursor()
    cursor.execute(
        "INSERT INTO weekly_summaries (week_start, week_end, summary_text)"
        " VALUES (%s, %s, %s)"
        " ON DUPLICATE KEY UPDATE summary_text = VALUES(summary_text), generated_at = NOW()",
        (week_start.date(), week_end.date(), summary_text),
    )
    connection.commit()
    cursor.close()
    connection.close()
    return summary_text


def regenerate_confirmation(
    category, description, severity, language_code="en", max_retries=3
):
    prompt = f"""
Write a warm 2-3 sentence confirmation message in "{language_code}" language for a citizen who just reported this civic issue:
Category: {category}
Description: {description}
Severity: {SEVERITY_LABELS.get(severity, "Unknown")}
"""
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=MODEL_NAME, contents=prompt
            )
            return response.text
        except Exception:
            if attempt == max_retries - 1:
                raise
            time.sleep(2**attempt)


# ── Stage 12, Hissa 2: Normalization ───────────────────────────────────────
# Submit ke waqt user ki description (kisi bhi bhasha mein) → English mein convert
# Isse database mein hamesha consistent English description stored hoti hai
# (search, count, dashboard sab sahi kaam karte hain)
def translate_to_english(text: str, from_language_code: str = "en", max_retries: int = 3) -> str:
    # Shortcut: already English hai toh translate karna waste hai
    if from_language_code == "en" or not text.strip():
        return text

    lang_name = LANGUAGE_NAMES.get(from_language_code, from_language_code)
    prompt = (
        f"Translate the following {lang_name} text to English. "
        f"Return ONLY the translated text, nothing else, no explanation.\n\n"
        f"Text: {text}"
    )
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(model=MODEL_NAME, contents=prompt)
            return response.text.strip()
        except Exception:
            if attempt == max_retries - 1:
                raise
            time.sleep(2**attempt)


# ── Stage 12, Hissa 3: Display Translation ─────────────────────────────────
# Map/dashboard dekh rahe viewer ke liye English description → unki language mein translate
# DB mein English stored rehta hai; yeh sirf display ke liye on-the-fly translate hai
def translate_text(text: str, to_language_code: str = "en", max_retries: int = 3) -> str:
    # Shortcut: English chahiye toh translate karna waste hai
    if to_language_code == "en" or not text.strip():
        return text

    lang_name = LANGUAGE_NAMES.get(to_language_code, to_language_code)
    prompt = (
        f"Translate the following English text to {lang_name}. "
        f"Return ONLY the translated text, nothing else, no explanation.\n\n"
        f"Text: {text}"
    )
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(model=MODEL_NAME, contents=prompt)
            return response.text.strip()
        except Exception:
            if attempt == max_retries - 1:
                raise
            time.sleep(2**attempt)