const bookingsContainer = document.getElementById("bookings-container");
const bookingsLoading = document.getElementById("bookings-loading");
const bookingsAlert = document.getElementById("bookings-alert");
const bookingsSuccess = document.getElementById("bookings-success");
const bookingsSummary = document.getElementById("bookings-summary");

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
    .replace(/Ã¢â‚¬â€œ/g, "-")
    .replace(/Ã¢â‚¬â„¢/g, "'")
    .replace(/Ã¢â‚¬Å“|Ã¢â‚¬/g, '"')
    .replace(/Ã‚/g, "");
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

function getDateParts(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return { day: "", monthYear: formatDate(dateValue) };
  }

  return {
    day: new Intl.DateTimeFormat("en-GB", { day: "numeric" }).format(date),
    monthYear: new Intl.DateTimeFormat("en-GB", {
      month: "short",
      year: "numeric",
    }).format(date),
  };
}

function getDaysUntil(dateValue) {
  const today = new Date();
  const eventDate = new Date(`${dateValue}T00:00:00`);
  today.setHours(0, 0, 0, 0);

  if (Number.isNaN(eventDate.getTime())) return null;

  return Math.round((eventDate - today) / 86400000);
}

function getCountdownText(dateValue) {
  const days = getDaysUntil(dateValue);
  if (days === null) return "Upcoming";
  if (days < 0) return "Past event";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

function showBookingsError(message) {
  if (!bookingsAlert) return;
  bookingsAlert.textContent = message;
  bookingsAlert.classList.remove("d-none");
  bookingsAlert.focus();
}

function showBookingsSuccess(message) {
  if (!bookingsSuccess) return;
  bookingsSuccess.textContent = message;
  bookingsSuccess.classList.remove("d-none");
  bookingsSuccess.focus();
}

function clearBookingMessages() {
  bookingsAlert?.classList.add("d-none");
  bookingsSuccess?.classList.add("d-none");
}

function renderSummary(bookings) {
  if (!bookingsSummary) return;

  if (!bookings.length) {
    bookingsSummary.classList.add("d-none");
    bookingsSummary.innerHTML = "";
    return;
  }

  const nextBooking = bookings[0];
  const cities = new Set(bookings.map((booking) => normaliseText(booking.city)).filter(Boolean));

  bookingsSummary.innerHTML = `
    <div class="summary-card">
      <span class="summary-value">${escapeHTML(bookings.length)}</span>
      <span class="summary-label">${bookings.length === 1 ? "active booking" : "active bookings"}</span>
    </div>
    <div class="summary-card">
      <span class="summary-value">${escapeHTML(formatDate(nextBooking.date))}</span>
      <span class="summary-label">next session</span>
    </div>
    <div class="summary-card">
      <span class="summary-value">${escapeHTML(cities.size)}</span>
      <span class="summary-label">${cities.size === 1 ? "location" : "locations"}</span>
    </div>
  `;
  bookingsSummary.classList.remove("d-none");
}

function renderEmptyState() {
  renderSummary([]);
  bookingsContainer.innerHTML = `
    <div class="empty-state bookings-empty">
      <span class="empty-icon" aria-hidden="true">+</span>
      <h2>No bookings yet</h2>
      <p>Book a SkillHub event and it will appear here with the date, location and cancellation option.</p>
      <a class="btn btn-primary" href="index.html#events-browse">Browse events</a>
    </div>
  `;
}

function renderBookingCard(booking) {
  const title = normaliseText(booking.title);
  const city = normaliseText(booking.city);
  const location = normaliseText(booking.location);
  const eventUrl = `event.html?id=${encodeURIComponent(booking.event_id)}`;
  const dateParts = getDateParts(booking.date);

  return `
    <article class="booking-card">
      <div class="booking-date-block" aria-hidden="true">
        <span>${escapeHTML(dateParts.day)}</span>
        <strong>${escapeHTML(dateParts.monthYear)}</strong>
      </div>
      <div class="booking-main">
        <div class="booking-title-row">
          <span class="badge-soft badge-neutral">${escapeHTML(getCountdownText(booking.date))}</span>
          <span class="booking-date-text">${escapeHTML(formatDate(booking.date))} at ${escapeHTML(booking.time || "TBC")}</span>
        </div>
        <h2>${escapeHTML(title)}</h2>
        <div class="booking-meta">
          <span>${escapeHTML(city)} - ${escapeHTML(location)}</span>
          <span>${escapeHTML(formatPrice(booking.price))}</span>
        </div>
      </div>
      <div class="booking-actions">
        <a href="${eventUrl}" class="btn btn-outline-primary btn-sm">View event</a>
        <button
          type="button"
          class="btn btn-outline-danger btn-sm cancel-booking-btn"
          data-booking-id="${escapeHTML(booking.id)}"
          data-booking-title="${escapeHTML(title)}">
          Cancel
        </button>
      </div>
    </article>
  `;
}

async function loadBookings() {
  if (!bookingsContainer || !bookingsLoading || !bookingsAlert) return;

  bookingsLoading.classList.remove("d-none");
  clearBookingMessages();
  bookingsContainer.innerHTML = "";
  renderSummary([]);

  try {
    const bookings = await apiGet("/my-bookings");
    bookingsLoading.classList.add("d-none");

    if (!bookings.length) {
      renderEmptyState();
      return;
    }

    renderSummary(bookings);
    bookingsContainer.innerHTML = bookings.map(renderBookingCard).join("");
  } catch (err) {
    bookingsLoading.classList.add("d-none");

    if ((err.message || "").includes("Not logged in")) {
      renderSummary([]);
      bookingsContainer.innerHTML = `
        <div class="empty-state bookings-empty">
          <h2>Login required</h2>
          <p>Please login to view your event bookings.</p>
          <a class="btn btn-primary" href="login.html">Login</a>
        </div>
      `;
    } else {
      showBookingsError(err.message || "Failed to load bookings.");
    }
  }
}

if (bookingsContainer) {
  bookingsContainer.addEventListener("click", async (e) => {
    const btn = e.target.closest(".cancel-booking-btn");
    if (!btn) return;

    const bookingId = btn.getAttribute("data-booking-id");
    if (!bookingId) return;

    const title = btn.getAttribute("data-booking-title") || "this booking";
    const confirmed = window.confirm(`Cancel your booking for ${title}?`);
    if (!confirmed) return;

    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Cancelling...";
    clearBookingMessages();

    try {
      await apiDelete(`/bookings/${bookingId}`);
      await loadBookings();
      showBookingsSuccess("Booking cancelled.");
    } catch (err) {
      btn.disabled = false;
      btn.textContent = originalText;
      showBookingsError(err.message || "Could not cancel booking.");
    }
  });
}

document.addEventListener("DOMContentLoaded", loadBookings);
