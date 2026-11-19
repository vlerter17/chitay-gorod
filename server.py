import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import ssl
import random
import time
import os
import io
import json
import base64
import sqlite3
import secrets
from datetime import datetime, timedelta
from functools import wraps
import requests
import pyotp
import qrcode
from flask import Flask, request, jsonify, send_from_directory, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__, static_folder='.', static_url_path='')
app.secret_key = os.environ.get('SECRET_KEY', 'super_secret_key_chitay_gorod_2024')
CORS(app, supports_credentials=True)

DB_PATH = '/data/library.db' if os.path.exists('/data') else 'library.db'

ADMIN_SECRET_WORD = "карамельный чизкейк"
ADMIN_SESSION_TTL = 60 * 60

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute('''CREATE TABLE IF NOT EXISTS users 
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT UNIQUE, password TEXT, totp_secret TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS purchases 
                 (user_id INTEGER, book_id INTEGER, PRIMARY KEY (user_id, book_id))''')
    c.execute('''CREATE TABLE IF NOT EXISTS cart 
                 (user_id INTEGER, book_id INTEGER, PRIMARY KEY (user_id, book_id))''')
    c.execute('''CREATE TABLE IF NOT EXISTS reset_tokens 
                 (email TEXT, token TEXT UNIQUE, expires_at DATETIME)''')
    c.execute('''CREATE TABLE IF NOT EXISTS admin_settings 
                 (key TEXT PRIMARY KEY, value TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS admin_sessions 
                 (token TEXT PRIMARY KEY, expires_at REAL)''')
    # Книги
    c.execute('''CREATE TABLE IF NOT EXISTS books (
                 id INTEGER PRIMARY KEY,
                 title TEXT NOT NULL,
                 author TEXT,
                 price REAL DEFAULT 0,
                 free INTEGER DEFAULT 0,
                 image TEXT,
                 description TEXT,
                 text TEXT)''')
    # Заказы
    c.execute('''CREATE TABLE IF NOT EXISTS orders (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 user_id INTEGER,
                 user_email TEXT,
                 items TEXT,
                 total REAL,
                 card_last4 TEXT,
                 status TEXT DEFAULT 'paid',
                 created_at TEXT,
                 refunded_at TEXT)''')

    c.execute("PRAGMA table_info(users)")
    columns = [row[1] for row in c.fetchall()]
    if 'totp_secret' not in columns:
        try:
            c.execute("ALTER TABLE users ADD COLUMN totp_secret TEXT")
            conn.commit()
            print("✅ Колонка totp_secret добавлена.")
        except sqlite3.OperationalError as e:
            print(f"❌ Не удалось добавить totp_secret: {e}")

    conn.commit()
    conn.close()

init_db()

# ===== ПОЧТА =====
SMTP_HOST = "smtp.yandex.ru"
SMTP_PORT = 465
SMTP_USER = "losev.vladislav10200@yandex.ru"
SMTP_PASS = "mtmmyqteigqbagmt"
FROM_EMAIL = "losev.vladislav10200@yandex.ru"

codes_db = {}
CODE_TTL = 10 * 60

def send_email(to_email, subject, html_content):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = FROM_EMAIL
    msg["To"] = to_email
    msg.attach(MIMEText(html_content, "html", "utf-8"))
    try:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context, timeout=15) as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(FROM_EMAIL, [to_email], msg.as_string())
        return True
    except Exception as e:
        print(f"[ERROR] Ошибка почты: {e}")
        return False

def get_beautiful_email_html(title, code, description):
    return f"""
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f0f1a; padding: 40px 20px; color: #ffffff;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #1a1a2e; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 28px; letter-spacing: 2px;">📖 Читай-Город</h1>
            </div>
            <div style="padding: 40px 30px; text-align: center;">
                <h2 style="color: #e8d5b7; margin-top: 0; font-size: 22px;">{title}</h2>
                <p style="color: #cccccc; font-size: 16px; line-height: 1.5;">{description}</p>
                <div style="margin: 30px 0;">
                    <span style="display: inline-block; background-color: rgba(102, 126, 234, 0.1); border: 2px dashed #667eea; border-radius: 12px; padding: 15px 30px; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #667eea;">
                        {code}
                    </span>
                </div>
                <p style="color: #888888; font-size: 13px;">Код действует 10 минут.</p>
            </div>
            <div style="background-color: #131322; padding: 20px; text-align: center; color: #555555; font-size: 12px;">
                © 2024 Издательство «Читай-Город». Все права защищены.
            </div>
        </div>
    </div>
    """

