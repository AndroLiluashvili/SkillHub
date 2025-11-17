import os
import sqlite3
import requests   

from flask import Flask, request, jsonify, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

CITY_COORDS = {
    "Tbilisi": (41.7167, 44.7833),
    "Online": None, 
}

# ------------------------------------------------
# CONFIG
# ------------------------------------------------

BASE_DIR = os.path.dirname(__file__)
DB_PATH = os.path.join(BASE_DIR, "skillhub.db")

app = Flask(__name__)
app.config["SECRET_KEY"] = "CHANGE_ME_TO_RANDOM_SECRET"

# Session cookie security
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,   # JS cannot read the cookie
    SESSION_COOKIE_SAMESITE="Lax",  # helps against CSRF from other sites
    SESSION_COOKIE_SECURE=False,    # set True if you deploy over HTTPS
)

# Allow only your frontend origin(s) for CORS, not everyone
CORS(
    app,
    supports_credentials=True,
    origins=[
        "http://localhost:5500",      # static server from frontend/
        "http://127.0.0.1:5500",
        # you can add your real domain later if deployed
    ],
)



# ------------------------------------------------
# DB HELPERS
# ------------------------------------------------

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

    # seed a few events if empty
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
                    "Strategic Negotiations Workshop",
                    "Learn practical negotiation skills for business.",
                    "2025-12-10",
                    "10:00",
                    "Tbilisi",
                    "Tech Park Hall A",
                    30,
                    99.0,
                ),
                (
                    "AI for Managers",
                    "Non-technical introduction to AI and data-driven decisions.",
                    "2025-12-15",
                    "14:00",
                    "Online",
                    "Zoom Webinar",
                    100,
                    49.0,
                ),
            ],
        )
        db.commit()

    db.close()


# run once on import
init_db()


# ------------------------------------------------
# SMALL HELPER
# ------------------------------------------------

def require_login():
    if "user_id" not in session:
        return False, jsonify({"error": "Not logged in"}), 401
    return True, None, None


# ------------------------------------------------
# ROOT
# ------------------------------------------------

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
            ],
        }
    )


# ------------------------------------------------
# AUTH ROUTES
# ------------------------------------------------

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


# ------------------------------------------------
# EVENTS ROUTES
# ------------------------------------------------

@app.get("/api/events")
def get_events():
    db = get_db()
    events = db.execute(
        "SELECT * FROM events ORDER BY date ASC, time ASC"
    ).fetchall()
    db.close()
    return jsonify([dict(e) for e in events])

def get_weather_for_city(city: str):
  """Fetch current weather for a given city using Open-Meteo.
  Returns a small dict or None if not available / error."""
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
    event_dict["weather"] = weather  # may be None

    return jsonify(event_dict)

@app.post("/api/events")
def create_event():
    # Must be logged in to create an event
    ok, resp, code = require_login()
    if not ok:
        return resp, code

    data = request.json or {}

    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()
    date = (data.get("date") or "").strip()         # format: YYYY-MM-DD
    time = (data.get("time") or "").strip()         # format: HH:MM
    city = (data.get("city") or "").strip()
    location = (data.get("location") or "").strip()
    capacity = data.get("capacity")
    price = data.get("price")

    # Basic validation
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

# ------------------------------------------------
# BOOKINGS ROUTES
# ------------------------------------------------

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


# ------------------------------------------------
# RUN
# ------------------------------------------------

if __name__ == "__main__":
    app.run(debug=True)
