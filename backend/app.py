import os
import sqlite3
import requests

from flask import Flask, request, jsonify, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash






CITY_COORDS = {
    
    "Tbilisi": (41.7167, 44.7833),
    "Batumi": (41.6416, 41.6359),

    
    "Riga": (56.9496, 24.1052),
    "Vilnius": (54.6872, 25.2797),
    "Tallinn": (59.4370, 24.7536),

    
    "Berlin": (52.5200, 13.4050),
    "Vienna": (48.2082, 16.3738),
    "London": (51.5074, -0.1278),
    "Amsterdam": (52.3676, 4.9041),

    
    "New York": (40.7128, -74.0060),
    "San Francisco": (37.7749, -122.4194),

    
    "Online": None,
}






BASE_DIR = os.path.dirname(__file__)
DB_PATH = os.path.join(BASE_DIR, "skillhub.db")

app = Flask(__name__)
app.config["SECRET_KEY"] = "CHANGE_ME_TO_RANDOM_SECRET"


app.config.update(
    SESSION_COOKIE_HTTPONLY=True,   
    SESSION_COOKIE_SAMESITE="Lax",  
    SESSION_COOKIE_SECURE=False,    
)


CORS(
    app,
    supports_credentials=True,
    origins=[
        "http://localhost:5500",      
        "http://127.0.0.1:5500",
        
    ],
)






