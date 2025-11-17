// frontend/js/events.js

async function loadEvents() {
    const container = document.getElementById("events-container");
    const loading = document.getElementById("loading");
  
    try {
      const events = await apiGet("/events");
      loading.style.display = "none";
  
      if (!events.length) {
        container.innerHTML = "<p>No events found.</p>";
        return;
      }
  
      container.innerHTML = "";
  
      events.forEach((e) => {
        // Bootstrap column
        const col = document.createElement("div");
        col.className = "col-12 col-md-6 col-lg-4";
  
        // Bootstrap card
        col.innerHTML = `
          <div class="card h-100 shadow-sm">
            <div class="card-body d-flex flex-column">
              <h5 class="card-title">${e.title}</h5>
              <h6 class="card-subtitle mb-2 text-muted">
                ${e.date} &nbsp;•&nbsp; ${e.time}
              </h6>
              <p class="card-text mb-1">
                <strong>Location:</strong> ${e.city} – ${e.location}
              </p>
              <p class="card-text small text-muted mb-2">
                ${e.description}
              </p>
              <p class="card-text fw-semibold mb-3">
                Price: €${e.price}
              </p>
              <a href="#" class="btn btn-primary mt-auto disabled">
                View details (coming soon)
              </a>
            </div>
          </div>
        `;
  
        container.appendChild(col);
      });
    } catch (err) {
      loading.style.display = "none";
      container.innerHTML = `<p class="text-danger">Failed to load events: ${err.message}</p>`;
      console.error(err);
    }
  }
  
  document.addEventListener("DOMContentLoaded", loadEvents);
  