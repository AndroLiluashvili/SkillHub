from flask import app, jsonify

from backend.app import get_db


@app.get("/api/events")
def get_events():
    db = get_db()
    events = db.execute("SELECT * FROM events").fetchall()
    return jsonify([dict(e) for e in events])


@app.get("/api/events/<int:event_id>")
def event_detail(event_id):
    db = get_db()
    event = db.execute(
        "SELECT * FROM events WHERE id = ?", (event_id,)
    ).fetchone()

    if event is None:
        return jsonify({"error": "Not found"}), 404

    # count bookings
    booked = db.execute(
        "SELECT COUNT(*) AS c FROM bookings WHERE event_id = ?",
        (event_id,),
    ).fetchone()["c"]

    event = dict(event)
    event["seats_left"] = event["capacity"] - booked

    return jsonify(event)
