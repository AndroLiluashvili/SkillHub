// frontend/js/event-detail.js

function getEventIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    return id ? parseInt(id, 10) : null;
  }
  
  async function loadEvent() {
    const eventId = getEventIdFromUrl();
    const loading = document.getElementById("event-loading");
    const errorBox = document.getElementById("event-error");
    const content = document.getElementById("event-content");
  
    if (!eventId) {
      loading.classList.add("d-none");
      errorBox.textContent = "No event ID provided in URL.";
      errorBox.classList.remove("d-none");
      return;
    }
  
    try {
      const event = await apiGet(`/events/${eventId}`);
  
      loading.classList.add("d-none");
      errorBox.classList.add("d-none");
      content.classList.remove("d-none");
  
      // Fill content
      document.getElementById("event-title").textContent = event.title;
      document.getElementById("event-meta").textContent =
        `${event.date} • ${event.time}`;
      document.getElementById("event-location").innerHTML =
        `<strong>Location:</strong> ${event.city} – ${event.location}`;
      document.getElementById("event-description").textContent = event.description;
      document.getElementById("event-price").textContent = `€${event.price}`;
      document.getElementById("event-seats").textContent = event.seats_left;
  
      document.title = `SkillHub – ${event.title}`;

      const weatherBox = document.getElementById("event-weather");
      if (event.weather && event.weather.temperature != null) {
        const t = event.weather.temperature;
        const w = event.weather.windspeed;
        const code = event.weather.weathercode;
      
        weatherBox.textContent =
          `Current weather in ${event.city}: ${t}°C, wind ${w} km/h (code ${code}).`;
      } else {
        weatherBox.textContent = "";
      }

      const bookBtn = document.getElementById("book-button");
      const msgBox = document.getElementById("book-message");
  
      bookBtn.addEventListener("click", async () => {
        msgBox.classList.add("d-none");
        msgBox.classList.remove("alert-success", "alert-danger", "alert-warning");
  
        try {
          const res = await apiPost(`/events/${eventId}/book`);
          msgBox.textContent = res.message || "Booking successful.";
          msgBox.classList.add("alert", "alert-success");
          msgBox.classList.remove("d-none");
  
          // refresh seats left
          const updated = await apiGet(`/events/${eventId}`);
          document.getElementById("event-seats").textContent = updated.seats_left;
        } catch (err) {
          const message = err.message || "Booking failed.";
          msgBox.textContent = message;
          msgBox.classList.add("alert");
  
          if (message.includes("Not logged in")) {
            msgBox.classList.add("alert-warning");
            msgBox.innerHTML = `You must be logged in to book. <a href="login.html">Login here</a>.`;
          } else {
            msgBox.classList.add("alert-danger");
          }
  
          msgBox.classList.remove("d-none");
        }
      });
    } catch (err) {
      loading.classList.add("d-none");
      errorBox.textContent = err.message || "Failed to load event.";
      errorBox.classList.remove("d-none");
    }
  }
  
  document.addEventListener("DOMContentLoaded", loadEvent);
  