# ===== АДМИН: ХРАНИЛИЩЕ =====
def get_admin_secret():
    conn = sqlite3.connect(DB_PATH); c = conn.cursor()
    c.execute("SELECT value FROM admin_settings WHERE key = 'totp_secret'")
    row = c.fetchone(); conn.close()
    return row[0] if row else None

def set_admin_secret(secret):
    conn = sqlite3.connect(DB_PATH); c = conn.cursor()
    c.execute("INSERT OR REPLACE INTO admin_settings (key, value) VALUES ('totp_secret', ?)", (secret,))
    conn.commit(); conn.close()

def create_admin_token():
    token = secrets.token_urlsafe(32)
    conn = sqlite3.connect(DB_PATH); c = conn.cursor()
    now = time.time()
    c.execute("DELETE FROM admin_sessions WHERE expires_at < ?", (now,))
    c.execute("INSERT INTO admin_sessions (token, expires_at) VALUES (?, ?)", (token, now + ADMIN_SESSION_TTL))
    conn.commit(); conn.close()
    return token

def check_admin_token(token):
    if not token: return False
    conn = sqlite3.connect(DB_PATH); c = conn.cursor()
    c.execute("SELECT expires_at FROM admin_sessions WHERE token = ?", (token,))
    row = c.fetchone(); conn.close()
    return bool(row and row[0] > time.time())

def delete_admin_token(token):
    conn = sqlite3.connect(DB_PATH); c = conn.cursor()
    c.execute("DELETE FROM admin_sessions WHERE token = ?", (token,))
    conn.commit(); conn.close()

def require_admin(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        token = request.headers.get('X-Admin-Token')
        if not token:
            data = request.get_json(silent=True) or {}
            token = data.get('admin_token')
        if not check_admin_token(token):
            return jsonify({"error": "Требуется авторизация администратора"}), 401
        return f(*args, **kwargs)
    return wrapper

# ===== АДМИН: ВХОД =====
@app.route("/api/admin/status", methods=["GET"])
def admin_status():
    return jsonify({"configured": bool(get_admin_secret())})

@app.route("/api/admin/setup", methods=["POST"])
def admin_setup():
    if get_admin_secret():
        return jsonify({"error": "Панель уже настроена"}), 400
    data = request.get_json(silent=True) or {}
    if (data.get("secret_word") or "").strip().lower() != ADMIN_SECRET_WORD:
        return jsonify({"error": "Неверное секретное слово"}), 403
    secret = pyotp.random_base32()
    set_admin_secret(secret)
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name="admin@chitay-gorod", issuer_name="ChitayGorod")
    img = qrcode.make(uri)
    buf = io.BytesIO(); img.save(buf, format="PNG")
    return jsonify({"secret": secret, "qr_png_base64": base64.b64encode(buf.getvalue()).decode()})

@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    secret = get_admin_secret()
    if not secret:
        return jsonify({"error": "Сначала настройте панель"}), 400
    data = request.get_json(silent=True) or {}
    code = (data.get("code") or "").strip()
    if not pyotp.TOTP(secret).verify(code, valid_window=1):
        return jsonify({"error": "Неверный код"}), 401
    return jsonify({"success": True, "token": create_admin_token(), "expires_in": ADMIN_SESSION_TTL})

@app.route("/api/admin/verify-session", methods=["POST"])
def admin_verify_session():
    data = request.get_json(silent=True) or {}
    return jsonify({"valid": check_admin_token((data.get("token") or "").strip())})

@app.route("/api/admin/logout", methods=["POST"])
def admin_logout():
    data = request.get_json(silent=True) or {}
    t = (data.get("token") or "").strip()
    if t: delete_admin_token(t)
    return jsonify({"message": "Выход выполнен"})

