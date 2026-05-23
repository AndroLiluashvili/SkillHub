function getEventIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  return id ? parseInt(id, 10) : null;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normaliseText(value) {
  return String(value ?? "")
    .replace(/â€“/g, "-")
    .replace(/â€™/g, "'")
    .replace(/â€œ|â€/g, '"')
    .replace(/Â/g, "");
}

function formatPrice(price) {
  const amount = Number(price || 0);
  if (amount === 0) return "Free";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function formatDate(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return normaliseText(dateValue);

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getEventFormat(event) {
  return normaliseText(event.city).toLowerCase() === "online"
    ? "Online"
    : "In-person";
}

function getEventCategory(event) {
  const text = `${event.title || ""} ${event.description || ""}`.toLowerCase();

  if (text.includes("ai") || text.includes("data")) return "Technology";
  if (text.includes("leadership") || text.includes("communication")) return "Leadership";
  if (text.includes("product")) return "Product";
  if (text.includes("career") || text.includes("interview")) return "Career";
  if (text.includes("startup") || text.includes("entrepreneur")) return "Business";
  if (text.includes("negotiation")) return "Professional skills";

  return "Workshop";
}

function describeWeatherCode(code) {
  const weatherCodes = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Fog",
    51: "Light drizzle",
    61: "Rain",
    63: "Rain",
    65: "Heavy rain",
    71: "Snow",
    80: "Rain showers",
    95: "Thunderstorm",
  };

  return weatherCodes[code] || `Weather code ${code}`;
}

function getWeatherIcon(code) {
  if ([0, 1].includes(code)) return { symbol: "☀", label: "Sunny" };
  if ([2].includes(code)) return { symbol: "⛅", label: "Partly cloudy" };
  if ([3, 45, 48].includes(code)) return { symbol: "☁", label: "Cloudy" };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 80, 81, 82].includes(code)) {
    return { symbol: "☂", label: "Rainy" };
  }
  if ([66, 67, 71, 73, 75, 77, 85, 86].includes(code)) {
    return { symbol: "❄", label: "Snowy" };
  }
  if ([95, 96, 99].includes(code)) return { symbol: "⚡", label: "Thunderstorm" };
  return { symbol: "○", label: "Weather status" };
}

function updateSeatStatus(event) {
  const seatsLeft = Number(event.seats_left ?? event.capacity ?? 0);
  const seatStatus = document.getElementById("seat-status");
  const bookBtn = document.getElementById("book-button");

  if (!seatStatus || !bookBtn) return;

  seatStatus.className = "seat-status";

  if (seatsLeft <= 0) {
    seatStatus.textContent = "This event is fully booked.";
    seatStatus.classList.add("is-full");
    bookBtn.disabled = true;
    bookBtn.textContent = "Event full";
  } else if (seatsLeft <= 5) {
    seatStatus.textContent = `Only ${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} left.`;
    seatStatus.classList.add("is-limited");
    bookBtn.disabled = false;
    bookBtn.textContent = "Book a seat";
  } else {
    seatStatus.textContent = "Seats are available.";
    bookBtn.disabled = false;
    bookBtn.textContent = "Book a seat";
  }
}

function renderWeather(event) {
  const weatherBox = document.getElementById("event-weather");
  if (!weatherBox) return;

  const city = normaliseText(event.city);

  if (getEventFormat(event) === "Online") {
    weatherBox.innerHTML = `
      <h2>Event access</h2>
      <div class="weather-overview">
        <span class="weather-icon" aria-hidden="true">⌂</span>
        <div>
          <p class="weather-temp weather-status-icon">Online</p>
          <p class="mb-0 text-muted">No travel weather is needed for this remote session.</p>
        </div>
      </div>
    `;
    weatherBox.classList.remove("d-none");
    return;
  }

  if (!event.weather || event.weather.temperature == null) {
    const message = event.weather?.message || "Live weather is not available right now.";

    weatherBox.innerHTML = `
      <h2>Weather at location</h2>
      <div class="weather-overview">
        <span class="weather-icon muted" aria-hidden="true">?</span>
        <div>
          <p class="weather-temp weather-status-icon">--</p>
          <p class="mb-1">${escapeHTML(message)}</p>
          <p class="text-muted mb-0">The event is in ${escapeHTML(city)}. Please check again closer to the session.</p>
        </div>
      </div>
    `;
    weatherBox.classList.remove("d-none");
    return;
  }

  const temperature = event.weather.temperature;
  const wind = event.weather.windspeed;
  const code = event.weather.weathercode;
  const icon = getWeatherIcon(code);

  weatherBox.innerHTML = `
    <h2>Weather at location</h2>
    <div class="weather-overview">
      <span class="weather-icon" role="img" aria-label="${escapeHTML(icon.label)}">${escapeHTML(icon.symbol)}</span>
      <div>
        <p class="weather-temp">${escapeHTML(temperature)}&deg;C</p>
        <p class="mb-1">${escapeHTML(describeWeatherCode(code))}</p>
        <p class="text-muted mb-0">Wind ${escapeHTML(wind)} km/h in ${escapeHTML(city)}. Source: ${escapeHTML(event.weather.source || "Open-Meteo")}</p>
      </div>
    </div>
  `;
  weatherBox.classList.remove("d-none");
}

