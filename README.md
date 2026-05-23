# SkillHub — Local run & test

Quick instructions to run the backend and test the frontend locally.

1. Create and activate a Python virtual environment

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2. Install dependencies

```powershell
pip install -r backend/requirements.txt
```

3. Run the backend (development)

```powershell
python backend/app.py
```

By default the Flask server listens on `http://127.0.0.1:5000`. The frontend pages are static files under `frontend/` — open them directly in a browser or serve them via a static server.

4. Serve frontend (recommended for fetch APIs; ensure pages are served from http(s) origin)

Simple Python static server (from project root):

```powershell
python -m http.server 8000 --directory frontend
# then open http://127.0.0.1:8000/index.html
```

5. Test flows

- Register a user via the UI or `POST /api/register`.
- Login and keep cookies (`fetch` uses `credentials: 'include'`).
- Create an event (Create Event page) — requires authentication.
- Book an event from the event detail page and verify it appears on My Bookings.

Notes & troubleshooting

- If you change `backend/app.py` code, restart the server. Enable Flask debug if desired by setting `FLASK_ENV=development`.
- Weather lookups require outbound network access to Open-Meteo.
