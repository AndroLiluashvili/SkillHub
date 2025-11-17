// frontend/js/create-event.js

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("create-event-form");
    const errBox = document.getElementById("event-create-alert");
    const successBox = document.getElementById("event-create-success");
  
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
  
      errBox.classList.add("d-none");
      successBox.classList.add("d-none");
  
      const title = document.getElementById("ev-title").value.trim();
      const description = document.getElementById("ev-description").value.trim();
      const date = document.getElementById("ev-date").value;
      const time = document.getElementById("ev-time").value;
      const city = document.getElementById("ev-city").value.trim();
      const location = document.getElementById("ev-location").value.trim();
      const capacity = document.getElementById("ev-capacity").value;
      const price = document.getElementById("ev-price").value;
  
      try {
        const res = await apiPost("/events", {
          title,
          description,
          date,
          time,
          city,
          location,
          capacity,
          price,
        });
  
        successBox.textContent = "Event created successfully.";
        successBox.classList.remove("d-none");
  
        // optional: redirect straight to event page
        // window.location.href = `event.html?id=${res.id}`;
  
        // or clear form for another entry
        form.reset();
      } catch (err) {
        errBox.textContent = err.message || "Failed to create event.";
        errBox.classList.remove("d-none");
  
        if (err.message.includes("Not logged in")) {
          errBox.innerHTML = `You must be logged in to create an event. <a href="login.html">Login here</a>.`;
        }
      }
    });
  });
  