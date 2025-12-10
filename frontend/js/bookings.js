

const bookingsContainer = document.getElementById("bookings-container");
const bookingsLoading = document.getElementById("bookings-loading");
const bookingsAlert = document.getElementById("bookings-alert");


const BACKEND_BASE = "http://127.0.0.1:5000/api";

function showBookingsError(message) {
  if (!bookingsAlert) return;
  bookingsAlert.textContent = message;
  bookingsAlert.classList.remove("d-none");
}

function clearBookingsError() {
  if (!bookingsAlert) return;
  bookingsAlert.textContent = "";
  bookingsAlert.classList.add("d-none");
}

async function loadBookings() {
  if (!bookingsContainer || !bookingsLoading || !bookingsAlert) return;

  bookingsLoading.classList.remove("d-none");
  clearBookingsError();
  bookingsContainer.innerHTML = "";

  try {
    
    const bookings = await apiGet("/my-bookings");
    bookingsLoading.classList.add("d-none");

    if (!bookings.length) {
      bookingsContainer.innerHTML =
        '<p class="text-muted">You have no bookings yet.</p>';
      return;
    }

    const list = document.createElement("div");
    list.className = "list-group";

    bookings.forEach((b) => {
      const item = document.createElement("div");
      item.className =
        "list-group-item d-flex justify-content-between align-items-center";

      item.innerHTML = `
        <div>
          <h6 class="mb-1">${b.title}</h6>
          <small class="text-muted">
            ${b.date} • ${b.time} • ${b.city} – ${b.location}
          </small>
        </div>
        <button
          type="button"
          class="btn btn-outline-danger btn-sm ms-3 cancel-booking-btn"
          data-booking-id="${b.id}">
          Cancel
        </button>
      `;

      list.appendChild(item);
    });

    bookingsContainer.appendChild(list);
  } catch (err) {
    bookingsLoading.classList.add("d-none");
    showBookingsError(err.message || "Failed to load bookings.");
  }
}


if (bookingsContainer) {
  bookingsContainer.addEventListener("click", async (e) => {
    const btn = e.target.closest(".cancel-booking-btn");
    if (!btn) return;

    const bookingId = btn.getAttribute("data-booking-id");
    if (!bookingId) return;

    const confirmed = window.confirm(
      "Are you sure you want to cancel this booking?"
    );
    if (!confirmed) return;

    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Cancelling…";

    clearBookingsError();

    try {
      
      const res = await fetch(`${BACKEND_BASE}/bookings/${bookingId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not cancel booking.");
      }

      
      await loadBookings();
    } catch (err) {
      btn.disabled = false;
      btn.textContent = originalText;
      showBookingsError(err.message || "Could not cancel booking.");
    }
  });
}

document.addEventListener("DOMContentLoaded", loadBookings);