# ===== ПУБЛИЧНЫЕ КНИГИ =====
@app.route("/api/books", methods=["GET"])
def api_books():
    conn = sqlite3.connect(DB_PATH); c = conn.cursor()
    c.execute("SELECT id,title,author,price,free,image,description,text FROM books ORDER BY id")
    rows = c.fetchall(); conn.close()
    return jsonify([{
        "id": r[0], "title": r[1], "author": r[2], "price": r[3],
        "free": bool(r[4]), "image": r[5], "description": r[6], "text": r[7] or ""
    } for r in rows])

# ===== АДМИН: КНИГИ =====
@app.route("/api/admin/books", methods=["GET"])
@require_admin
def admin_books_list():
    conn = sqlite3.connect(DB_PATH); c = conn.cursor()
    c.execute("SELECT id,title,author,price,free,image,description,text FROM books ORDER BY id")
    rows = c.fetchall(); conn.close()
    return jsonify([{
        "id": r[0], "title": r[1], "author": r[2], "price": r[3],
        "free": bool(r[4]), "image": r[5], "description": r[6], "text": r[7] or ""
    } for r in rows])

@app.route("/api/admin/books/import", methods=["POST"])
@require_admin
def admin_books_import():
    """Импорт книг из books.js (передаётся массивом с фронта)."""
    data = request.get_json(silent=True) or {}
    books = data.get("books") or []
    if not isinstance(books, list) or not books:
        return jsonify({"error": "Пустой список книг"}), 400
    conn = sqlite3.connect(DB_PATH); c = conn.cursor()
    imported = 0
    for b in books:
        try:
            bid = int(b.get("id"))
        except Exception:
            continue
        c.execute("""INSERT INTO books (id,title,author,price,free,image,description,text)
                     VALUES (?,?,?,?,?,?,?,?)
                     ON CONFLICT(id) DO UPDATE SET
                       title=excluded.title, author=excluded.author, price=excluded.price,
                       free=excluded.free, image=excluded.image,
                       description=excluded.description, text=excluded.text""",
                  (bid, b.get("title"), b.get("author"), float(b.get("price") or 0),
                   1 if b.get("free") else 0, b.get("image"), b.get("description"), b.get("text")))
        imported += 1
    conn.commit(); conn.close()
    return jsonify({"message": f"Импортировано книг: {imported}", "count": imported})

@app.route("/api/admin/books", methods=["POST"])
@require_admin
def admin_books_create():
    d = request.get_json(silent=True) or {}
    if not d.get("title"):
        return jsonify({"error": "Название обязательно"}), 400
    conn = sqlite3.connect(DB_PATH); c = conn.cursor()
    c.execute("SELECT MAX(id) FROM books")
    new_id = (c.fetchone()[0] or 0) + 1
    c.execute("""INSERT INTO books (id,title,author,price,free,image,description,text)
                 VALUES (?,?,?,?,?,?,?,?)""",
              (new_id, d.get("title"), d.get("author") or "", float(d.get("price") or 0),
               1 if d.get("free") else 0, d.get("image") or "", d.get("description") or "", d.get("text") or ""))
    conn.commit(); conn.close()
    return jsonify({"message": "Книга создана", "id": new_id})

@app.route("/api/admin/books/<int:book_id>", methods=["PUT"])
@require_admin
def admin_books_update(book_id):
    d = request.get_json(silent=True) or {}
    conn = sqlite3.connect(DB_PATH); c = conn.cursor()
    c.execute("""UPDATE books SET title=?, author=?, price=?, free=?, image=?, description=?, text=?
                 WHERE id=?""",
              (d.get("title"), d.get("author") or "", float(d.get("price") or 0),
               1 if d.get("free") else 0, d.get("image") or "", d.get("description") or "",
               d.get("text") or "", book_id))
    if c.rowcount == 0:
        conn.close()
        return jsonify({"error": "Книга не найдена"}), 404
    conn.commit(); conn.close()
    return jsonify({"message": "Книга обновлена"})

@app.route("/api/admin/books/<int:book_id>", methods=["DELETE"])
@require_admin
def admin_books_delete(book_id):
    conn = sqlite3.connect(DB_PATH); c = conn.cursor()
    c.execute("DELETE FROM books WHERE id = ?", (book_id,))
    if c.rowcount == 0:
        conn.close()
        return jsonify({"error": "Книга не найдена"}), 404
    conn.commit(); conn.close()
    return jsonify({"message": "Книга удалена"})

