const USER_STORAGE_KEY = "skillhub_user";
const THEME_STORAGE_KEY = "skillhub_theme";
const AUTH_GATE_KEY = "skillhub_auth_gate_seen";

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function saveUserToLocal(user) {
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
}

function getCurrentPage() {
  return window.location.pathname.split("/").pop() || "index.html";
}

function isAuthPage() {
  return ["login.html", "register.html"].includes(getCurrentPage());
}

function shouldShowFirstAccessGate(user) {
  return getCurrentPage() === "index.html"
    && !user
    && !sessionStorage.getItem(AUTH_GATE_KEY);
}

function handleAuthRedirect(user) {
  if (shouldShowFirstAccessGate(user)) {
    sessionStorage.setItem(AUTH_GATE_KEY, "true");
    window.location.href = "login.html?welcome=1";
    return true;
  }

  if (user && isAuthPage()) {
    window.location.href = "index.html";
    return true;
  }

  return false;
}

function getSavedTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === "dark" || savedTheme === "light") return savedTheme;
  return "light";
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  updateThemeToggle(theme);
}

function updateThemeToggle(theme = getSavedTheme()) {
  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;

  const isDark = theme === "dark";
  toggle.setAttribute("aria-pressed", String(isDark));
  toggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
  toggle.setAttribute("title", isDark ? "Switch to light mode" : "Switch to dark mode");
  toggle.innerHTML = `<span aria-hidden="true">${isDark ? "&#9728;" : "&#9790;"}</span>`;
}

function bindThemeToggle() {
  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;

  updateThemeToggle(document.documentElement.dataset.theme || getSavedTheme());
  toggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.dataset.theme || getSavedTheme();
    applyTheme(currentTheme === "dark" ? "light" : "dark");
  });
}

function getThemeControlHTML() {
  return `
    <li class="nav-item">
      <button class="nav-link nav-button theme-toggle" type="button"
              id="theme-toggle" aria-pressed="false"
              aria-label="Switch to dark mode" title="Switch to dark mode"></button>
    </li>
  `;
}

function updateHeroAccountLinks(user) {
  const accountLinks = document.querySelectorAll('a[href="register.html"].btn, a[href="my-bookings.html"].btn');
  accountLinks.forEach((link) => {
    if (user) {
      link.href = "my-bookings.html";
      link.textContent = "My Bookings";
    } else if (link.textContent.trim() === "My Bookings") {
      link.href = "register.html";
      link.textContent = "Create Account";
    }
  });
}

function getUserInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "?";
  return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join("");
}

function removeSessionBanner() {
  document.getElementById("session-banner")?.remove();
}

function showSessionBanner(user) {
  const params = new URLSearchParams(window.location.search);
  if (params.get("login") !== "success" || !user) return;

  const nav = document.querySelector(".navbar");
  if (!nav || document.getElementById("session-banner")) return;

  const banner = document.createElement("div");
  banner.id = "session-banner";
  banner.className = "session-banner";
  banner.setAttribute("role", "status");
  banner.innerHTML = `
    <div class="container session-banner-inner">
      <span>You are signed in and can now book events.</span>
      <button type="button" class="session-banner-close" aria-label="Dismiss sign in message">&times;</button>
    </div>
  `;

  nav.insertAdjacentElement("afterend", banner);
  banner.querySelector(".session-banner-close")?.addEventListener("click", () => {
    banner.remove();
  });

  window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
}

function updateNavbarAuth(user) {
  const navAuth = document.getElementById("nav-auth");
  if (!navAuth) return;

  navAuth.innerHTML = "";

  if (user) {
    const userName = escapeHTML(user.name || "User");
    const initials = escapeHTML(getUserInitials(user.name));

    navAuth.innerHTML = `
      <li class="nav-item">
        <a class="nav-link" href="create-event.html">Create event</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" href="my-bookings.html">My bookings</a>
      </li>
      <li class="nav-item dropdown">
        <button class="nav-link nav-button account-button"
                type="button"
                id="account-menu"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                aria-label="Account menu, signed in as ${userName}">
          <span aria-hidden="true">${initials}</span>
        </button>
        <ul class="dropdown-menu dropdown-menu-end account-dropdown" aria-labelledby="account-menu">
          <li><h2 class="dropdown-header">Signed in as ${userName}</h2></li>
          <li><a class="dropdown-item" href="my-bookings.html">My bookings</a></li>
          <li><a class="dropdown-item" href="create-event.html">Create event</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><button class="dropdown-item" type="button" id="logout-link">Logout</button></li>
        </ul>
      </li>
      ${getThemeControlHTML()}
    `;

    document.getElementById("logout-link")?.addEventListener("click", logout);
  } else {
    navAuth.innerHTML = `
      <li class="nav-item">
        <a class="nav-link" href="login.html">Login</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" href="register.html">Register</a>
      </li>
      ${getThemeControlHTML()}
    `;
  }

  bindThemeToggle();
}

async function syncCurrentUser() {
  try {
    const res = await apiGet("/me");
    const user = res.user || null;
    saveUserToLocal(user);

    if (!user) removeSessionBanner();
    if (handleAuthRedirect(user)) return;

    updateNavbarAuth(user);
    updateHeroAccountLinks(user);
    showSessionBanner(user);
  } catch (e) {
    console.error("Failed to sync user:", e);
    saveUserToLocal(null);
    removeSessionBanner();
    updateNavbarAuth(null);
    updateHeroAccountLinks(null);
  }
}

async function registerUser(name, email, password) {
  return apiPost("/register", { name, email, password });
}

async function loginUser(email, password) {
  const res = await apiPost("/login", { email, password });
  saveUserToLocal(res.user);
  return res.user;
}

async function logout() {
  try {
    await apiPost("/logout", {});
  } catch (e) {
    console.warn("Logout error (ignored):", e);
  }
  saveUserToLocal(null);
  sessionStorage.removeItem(AUTH_GATE_KEY);
  window.location.href = "login.html?welcome=1";
}

document.addEventListener("DOMContentLoaded", () => {
  applyTheme(getSavedTheme());
  updateNavbarAuth(null);
  updateHeroAccountLinks(null);
  syncCurrentUser();
});
