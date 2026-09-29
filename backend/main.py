import os
import uuid
import datetime
import secrets
import time
from fastapi import FastAPI, UploadFile, File, Form, Depends, Body, HTTPException, Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from db import get_db_connection
from ai_service import (
    analyze_issue_photo, regenerate_confirmation,
    generate_weekly_summary, translate_to_english, translate_text
)
from auth import verify_password, create_jwt_token, verify_jwt_token, generate_invite_code, hash_password
app = FastAPI(title="Nagrik API")
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
# React frontend (alag port pe chalega) ko backend se baat karne ki permission dena
# Production mein alag domain use hoga, local dev mein alag — environment variable se control karo
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Hello, Nagrik is alive!"}


@app.get("/test-db")
def test_db():
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute("SELECT COUNT(*) FROM issues")
    count = cursor.fetchone()[0]
    cursor.close()
    connection.close()
    return {"connected": True, "total_issues_in_db": count}


@app.post("/analyze-photo")
async def analyze_photo(file: UploadFile = File(...), language_code: str = Form("en")):
    image_bytes = await file.read()
    result = analyze_issue_photo(image_bytes, file.content_type, language_code)
    return result


@app.post("/report-issue")
@limiter.limit("10/minute")
async def report_issue(
    request: Request,
    file: UploadFile = File(...),
    category: str = Form(...),
    description: str = Form(...),
    description_original: str = Form(...),
    language_code: str = Form("en"),
    severity: int = Form(...),
    is_likely_genuine: bool = Form(...),
    ai_confidence: float = Form(None),
    latitude: float = Form(...),
    longitude: float = Form(...),
    area_name: str = Form(None),
    was_edited: bool = Form(False),
    confirmation_summary: str = Form(None),
):
    file_ext = file.filename.split(".")[-1]
    unique_name = f"{uuid.uuid4()}.{file_ext}"
    file_path = f"uploads/{unique_name}"
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    # Stage 12, Hissa 2 — Normalization:
    # description = user ki bhasha mein text (e.g. Tamil)
    # description_english = English translation (DB mein consistent storage ke liye)
    # description_original = user ne jo dekha/likha woh exactly (authenticity ke liye)
    description_english = translate_to_english(description, language_code)

    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute(
        """INSERT INTO issues
           (category, description, language_code, description_original, severity,
            ai_confidence, is_likely_genuine, latitude, longitude, area_name, image_path, status)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'reported')""",
        (category, description_english, language_code, description, severity,
         ai_confidence, is_likely_genuine, latitude, longitude, area_name, file_path)
    )
    connection.commit()
    new_id = cursor.lastrowid
    cursor.close()
    connection.close()

    if was_edited:
        final_message = regenerate_confirmation(category, description, severity, language_code)
    else:
        final_message = confirmation_summary

    return {"id": new_id, "confirmation_summary": final_message}


@app.post("/generate-weekly-summary")
@limiter.limit("5/hour")
def trigger_weekly_summary(request: Request, lang: str = "en", admin=Depends(verify_jwt_token)):
    summary = generate_weekly_summary()
    if summary is None:
        raise HTTPException(status_code=503, detail="Summary generation failed — please try again.")
    return {"summary_text": summary}


@app.get("/weekly-summary")
def get_latest_summary(lang: str = "en"):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT * FROM weekly_summaries ORDER BY generated_at DESC LIMIT 1")
    result = cursor.fetchone()
    cursor.close()
    connection.close()

    if not result:
        return {"message": "No summary generated yet"}

    # Agar requested language English nahi hai, translate karo
    if lang != "en" and result.get("summary_text"):
        try:
            result["summary_text"] = translate_text(result["summary_text"], lang)
        except Exception:
            pass  # Translation fail hone pe original text dikhao

    return result

@app.get("/issues")
def get_issues(lang: str = "en"):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT id, category, description, severity, status, latitude, longitude, area_name, image_path FROM issues"
    )
    results = cursor.fetchall()

    if lang != "en" and results:
        issue_ids = [issue["id"] for issue in results]
        placeholders = ",".join(["%s"] * len(issue_ids))
        cursor.execute(
            f"SELECT issue_id, translated_text FROM issue_translations "
            f"WHERE lang_code = %s AND issue_id IN ({placeholders})",
            (lang, *issue_ids)
        )
        cached = {row["issue_id"]: row["translated_text"] for row in cursor.fetchall()}

        for issue in results:
            if not issue.get("description"):
                continue
            if issue["id"] in cached:
                issue["description"] = cached[issue["id"]]
            else:
                try:
                    translated = translate_text(issue["description"], lang)
                    issue["description"] = translated
                    cursor.execute(
                        "INSERT INTO issue_translations (issue_id, lang_code, translated_text) VALUES (%s, %s, %s)",
                        (issue["id"], lang, translated)
                    )
                except Exception:
        # Rate limit ya koi aur Gemini error — English fallback, 500 nahi
                    pass  # issue["description"] English mein hi rahega
        conn.commit()

    cursor.close()
    conn.close()
    return results