def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


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

    
    cur = db.execute("SELECT COUNT(*) AS c FROM events")
    if cur.fetchone()["c"] == 0:
        db.executemany(
            """
            INSERT INTO events
                (title, description, date, time, city, location, capacity, price)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    "AI Workshop for Entrepreneurs",
                    "Hands-on session for founders who want to use AI tools in their startup workflow.",
                    "2025-11-17",
                    "16:00",
                    "Riga",
                    "TechHub Riga – Central Campus",
                    25,
                    150.0,
                ),
                (
                    "Strategic Negotiations Workshop",
                    "Learn practical negotiation skills for business and leadership.",
                    "2025-12-10",
                    "10:00",
                    "Tbilisi",
                    "Tech Park Hall A",
                    30,
                    99.0,
                ),
                (
                    "AI for Managers",
                    "Non-technical introduction to AI and data-driven decisions for managers.",
                    "2025-12-15",
                    "14:00",
                    "Online",
                    "Zoom Webinar",
                    100,
                    49.0,
                ),
                (
                    "Leadership & Communication Bootcamp",
                    "Two-day intensive on public speaking, feedback and conflict resolution.",
                    "2026-01-20",
                    "09:30",
                    "Vilnius",
                    "Innovation Center – Room Aurora",
                    40,
                    179.0,
                ),
                (
                    "Data Storytelling for Business",
                    "Turn raw data into compelling stories and dashboards that drive decisions.",
                    "2026-02-05",
                    "18:00",
                    "Berlin",
                    "Analytics Hub – Main Auditorium",
                    35,
                    129.0,
                ),
                (
                    "Product Management Fundamentals",
                    "From idea validation to MVP and stakeholder management.",
                    "2026-02-12",
                    "10:00",
                    "Vienna",
                    "Digital Innovation Lab – Room Neo",
                    30,
                    139.0,
                ),
                (
                    "Remote Team Leadership",
                    "Best practices for managing distributed teams across time zones.",
                    "2026-03-03",
                    "15:00",
                    "Online",
                    "Microsoft Teams",
                    120,
                    39.0,
                ),
                (
                    "Scaling Startups in Practice",
                    "Fundraising, hiring, and building repeatable growth systems.",
                    "2026-03-15",
                    "11:00",
                    "San Francisco",
                    "SoMa Startup Campus – Stage A",
                    60,
                    220.0,
                ),
                (
                    "Tech Career Kickstart",
                    "Career planning, portfolio, and interview prep for junior developers.",
                    "2026-04-02",
                    "17:30",
                    "New York",
                    "Midtown Innovation Hub – Loft 3B",
                    50,
                    89.0,
                ),
            ],
        )
        db.commit()

    db.close()



init_db()






def require_login():
    if "user_id" not in session:
        return False, jsonify({"error": "Not logged in"}), 401
    return True, None, None






@app.get("/")
def home():
    return jsonify(
        {
            "message": "SkillHub API is running",
            "endpoints": [
                "/api/events",
                "/api/register",
                "/api/login",
                "/api/my-bookings",
                "/api/cities",
            ],
        }
    )






@app.get("/api/cities")
def get_cities():
    """
    Return list of available cities (keys of CITY_COORDS).
    Useful for dropdowns in the frontend.
    """
    return jsonify(sorted([c for c in CITY_COORDS.keys() if c != "Online"]))






@app.post("/api/register")
def register():
    data = request.json or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not name or not email or not password:
        return jsonify({"error": "Name, email and password are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    if "@" not in email:
        return jsonify({"error": "Invalid email format"}), 400

    db = get_db()
    try:
        db.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
            (name, email, generate_password_hash(password)),
        )
        db.commit()
    except sqlite3.IntegrityError:
        db.close()
        return jsonify({"error": "Email already exists"}), 400

    db.close()
    return jsonify({"message": "Registration successful"}), 201


@app.post("/api/login")
def login():
    data = request.json or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    db = get_db()
    user = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    db.close()

    if user is None or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid email or password"}), 401

    session["user_id"] = user["id"]
    session["user_name"] = user["name"]

    return jsonify(
        {
            "message": "Logged in",
            "user": {"id": user["id"], "name": user["name"], "email": user["email"]},
        }
    )


@app.post("/api/logout")
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})






def get_weather_for_city(city: str):
    """
    Fetch current weather for a given city using Open-Meteo.
    Returns a small dict or None if not available / error.
    """
    coords = CITY_COORDS.get(city)
    if not coords:
        return None

    lat, lon = coords
    try:
        resp = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat,
                "longitude": lon,
                "current_weather": "true",
            },
            timeout=5,
        )
        if resp.status_code != 200:
            return None
        data = resp.json()
        cw = data.get("current_weather")
        if not cw:
            return None

        return {
            "temperature": cw.get("temperature"),
            "windspeed": cw.get("windspeed"),
            "weathercode": cw.get("weathercode"),
        }
    except Exception:
        return None






@app.get("/api/events")
def get_events():
    db = get_db()
    events = db.execute(
        "SELECT * FROM events ORDER BY date ASC, time ASC"
    ).fetchall()
    db.close()
    return jsonify([dict(e) for e in events])


@app.get("/api/events/<int:event_id>")
def get_event(event_id):
    db = get_db()
    event = db.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
    if event is None:
        db.close()
        return jsonify({"error": "Event not found"}), 404

    booked = db.execute(
        "SELECT COUNT(*) AS c FROM bookings WHERE event_id = ?", (event_id,)
    ).fetchone()["c"]
    db.close()

    event_dict = dict(event)
    event_dict["seats_left"] = event_dict["capacity"] - booked

    
    weather = get_weather_for_city(event_dict.get("city"))
    event_dict["weather"] = weather  

    return jsonify(event_dict)


@app.post("/api/events")
def create_event():
    
    ok, resp, code = require_login()
    if not ok:
        return resp, code

    data = request.json or {}

    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()
    date = (data.get("date") or "").strip()         
    time = (data.get("time") or "").strip()         
    city = (data.get("city") or "").strip()
    location = (data.get("location") or "").strip()
    capacity = data.get("capacity")
    price = data.get("price")

    
    if not title or not date or not time or not city or not location:
        return jsonify({"error": "Title, date, time, city and location are required"}), 400

    try:
        capacity = int(capacity)
        price = float(price)
    except (TypeError, ValueError):
        return jsonify({"error": "Capacity must be integer and price must be a number"}), 400

    db = get_db()
    cur = db.execute(
        """
        INSERT INTO events (title, description, date, time, city, location, capacity, price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (title, description, date, time, city, location, capacity, price),
    )
    db.commit()
    new_id = cur.lastrowid
    db.close()

    return jsonify({"message": "Event created", "id": new_id}), 201






@app.post("/api/events/<int:event_id>/book")
def book_event(event_id):
    ok, resp, code = require_login()
    if not ok:
        return resp, code

    db = get_db()

    event = db.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
    if event is None:
        db.close()
        return jsonify({"error": "Event not found"}), 404

    booked = db.execute(
        "SELECT COUNT(*) AS c FROM bookings WHERE event_id = ?", (event_id,)
    ).fetchone()["c"]

    if booked >= event["capacity"]:
        db.close()
        return jsonify({"error": "Event is full"}), 400

    try:
        db.execute(
            "INSERT INTO bookings (user_id, event_id) VALUES (?, ?)",
            (session["user_id"], event_id),
        )
        db.commit()
    except sqlite3.IntegrityError:
        db.close()
        return jsonify({"error": "You already booked this event"}), 400

    db.close()
    return jsonify({"message": "Booking successful"})


@app.get("/api/me")
def me():
    if "user_id" not in session:
        return jsonify({"user": None})
    return jsonify({
        "user": {
            "id": session["user_id"],
            "name": session.get("user_name"),
        }
    })


@app.get("/api/my-bookings")
def my_bookings():
    ok, resp, code = require_login()
    if not ok:
        return resp, code

    db = get_db()
    bookings = db.execute(
        """
        SELECT b.id, e.title, e.date, e.time, e.city, e.location
        FROM bookings b
        JOIN events e ON e.id = b.event_id
        WHERE b.user_id = ?
        ORDER BY e.date ASC, e.time ASC
        """,
        (session["user_id"],),
    ).fetchall()
    db.close()

    return jsonify([dict(b) for b in bookings])


@app.delete("/api/bookings/<int:booking_id>")
def cancel_booking(booking_id):
    ok, resp, code = require_login()
    if not ok:
        return resp, code

    db = get_db()
    db.execute(
        "DELETE FROM bookings WHERE id = ? AND user_id = ?",
        (booking_id, session["user_id"]),
    )
    db.commit()
    db.close()

    return jsonify({"message": "Booking cancelled"})






if __name__ == "__main__":
    app.run(debug=True)