# ===== АДМИН: ПОЛЬЗОВАТЕЛИ =====
@app.route("/api/admin/users", methods=["GET"])
@require_admin
def admin_users_list():
    conn = sqlite3.connect(DB_PATH); c = conn.cursor()
    c.execute("""SELECT u.id, u.name, u.email,
                        (u.password IS NOT NULL AND u.password != '') AS has_pw,
                        (u.totp_secret IS NOT NULL) AS has_2fa,
                        (SELECT COUNT(*) FROM purchases p WHERE p.user_id = u.id) AS cnt
                 FROM users u ORDER BY u.id""")
    rows = c.fetchall(); conn.close()
    return jsonify([{
        "id": r[0], "name": r[1], "email": r[2],
        "has_password": bool(r[3]), "has_2fa": bool(r[4]), "purchases": r[5]
    } for r in rows])

@app.route("/api/admin/users/<int:user_id>", methods=["DELETE"])
@require_admin
def admin_users_delete(user_id):
    conn = sqlite3.connect(DB_PATH); c = conn.cursor()
    c.execute("DELETE FROM users WHERE id = ?", (user_id,))
    if c.rowcount == 0:
        conn.close()
        return jsonify({"error": "Пользователь не найден"}), 404
    c.execute("DELETE FROM purchases WHERE user_id = ?", (user_id,))
    c.execute("DELETE FROM cart WHERE user_id = ?", (user_id,))
    conn.commit(); conn.close()
    return jsonify({"message": "Пользователь удалён"})

# ===== АДМИН: ЗАКАЗЫ =====
@app.route("/api/admin/orders", methods=["GET"])
@require_admin
def admin_orders_list():
    conn = sqlite3.connect(DB_PATH); c = conn.cursor()
    c.execute("""SELECT id, user_id, user_email, items, total, card_last4, status, created_at, refunded_at
                 FROM orders ORDER BY id DESC""")
    rows = c.fetchall(); conn.close()
    result = []
    for r in rows:
        try:
            items = json.loads(r[3]) if r[3] else []
        except Exception:
            items = []
        result.append({
            "id": r[0], "user_id": r[1], "user_email": r[2],
            "items": items, "total": r[4], "card_last4": r[5],
            "status": r[6], "created_at": r[7], "refunded_at": r[8]
        })
    return jsonify(result)

