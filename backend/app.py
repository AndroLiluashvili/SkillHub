from flask import Flask, request, jsonify, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import os

app = Flask(__name__)
app.config["SECRET_KEY"] = "CHANGE_THIS"

CORS(app, supports_credentials=True)  # allow frontend to call backend


DB_PATH = os.path.join(os.path.dirname(__file__), "skillhub.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# -----------------------------
# Initialize database if needed
# -----------------------------
def init_db():
    db = get_db()
    db.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            date TEXT,
            time TEXT,
            city TEXT,
            location TEXT,
            capacity INTEGER,
            price REAL
        );

        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            event_id INTEGER NOT NULL,
            UNIQUE(user_id, event_id)
        );
        """
    )
    db.commit()


init_db()

@app.post("/api/register")
def register():
    data = request.json
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    if not name or not email or not password:
        return jsonify({"error": "Missing fields"}), 400

    db = get_db()

    try:
        db.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
            (name, email, generate_password_hash(password)),
        )
        db.commit()
        return jsonify({"message": "Registration successful"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Email already exists"}), 400


@app.post("/api/login")
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    db = get_db()
    user = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()

    if user is None or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid credentials"}), 401

    session["user_id"] = user["id"]

    return jsonify({"message": "Logged in", "user": dict(user)})