function renderEvent(event) {
  const content = document.getElementById("event-content");
  const title = normaliseText(event.title);
  const city = normaliseText(event.city);
  const location = normaliseText(event.location);
  const format = getEventFormat(event);
  const category = getEventCategory(event);
  const seatsLeft = Number(event.seats_left ?? event.capacity ?? 0);

  document.title = `SkillHub - ${title}`;

  document.getElementById("event-title").textContent = title;
  document.getElementById("event-description").textContent = normaliseText(event.description);
  document.getElementById("event-date").textContent = formatDate(event.date);
  document.getElementById("event-time").textContent = event.time || "TBC";
  document.getElementById("event-location").textContent = `${city} - ${location}`;
  document.getElementById("event-format").textContent = format;
  document.getElementById("event-price").textContent = formatPrice(event.price);
  document.getElementById("event-seats").textContent = `${seatsLeft} of ${event.capacity}`;

  document.getElementById("event-badges").innerHTML = `
    <span class="badge-soft">${escapeHTML(format)}</span>
    <span class="badge-soft badge-neutral">${escapeHTML(category)}</span>
  `;

  updateSeatStatus(event);
  renderWeather(event);
  content.classList.remove("d-none");
}

function showBookMessage(type, message) {
  const msgBox = document.getElementById("book-message");
  if (!msgBox) return;

  msgBox.className = `mt-3 alert alert-${type}`;
  msgBox.textContent = message;
  msgBox.classList.remove("d-none");
  msgBox.focus?.();
}

async function loadEvent() {
  const eventId = getEventIdFromUrl();
  const loading = document.getElementById("event-loading");
  const errorBox = document.getElementById("event-error");
  const content = document.getElementById("event-content");
  const bookBtn = document.getElementById("book-button");

  if (!eventId) {
    loading.classList.add("d-none");
    errorBox.textContent = "No event ID was provided in the page URL.";
    errorBox.classList.remove("d-none");
    return;
  }

  try {
    const event = await apiGet(`/events/${eventId}`);
    loading.classList.add("d-none");
    errorBox.classList.add("d-none");
    renderEvent(event);

    bookBtn.addEventListener("click", async () => {
      const msgBox = document.getElementById("book-message");
      msgBox.classList.add("d-none");

      bookBtn.disabled = true;
      bookBtn.textContent = "Booking...";

      try {
        const res = await apiPost(`/events/${eventId}/book`);
        showBookMessage("success", res.message || "Booking successful.");
        bookBtn.textContent = "Booked";

        const updated = await apiGet(`/events/${eventId}`);
        renderEvent(updated);
        bookBtn.disabled = true;
        bookBtn.textContent = "Booked";
      } catch (err) {
        const message = err.message || "Booking failed. Please try again.";

        if (message.includes("Not logged in")) {
          const msgBox = document.getElementById("book-message");
          msgBox.className = "mt-3 alert alert-warning";
          msgBox.innerHTML = 'You need to <a href="login.html">login</a> before booking this event.';
          msgBox.classList.remove("d-none");
        } else {
          showBookMessage("danger", message);
        }

        const latest = await apiGet(`/events/${eventId}`).catch(() => null);
        if (latest) {
          renderEvent(latest);
        } else {
          bookBtn.disabled = false;
          bookBtn.textContent = "Book a seat";
        }
      }
    });
  } catch (err) {
    loading.classList.add("d-none");
    content.classList.add("d-none");
    errorBox.textContent = err.message || "Failed to load this event.";
    errorBox.classList.remove("d-none");
  }
}

document.addEventListener("DOMContentLoaded", loadEvent);
