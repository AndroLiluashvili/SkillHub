// frontend/js/api.js

const API_BASE = "http://127.0.0.1:5000/api";

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include", // include cookies for session
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function apiPost(path, body = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error || JSON.stringify(data);
    throw new Error(msg);
  }
  return data;
}

async function apiDelete(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error || JSON.stringify(data);
    throw new Error(msg);
  }
  return data;
}
