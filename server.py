import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import ssl
import random
import time
import os
import sqlite3
import secrets
from datetime import datetime, timedelta
import requests
import pyotp
from flask import Flask, request, jsonify, send_from_directory, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__, static_folder='.', static_url_path='')
app.secret_key = os.environ.get('SECRET_KEY', 'super_secret_key_chitay_gorod_2024')
CORS(app, supports_credentials=True)

# Если база на Netrun лежит в /data, используем её. Иначе - локально.
DB_PATH = '/data/library.db' if os.path.exists('/data') else 'library.db'

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Создаем таблицы, если их нет (СРАЗУ включаем totp_secret для новых баз)
    c.execute('''CREATE TABLE IF NOT EXISTS users 
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT UNIQUE, password TEXT, totp_secret TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS purchases 
                 (user_id INTEGER, book_id INTEGER, PRIMARY KEY (user_id, book_id))''')
    c.execute('''CREATE TABLE IF NOT EXISTS cart 
                 (user_id INTEGER, book_id INTEGER, PRIMARY KEY (user_id, book_id))''')
    c.execute('''CREATE TABLE IF NOT EXISTS reset_tokens 
                 (email TEXT, token TEXT UNIQUE, expires_at DATETIME)''')
    
    # Проверяем, есть ли колонка totp_secret (для безопасного обновления старых баз)
    c.execute("PRAGMA table_info(users)")
    columns = [row[1] for row in c.fetchall()]
    
    if 'totp_secret' not in columns:
        try:
            c.execute("ALTER TABLE users ADD COLUMN totp_secret TEXT")
            conn.commit()
            print("✅ Колонка totp_secret успешно добавлена в базу данных.")
        except sqlite3.OperationalError as e:
            print(f"❌ ОШИБКА: Не удалось добавить колонку totp_secret. Причина: {e}")
            print("💡 Совет: Удалите файл library.db, чтобы он создался заново.")
    else:
        print("ℹ️ Колонка totp_secret уже существует в таблице users.")
        
    conn.commit()
    conn.close()

init_db()

# ===== НАСТРОЙКИ ПОЧТЫ =====
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
    msg["From"] = f"Читай-Город <{FROM_EMAIL}>"
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
                <p style="color: #888888; font-size: 13px;">Код действует 10 минут. Если вы не запрашивали его, просто проигнорируйте письмо.</p>
            </div>
            <div style="background-color: #131322; padding: 20px; text-align: center; color: #555555; font-size: 12px;">
                © 2024 Издательство «Читай-Город». Все права защищены.
            </div>
        </div>
    </div>
    """

# ===== АУТЕНТИФИКАЦИЯ =====
@app.route("/api/send-code", methods=["POST"])
def send_code():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    action = data.get("action", "register")
    
    if not email or "@" not in email:
        return jsonify({"error": "Введите корректный email"}), 400
    
    if action == "login":
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT id FROM users WHERE email = ?", (email,))
        if not c.fetchone():
            conn.close()
            return jsonify({"error": "Пользователь с таким email не найден"}), 404
        conn.close()

    existing = codes_db.get(email)
    if existing and existing.get("sent_at", 0) + 30 > time.time():
        return jsonify({"error": "Подождите 30 секунд"}), 429
    
    code = str(random.randint(100000, 999999))
    title = "Код для входа" if action == "login" else "Подтверждение регистрации"
    desc = "Используйте этот код для входа в ваш аккаунт." if action == "login" else "Введите этот код, чтобы завершить создание аккаунта."
    html = get_beautiful_email_html(title, code, desc)
    
    if send_email(email, f"{title} — Читай-Город", html):
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
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id, name, email, totp_secret FROM users WHERE email = ?", (email,))
    user = c.fetchone()
    conn.close()
    
    if not user:
        return jsonify({"error": "Пользователь не найден"}), 404
        
    if user[3]: 
        totp_code = data.get("totp_code")
        if not totp_code:
            return jsonify({"error": "2FA_REQUIRED"}), 403
        totp = pyotp.TOTP(user[3])
        if not totp.verify(totp_code):
            return jsonify({"error": "Неверный код Google Authenticator"}), 401

    session['user_id'] = user[0]
    session['user_name'] = user[1]
    session['user_email'] = user[2]
    return jsonify({"message": "Вход выполнен", "user": {"name": user[1], "email": user[2]}})

@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    name = data.get("name")
    email = data.get("email").strip().lower()
    password = data.get("password")
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id FROM users WHERE email = ?", (email,))
    if c.fetchone():
        conn.close()
        return jsonify({"error": "Пользователь уже существует"}), 400
        
    hashed_pw = generate_password_hash(password)
    c.execute("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", (name, email, hashed_pw))
    conn.commit()
    conn.close()
    return jsonify({"message": "Регистрация успешна"})

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email").strip().lower()
    password = data.get("password")
    totp_code = data.get("totp_code")
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id, name, email, password, totp_secret FROM users WHERE email = ?", (email,))
    user = c.fetchone()
    conn.close()
    
    if user and check_password_hash(user[3], password):
        if user[4]:
            if not totp_code:
                return jsonify({"error": "2FA_REQUIRED"}), 403
            totp = pyotp.TOTP(user[4])
            if not totp.verify(totp_code
