import sqlite3
from flask import jsonify, session
from backend.app import get_db, app


@app.post("/api/events/<int:event_id>/book")
def book_event(event_id):
    """Book a seat for an event for the currently logged-in user."""
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    db = get_db()

    
    event = db.execute(
        "SELECT * FROM events WHERE id = ?", (event_id,)
    ).fetchone()
    if event is None:
        db.close()
        return jsonify({"error": "Event not found"}), 404

    
    booked = db.execute(
        "SELECT COUNT(*) AS c FROM bookings WHERE event_id = ?",
        (event_id,),
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
        return jsonify({"error": "Already booked"}), 400

    db.close()
    return jsonify({"message": "Booking successful"})


@app.get("/api/my-bookings")
def my_bookings():
    """Return list of bookings for the current user."""
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    db = get_db()
    bookings = db.execute(
        """
        SELECT b.id,
               e.title,
               e.date,
               e.time,
               e.city,
               e.location
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
    """Cancel a booking that belongs to the current user."""
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    db = get_db()
    db.execute(
        "DELETE FROM bookings WHERE id = ? AND user_id = ?",
        (booking_id, session["user_id"]),
    )
    db.commit()
    db.close()

    return jsonify({"message": "Booking cancelled"})
