@app.post("/api/events/<int:event_id>/book")
def book_event(event_id):
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    db = get_db()

    # Check if event exists
    event = db.execute(
        "SELECT * FROM events WHERE id = ?", (event_id,)
    ).fetchone()
    if event is None:
        return jsonify({"error": "Event not found"}), 404

    # Check capacity
    booked = db.execute(
        "SELECT COUNT(*) AS c FROM bookings WHERE event_id = ?",
        (event_id,),
    ).fetchone()["c"]

    if booked >= event["capacity"]:
        return jsonify({"error": "Event is full"}), 400

    try:
        db.execute(
            "INSERT INTO bookings (user_id, event_id) VALUES (?, ?)",
            (session["user_id"], event_id),
        )
        db.commit()
        return jsonify({"message": "Booking successful"})
    except sqlite3.IntegrityError:
        return jsonify({"error": "Already booked"}), 400


@app.get("/api/my-bookings")
def my_bookings():
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    db = get_db()

    bookings = db.execute(
        """
        SELECT b.id, e.title, e.date, e.time, e.location
        FROM bookings b
        JOIN events e ON e.id = b.event_id
        WHERE b.user_id = ?
        """,
        (session["user_id"],),
    ).fetchall()

    return jsonify([dict(b) for b in bookings])