@app.post("/admin/login")
def admin_login(credentials: dict = Body(...)):
    username = credentials.get("username", "")
    password = credentials.get("password", "")

    if not username or not password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM admins WHERE username = %s", (username,))
    admin_record = cursor.fetchone()
    cursor.close()
    conn.close()

    if admin_record:
        # Invite se bana account — admins table me check karo
        if not verify_password(password, admin_record["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
    elif username == "admin":
        # Original .env wala master account — fallback
        stored_hash = os.getenv("ADMIN_PASSWORD_HASH", "")
        if not verify_password(password, stored_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_jwt_token(username)
    return {"token": token, "username": username}

@app.get("/admin/me")
def admin_me(admin=Depends(verify_jwt_token)):
    return {"username": admin["sub"], "role": admin["role"]}

@app.post("/admin/generate-invite")
def generate_invite(admin=Depends(verify_jwt_token)):
    code = generate_invite_code()
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(hours=24)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO admin_invites (code, created_by, expires_at) VALUES (%s, %s, %s)",
        (code, admin["sub"], expires_at)
    )
    conn.commit()
    cursor.close()
    conn.close()

    return {
        "invite_code": code,
        "expires_in": "24 hours",
        "message": "Share this code with the person you want to invite. It works only once."
    }

@app.post("/admin/signup")
def admin_signup(data: dict = Body(...)):
    """
    Valid invite code ke saath naya admin account banana.

    Checks (ek bhi fail hua to reject):
    1. Code exist karta hai
    2. Code expired nahi hua
    3. Code pehle use nahi hua
    4. Username already exist nahi karta

    Sab sahi hone pe: naya admin account banta hai,
    invite code permanently "used" mark hota hai.
    """
    code = data.get("invite_code", "")
    username = data.get("username", "")
    password = data.get("password", "")

    if not code or not username or not password:
        raise HTTPException(status_code=400, detail="All fields required")

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Step 1: Invite code validate karo
    cursor.execute(
        "SELECT * FROM admin_invites WHERE code = %s",
        (code,)
    )
    invite = cursor.fetchone()
    if not invite:
        raise HTTPException(status_code=400, detail="Invalid invite code")

    if invite["is_used"]:
        raise HTTPException(status_code=400, detail="Invite code already used")

    if invite["expires_at"] < datetime.datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invite code expired")

    # Step 2: Username unique hai?
    cursor.execute("SELECT id FROM admins WHERE username = %s", (username,))
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="Username already taken")

    # Step 3: Naya admin account banao
    password_hash = hash_password(password)
    cursor.execute(
        "INSERT INTO admins (username, password_hash) VALUES (%s, %s)",
        (username, password_hash)
    )

    # Step 4: Invite code permanently used mark karo
    cursor.execute(
        "UPDATE admin_invites SET is_used = TRUE WHERE code = %s",
        (code,)
    )

    conn.commit()
    cursor.close()
    conn.close()

    return {"message": f"Account created for {username}. You can now login."}

@app.get("/admin/issues")
def admin_get_issues(lang: str = "en", admin=Depends(verify_jwt_token)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT id, category, description, description_original,
        language_code, severity, ai_confidence, is_likely_genuine,
        status, area_name, latitude, longitude, reported_at, updated_at
        FROM issues
        ORDER BY reported_at DESC
    """)
    results = cursor.fetchall()

    # MySQL DATETIME objects ko string me convert karo JSON ke liye
    for row in results:
        if row.get("reported_at"):
            row["reported_at"] = row["reported_at"].strftime("%Y-%m-%d %H:%M")
        if row.get("updated_at"):
            row["updated_at"] = row["updated_at"].strftime("%Y-%m-%d %H:%M")
        if row.get("ai_confidence") is not None:
            row["ai_confidence"] = float(row["ai_confidence"])

    # Translation with caching — sirf non-English languages ke liye
    if lang != "en" and results:
        issue_ids = [issue["id"] for issue in results]
        placeholders = ",".join(["%s"] * len(issue_ids))
        cursor.execute(
            f"SELECT issue_id, translated_text FROM issue_translations "
            f"WHERE lang_code = %s AND issue_id IN ({placeholders})",
            (lang, *issue_ids)
        )
        cached = {row["issue_id"]: row["translated_text"] for row in cursor.fetchall()}

        for issue in results:
            if not issue.get("description"):
                continue
            if issue["id"] in cached:
                issue["description"] = cached[issue["id"]]
            else:
                try:
                    translated = translate_text(issue["description"], lang)
                    issue["description"] = translated
                    cursor.execute(
                        "INSERT INTO issue_translations (issue_id, lang_code, translated_text) VALUES (%s, %s, %s)",
                        (issue["id"], lang, translated)
                    )
                except Exception:
                    # Rate limit ya koi aur Gemini error — English fallback, 500 nahi
                    pass  # issue["description"] English mein hi rahega
        conn.commit()

    cursor.close()
    conn.close()
    return results

@app.patch("/admin/issues/{issue_id}/status")
def admin_update_status(
    issue_id: int,
    data: dict = Body(...),
    admin=Depends(verify_jwt_token)
):
    """
    Status update endpoint — aur status_history me bhi log karta hai.

    User story: Officer "Resolve" select karta hai dropdown se —
    ek hi click me status update bhi hota hai aur audit trail bhi
    banta hai automatically.
    """
    new_status = data.get("status", "")
    valid_statuses = ["reported", "acknowledged", "resolved"]

    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Pehle current status lo (history ke liye)
    cursor.execute("SELECT status FROM issues WHERE id = %s", (issue_id,))
    issue = cursor.fetchone()

    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    old_status = issue["status"]
    if old_status == new_status:
        cursor.close()
        conn.close()
        return {"message": "Status unchanged"}

    # Status update karo
    cursor.execute(
        "UPDATE issues SET status = %s WHERE id = %s",
        (new_status, issue_id)
    )

    # Audit trail — status_history me log karo
    cursor.execute(
        "INSERT INTO status_history (issue_id, old_status, new_status, changed_by) VALUES (%s, %s, %s, %s)",
        (issue_id, old_status, new_status, admin["sub"])
    )

    conn.commit()
    cursor.close()
    conn.close()

    return {
        "issue_id": issue_id,
        "old_status": old_status,
        "new_status": new_status,
        "updated_by": admin["sub"]
    }

@app.get("/admin/stats")
def admin_stats(admin=Depends(verify_jwt_token)):
    """
    Dashboard ke top pe summary cards ke liye numbers.
    Total, pending, acknowledged, resolved count.
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT
            COUNT(*) as total,
            SUM(status = 'reported') as pending,
            SUM(status = 'acknowledged') as acknowledged,
            SUM(status = 'resolved') as resolved
        FROM issues
    """)
    stats = cursor.fetchone()
    cursor.close()
    conn.close()

    # None values ko 0 se replace karo (empty table case)
    for key in stats:
        if stats[key] is None:
            stats[key] = 0
        else:
            stats[key] = int(stats[key])

    return stats

@app.get("/admin/analytics")
def get_analytics(admin=Depends(verify_jwt_token)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # 1. Category-wise count — "kaunsi problem sabse common hai"
    cursor.execute("""
        SELECT category, COUNT(*) AS count
        FROM issues
        GROUP BY category
        ORDER BY count DESC
    """)
    category_data = cursor.fetchall()

    # 2. Daily trend, last 30 din — "reports badh rahe hain ya ghat"
    cursor.execute("""
        SELECT DATE(reported_at) AS report_date, COUNT(*) AS count
        FROM issues
        WHERE reported_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY DATE(reported_at)
        ORDER BY report_date ASC
    """)
    trend_data = cursor.fetchall()

    # 3. Area-wise top 10 — "kaunsa area sabse zyada complain karta hai"
    cursor.execute("""
        SELECT area_name, COUNT(*) AS count
        FROM issues
        WHERE area_name IS NOT NULL
        GROUP BY area_name
        ORDER BY count DESC
        LIMIT 10
    """)
    area_data = cursor.fetchall()

    # 4. Status breakdown — kitne pending/acknowledged/resolved hain
    cursor.execute("""
        SELECT status, COUNT(*) AS count
        FROM issues
        GROUP BY status
    """)
    status_data = cursor.fetchall()

    cursor.close()
    conn.close()

    # MySQL 'date' objects JSON mein directly nahi jaate — string banani padti hai
    for row in trend_data:
        row["report_date"] = row["report_date"].isoformat()

    return {
        "category_breakdown": category_data,
        "weekly_trend": trend_data,
        "area_breakdown": area_data,
        "status_breakdown": status_data,
    }