@app.route("/api/admin/orders/<int:order_id>/refund", methods=["POST"])
@require_admin
def admin_order_refund(order_id):
    conn = sqlite3.connect(DB_PATH); c = conn.cursor()
    c.execute("SELECT status, card_last4, total FROM orders WHERE id = ?", (order_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Заказ не найден"}), 404
    if row[0] == "refunded":
        conn.close()
        return jsonify({"error": "Возврат уже выполнен"}), 400
    card = row[1] or "****"
    total = row[2] or 0
    c.execute("UPDATE orders SET status='refunded', refunded_at=? WHERE id=?",
              (datetime.now().isoformat(timespec="seconds"), order_id))
    conn.commit(); conn.close()
    return jsonify({
        "message": f"Возврат {total} ₽ выполнен на карту •••• {card}",
        "amount": total,
        "card_last4": card
    })

# ===== АУТЕНТИФИКАЦИЯ (без изменений) =====
@app.route("/api/send-code", methods=["POST"])
def send_code():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    action = data.get("action", "register")
    if not email or "@" not in email:
        return jsonify({"error": "Введите корректный email"}), 400
    conn = sqlite3.connect(DB_PATH); c = conn.cursor()
    c.execute("SELECT id FROM users WHERE email = ?", (email,))
    user_exists = c.fetchone() is not None
    conn.close()
    if action == "register" and user_exists:
        return jsonify({"error": "Этот email уже зарегистрирован.",
                        "message": "У вас уже есть аккаунт! Хотите войти?",
                        "exists": True}), 409
    if action == "login" and not user_exists:
        return jsonify({"error": "Пользователь с таким email не найден"}), 404
    existing = codes_db.get(email)
    if existing and existing.get("sent_at", 0) + 30 > time.time():
        return jsonify({"error": "Подождите 30 секунд"}), 429
    code = str(random.randint(100000, 999999))
    title = "Код для входа" if action == "login" else "Добро пожаловать в Читай-Город!"
    desc = "Используйте этот код для безопасного входа." if action == "login" else "Введите этот код, чтобы завершить регистрацию."
    if send_email(email, f"{title} 📚", get_beautiful_email_html(title, code, desc)):
        codes_db[email] = {"code": code, "expires": time.time() + CODE_TTL, "sent_at": time.time()}
        return jsonify({"message": "Код отправлен"})
    return jsonify({"error": "Не удалось отправить"}), 500

@app.route("/api/verify-code", methods=["POST"])
def verify_code():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    code = (data.get("code") or "").strip()
    record = codes_db.get(email)
    if not record: return jsonify({"error": "Код не запрашивался"}), 400
    if record["expires"] < time.time(): return jsonify({"error": "Код истёк"}), 400
    if record["code"] != code: return jsonify({"error": "Неверный код"}), 400
    del codes_db[email]
    return jsonify({"message": "Код верный"})

@app.route("/api/login-by-code", methods=["POST"])
def login_by_code():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    conn = sqlite3.connect(DB_PATH); c = conn.cursor()
    c.execute("SELECT id, name, email, totp_secret FROM users WHERE email = ?", (email,))
    user = c.fetchone(); conn.close()
    if not user: return jsonify({"error": "Пользователь не найден"}), 404
    if user[3]:
        totp_code = data.get("totp_code")
        if not totp_code: return jsonify({"error": "2FA_REQUIRED"}), 403
        if not pyotp.TOTP(user[3]).verify(totp_code):
            return jsonify({"error": "Неверный код Google Authenticator"}), 401
    session['user_id'] = user[0]; session['user_name'] = user[1]; session['user_email'] = user[2]
    return jsonify({"message": "Вход выполнен", "user": {"name": user[1], "email": user[2]}})

@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    name = data.get("name")
    email = (data.get("email") or "").strip().lower()
    password = data.get("password")
    conn = sqlite3.connect(DB_PATH); c = conn.cursor()
    c.execute("SELECT id FROM users WHERE email = ?", (email,))
    if c.fetchone():
        conn.close(); return jsonify({"error": "Пользователь уже существует"}), 400
    c.execute("INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
              (name, email, generate_password_hash(password)))
    conn.commit(); conn.close()
    return jsonify({"message": "Регистрация успешна"})

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password")
    totp_code = data.get("totp_code")
    conn = sqlite3.connect(DB_PATH); c = conn.cursor()
    c.execute("SELECT id, name, email, password, totp_secret FROM users WHERE email = ?", (email,))
    user = c.fetchone(); conn.close()
    if user and check_password_hash(user[3], password):
        if user[4]:
            if not totp_code: return jsonify({"error": "2FA_REQUIRED"}), 403
            if not pyotp.TOTP(user[4]).verify(totp_code):
                return jsonify({"error": "Неверный код Google Authenticator"}), 401
        session['user_id'] = user[0]; session['user_name'] = user[1]; session['user_email'] = user[2]
        return jsonify({"message": "Вход выполнен", "user": {"name": user[1], "email": user[2]}})
    return jsonify({"error": "Неверный email или пароль"}), 401

@app.route("/api/setup-2fa", methods=["GET"])
def setup_2fa():
    if 'user_id' not in session: return jsonify({"error": "Не авторизован"}), 401
    secret = pyotp.random_base32()
    session['temp_totp_secret'] = secret
    uri = pyotp.totp.TOTP(secret).provisioning_uri(name=session['user_email'], issuer_name="Chitay-Gorod")
    return jsonify({"secret": secret, "qr_url": f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={uri}"})

@app.route("/api/enable-2fa", methods=["POST"])
def enable_2fa():
    if 'user_id' not in session or 'temp_totp_secret' not in session:
        return jsonify({"error": "Ошибка настройки"}), 400
    code = (request.get_json(silent=True) or {}).get("code")
    secret = session['temp_totp_secret']
    if pyotp.TOTP(secret).verify(code):
        conn = sqlite3.connect(DB_PATH); c = conn.cursor()
        c.execute("UPDATE users SET totp_secret = ? WHERE id = ?", (secret, session['user_id']))
        conn.commit(); conn.close()
        del session['temp_totp_secret']
        return jsonify({"message": "2FA включена"})
    return jsonify({"error": "Неверный код"}), 400

@app.route("/api/disable-2fa", methods=["POST"])
def disable_2fa():
    if 'user_id' not in session: return jsonify({"error": "Не авторизован"}), 401
    conn = sqlite3.connect(DB_PATH); c = conn.cursor()
    c.execute("UPDATE users SET totp_secret = NULL WHERE id = ?", (session['user_id'],))
    conn.commit(); conn.close()
    return jsonify({"message": "2FA отключена"})

@app.route("/api/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    if not email or "@" not in email:
        return jsonify({"error": "Введите корректный email"}), 400
    conn = sqlite3.connect(DB_PATH); c = conn.cursor()
    c.execute("SELECT id FROM users WHERE email = ?", (email,))
    if not c.fetchone():
        conn.close()
        return jsonify({"message": "Если аккаунт существует, письмо отправлено"}), 200
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now() + timedelta(hours=1)
    c.execute("DELETE FROM reset_tokens WHERE email = ?", (email,))
    c.execute("INSERT INTO reset_tokens (email, token, expires_at) VALUES (?, ?, ?)", (email, token, expires_at))
    conn.commit(); conn.close()
    base = os.environ.get("PUBLIC_BASE_URL", "http://localhost:5000")
    reset_link = f"{base}/reset-password.html?token={token}"
    html = f"""<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;">
        <h2>Восстановление пароля</h2>
        <p><a href="{reset_link}" style="background:#667eea;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;">Сбросить пароль</a></p>
        <p>Ссылка действительна 1 час.</p></div>"""
    send_email(email, "Восстановление пароля — Читай-Город", html)
    return jsonify({"message": "Если аккаунт существует, письмо отправлено"}), 200

@app.route("/api/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json(silent=True) or {}
    token = data.get("token"); new_password = data.get("password")
    if not token or not new_password or len(new_password) < 6:
        return jsonify({"error": "Неверные данные"}), 400
    conn = sqlite3.connect(DB_PATH); c = conn.cursor()
    c.execute("SELECT email, expires_at FROM reset_tokens WHERE token = ?", (token,))
    row = c.fetchone()
    if not row:
        conn.close(); return jsonify({"error": "Неверный токен"}), 400
    email, expires_at = row
    try:
        exp = datetime.strptime(expires_at, '%Y-%m-%d %H:%M:%S.%f')
    except ValueError:
        exp = datetime.fromisoformat(expires_at)
    if datetime.now() > exp:
        c.execute("DELETE FROM reset_tokens WHERE token = ?", (token,))
        conn.commit(); conn.close()
        return jsonify({"error": "Срок действия истёк"}), 400
    c.execute("UPDATE users SET password = ? WHERE email = ?", (generate_password_hash(new_password), email))
    c.execute("DELETE FROM reset_tokens WHERE token = ?", (token,))
    conn.commit(); conn.close()
    return jsonify({"message": "Пароль изменён"})

@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Выход выполнен"})

@app.route("/api/user", methods=["GET"])
def get_user():
    if 'user_id' not in session: return jsonify({"user": None})
    conn = sqlite3.connect(DB_PATH); c = conn.cursor()
    c.execute("SELECT book_id FROM purchases WHERE user_id = ?", (session['user_id'],))
    purchases = [r[0] for r in c.fetchall()]
    c.execute("SELECT book_id FROM cart WHERE user_id = ?", (session['user_id'],))
    cart = [r[0] for r in c.fetchall()]
    c.execute("SELECT totp_secret FROM users WHERE id = ?", (session['user_id'],))
    row = c.fetchone(); conn.close()
    return jsonify({
        "user": {"name": session['user_name'], "email": session['user_email'], "has_2fa": bool(row and row[0])},
        "purchases": purchases, "cart": cart
    })

@app.route("/api/delete-account", methods=["POST"])
def delete_account():
    if 'user_id' not in session: return jsonify({"error": "Не авторизован"}), 401
    uid = session['user_id']
    conn = sqlite3.connect(DB_PATH); c = conn.cursor()
    c.execute("DELETE FROM users WHERE id = ?", (uid,))
    c.execute("DELETE FROM purchases WHERE user_id = ?", (uid,))
    c.execute("DELETE FROM cart WHERE user_id = ?", (uid,))
    conn.commit(); conn.close()
    session.clear()
    return jsonify({"message": "Аккаунт удалён"})

@app.route("/api/cart", methods=["POST"])
def update_cart():
    if 'user_id' not in session: return jsonify({"error": "Не авторизован"}), 401
    data = request.get_json(silent=True) or {}
    action = data.get("action"); book_id = data.get("book_id")
    uid = session['user_id']
    conn = sqlite3.connect(DB_PATH); c = conn.cursor()
    if action == "add":
        c.execute("INSERT OR IGNORE INTO cart (user_id, book_id) VALUES (?, ?)", (uid, book_id))
    elif action == "remove":
        c.execute("DELETE FROM cart WHERE user_id = ? AND book_id = ?", (uid, book_id))
    elif action == "clear":
        c.execute("DELETE FROM cart WHERE user_id = ?", (uid,))
    conn.commit(); conn.close()
    return jsonify({"message": "Корзина обновлена"})

@app.route("/api/purchase", methods=["POST"])
def purchase():
    if 'user_id' not in session: return jsonify({"error": "Не авторизован"}), 401
    uid = session['user_id']
    data = request.get_json(silent=True) or {}
    card = (data.get("card_number") or "").replace(" ", "")
    last4 = card[-4:] if len(card) >= 4 else ""
    total_param = data.get("total")

    conn = sqlite3.connect(DB_PATH); c = conn.cursor()
    # Собираем позиции корзины
    c.execute("SELECT book_id FROM cart WHERE user_id = ?", (uid,))
    book_ids = [r[0] for r in c.fetchall()]
    items = []
    total = 0.0
    for bid in book_ids:
        c.execute("SELECT title, price FROM books WHERE id = ?", (bid,))
        row = c.fetchone()
        if row:
            items.append({"id": bid, "title": row[0], "price": row[1] or 0})
            total += row[1] or 0
        else:
            items.append({"id": bid, "title": f"Книга #{bid}", "price": 0})
    if total_param is not None:
        try:
            total = float(total_param)
        except Exception:
            pass

    # Переносим корзину в покупки
    c.execute("INSERT OR IGNORE INTO purchases (user_id, book_id) SELECT user_id, book_id FROM cart WHERE user_id = ?", (uid,))
    c.execute("DELETE FROM cart WHERE user_id = ?", (uid,))

    # Записываем заказ
    c.execute("""INSERT INTO orders (user_id, user_email, items, total, card_last4, status, created_at)
                 VALUES (?,?,?,?,?,?,?)""",
              (uid, session.get('user_email'), json.dumps(items, ensure_ascii=False),
               total, last4, "paid", datetime.now().isoformat(timespec="seconds")))
    order_id = c.lastrowid
    conn.commit(); conn.close()
    return jsonify({"message": "Оплата прошла успешно", "order_id": order_id, "total": total, "card_last4": last4})

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    user_message = data.get("message")
    if not user_message: return jsonify({"error": "Пустое сообщение"}), 400
    key = os.environ.get("OPENROUTER_API_KEY", "")
    if not key:
        return jsonify({"reply": "ИИ-помощник временно недоступен (нет ключа)."})
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json",
               "HTTP-Referer": "https://chitay-gorod", "X-Title": "Chitay-Gorod"}
    payload = {"model": "deepseek/deepseek-v4-flash:free",
               "messages": [{"role": "system", "content": "Ты — вежливый ИИ-помощник онлайн-библиотеки «Читай-Город»."},
                            {"role": "user", "content": user_message}],
               "max_tokens": 300}
    try:
        r = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload, timeout=30)
        r.raise_for_status()
        return jsonify({"reply": r.json()['choices'][0]['message']['content']})
    except Exception as e:
        print(f"Ошибка ИИ: {e}")
        return jsonify({"error": "Не удалось получить ответ"}), 500

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
