const fallbackCities = [
  "Amsterdam",
  "Batumi",
  "Berlin",
  "London",
  "New York",
  "Riga",
  "San Francisco",
  "Tallinn",
  "Tbilisi",
  "Vienna",
  "Vilnius",
];

let supportedCities = [...fallbackCities, "Online"];

function showCreateMessage(box, message, isHTML = false) {
  if (!box) return;
  if (isHTML) {
    box.innerHTML = message;
  } else {
    box.textContent = message;
  }
  box.classList.remove("d-none");
  box.focus();
}

function clearCreateMessages() {
  document.getElementById("event-create-alert")?.classList.add("d-none");
  document.getElementById("event-create-success")?.classList.add("d-none");
}

async function loadCityOptions() {
  const select = document.getElementById("ev-city");
  const cityList = document.getElementById("supported-city-list");
  if (!select) return;

  try {
    const cities = await apiGet("/cities");
    supportedCities = [...cities, "Online"];
  } catch (err) {
    console.warn("Could not load city options:", err);
  }

  select.innerHTML = '<option value="">Choose a supported city</option>';

  supportedCities.forEach((city) => {
    const option = document.createElement("option");
    option.value = city;
    option.textContent = city;
    select.appendChild(option);
  });

  if (cityList) {
    cityList.innerHTML = "";
    supportedCities.forEach((city) => {
      const item = document.createElement("span");
      item.textContent = city;
      cityList.appendChild(item);
    });
  }
}

function setMinimumEventDate() {
  const dateInput = document.getElementById("ev-date");
  if (!dateInput) return;

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  dateInput.min = `${yyyy}-${mm}-${dd}`;
}

function validateEventForm(values) {
  if (!values.title || !values.date || !values.time || !values.city || !values.location) {
    return "Please complete the title, date, time, city and location fields.";
  }

  if (!supportedCities.includes(values.city)) {
    return "Please choose one of the supported cities or Online.";
  }

  if (Number(values.capacity) < 1 || !Number.isInteger(Number(values.capacity))) {
    return "Capacity must be a whole number of at least 1.";
  }

  if (Number(values.price) < 0 || Number.isNaN(Number(values.price))) {
    return "Price must be 0 or a positive number.";
  }

  return "";
}

function updateLocationHelp() {
  const citySelect = document.getElementById("ev-city");
  const locationInput = document.getElementById("ev-location");
  const weatherNote = document.getElementById("city-weather-note");
  if (!citySelect || !locationInput || !weatherNote) return;

  if (citySelect.value === "Online") {
    locationInput.placeholder = "Example: Zoom, Microsoft Teams or Google Meet";
    weatherNote.textContent = "Online sessions do not show weather, so learners see the meeting platform instead.";
    weatherNote.classList.add("is-online");
    return;
  }

  locationInput.placeholder = "Example: Main auditorium, Room 2A or campus hall";

  if (citySelect.value) {
    weatherNote.textContent = `Weather for ${citySelect.value} will appear on the event detail page.`;
  } else {
    weatherNote.textContent = "Select a city and SkillHub will show live weather on the event detail page.";
  }
  weatherNote.classList.remove("is-online");
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("create-event-form");
  const errBox = document.getElementById("event-create-alert");
  const successBox = document.getElementById("event-create-success");
  const submitBtn = document.getElementById("create-event-submit");
  const citySelect = document.getElementById("ev-city");

  loadCityOptions();
  setMinimumEventDate();
  updateLocationHelp();

  citySelect?.addEventListener("change", updateLocationHelp);

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearCreateMessages();

    const values = {
      title: document.getElementById("ev-title").value.trim(),
      description: document.getElementById("ev-description").value.trim(),
      date: document.getElementById("ev-date").value,
      time: document.getElementById("ev-time").value,
      city: document.getElementById("ev-city").value.trim(),
      location: document.getElementById("ev-location").value.trim(),
      capacity: document.getElementById("ev-capacity").value,
      price: document.getElementById("ev-price").value,
    };

    const validationError = validateEventForm(values);
    if (validationError) {
      showCreateMessage(errBox, validationError);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Creating event...";

    try {
      const res = await apiPost("/events", values);
      showCreateMessage(
        successBox,
        `Event created successfully. <a href="event.html?id=${encodeURIComponent(res.id)}">View the event</a>.`,
        true
      );
      form.reset();
      setMinimumEventDate();
      updateLocationHelp();
    } catch (err) {
      if ((err.message || "").includes("Not logged in")) {
        showCreateMessage(
          errBox,
          'You need to <a href="login.html">login</a> before creating an event.',
          true
        );
      } else {
        showCreateMessage(errBox, err.message || "Failed to create event.");
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Create event";
    }
  });
});
