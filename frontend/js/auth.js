

const USER_STORAGE_KEY = "skillhub_user";

function saveUserToLocal(user) {
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
}

function getUserFromLocal() {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}


async function syncCurrentUser() {
  try {
    const res = await apiGet("/me");
    const user = res.user || null;
    saveUserToLocal(user);
    updateNavbarAuth(user);
  } catch (e) {
    console.error("Failed to sync user:", e);
    updateNavbarAuth(null);
  }
}


function updateNavbarAuth(user) {
  const navAuth = document.getElementById("nav-auth");
  if (!navAuth) return;

  navAuth.innerHTML = "";

  if (user) {
    navAuth.innerHTML = `
        <li class="nav-item">
          <a class="nav-link" href="create-event.html">Create event</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="my-bookings.html">My bookings</a>
        </li>
        <li class="nav-item">
          <span class="nav-link disabled">Hi, ${user.name}</span>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="#" id="logout-link">Logout</a>
        </li>
      `;

    const logoutLink = document.getElementById("logout-link");
    if (logoutLink) {
      logoutLink.addEventListener("click", async (e) => {
        e.preventDefault();
        await logout();
      });
    }
  } else {
    navAuth.innerHTML = `
      <li class="nav-item">
        <a class="nav-link" href="login.html">Login</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" href="register.html">Register</a>
      </li>
    `;
  }
}


async function registerUser(name, email, password) {
  return apiPost("/register", { name, email, password });
}

async function loginUser(email, password) {
  const res = await apiPost("/login", { email, password });
  const user = res.user;
  saveUserToLocal(user);
  return user;
}

async function logout() {
  try {
    await apiPost("/logout", {});
  } catch (e) {
    console.warn("Logout error (ignored):", e);
  }
  saveUserToLocal(null);
  
  window.location.href = "index.html";
}


document.addEventListener("DOMContentLoaded", () => {
  
  updateNavbarAuth(getUserFromLocal());
  syncCurrentUser();
});
