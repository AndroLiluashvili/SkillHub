// frontend/js/bookings.js

async function loadBookings() {
    const container = document.getElementById("bookings-container");
    const loading = document.getElementById("bookings-loading");
    const alertBox = document.getElementById("bookings-alert");
  
    loading.classList.remove("d-none");
    alertBox.classList.add("d-none");
    container.innerHTML = "";
  
    try {
      const bookings = await apiGet("/my-bookings");
      loading.classList.add("d-none");
  
      if (!bookings.length) {
        container.innerHTML = "<p>You have no bookings yet.</p>";
        return;
      }
  
      const list = document.createElement("div");
      list.className = "list-group";
  
      bookings.forEach((b) => {
        const item = document.createElement("div");
        item.className = "list-group-item d-flex justify-content-between align-items-center";
  
        item.innerHTML = `
          <div>
            <h6 class="mb-1">${b.title}</h6>
            <small class="text-muted">${b.date} • ${b.time} • ${b.city} – ${b.location}</small>
          </div>
        `;
  
        list.appendChild(item);
      });
  
      container.appendChild(list);
    } catch (err) {
      loading.classList.add("d-none");
      alertBox.textContent = err.message || "Failed to load bookings.";
      alertBox.classList.remove("d-none");
    }
  }
  
  document.addEventListener("DOMContentLoaded", loadBookings);
  