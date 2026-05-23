let allEvents = [];

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

function getSeatLabel(event) {
  const seatsLeft = Number(event.seats_left ?? event.capacity ?? 0);
  const capacity = Number(event.capacity || 0);

  if (seatsLeft <= 0) return { text: "Full", className: "badge-danger" };
  if (seatsLeft <= 5 || (capacity > 0 && seatsLeft / capacity <= 0.2)) {
    return { text: "Limited seats", className: "badge-warning" };
  }
  if (Number(event.booked_count || 0) >= 10) {
    return { text: "Popular", className: "badge-success" };
  }

  return null;
}

function getFilterValues() {
  return {
    search: document.getElementById("event-search")?.value.trim().toLowerCase() || "",
    city: document.getElementById("city-filter")?.value || "",
    type: document.getElementById("type-filter")?.value || "",
    price: document.getElementById("price-filter")?.value || "",
  };
}

function eventMatchesFilters(event, filters) {
  const city = normaliseText(event.city);
  const format = getEventFormat(event).toLowerCase();
  const price = Number(event.price || 0);
  const searchableText = [
    event.title,
    event.description,
    event.city,
    event.location,
    getEventCategory(event),
  ].map(normaliseText).join(" ").toLowerCase();

  if (filters.search && !searchableText.includes(filters.search)) return false;
  if (filters.city && city !== filters.city) return false;
  if (filters.type && format !== filters.type) return false;

  if (filters.price === "free" && price !== 0) return false;
  if (filters.price === "under-50" && !(price > 0 && price < 50)) return false;
  if (filters.price === "50-150" && !(price >= 50 && price <= 150)) return false;
  if (filters.price === "over-150" && !(price > 150)) return false;

  return true;
}

function renderEventCard(event) {
  const title = normaliseText(event.title);
  const description = normaliseText(event.description);
  const city = normaliseText(event.city);
  const location = normaliseText(event.location);
  const format = getEventFormat(event);
  const category = getEventCategory(event);
  const seatBadge = getSeatLabel(event);
  const seatsLeft = Number(event.seats_left ?? event.capacity ?? 0);
  const detailUrl = `event.html?id=${encodeURIComponent(event.id)}`;

  const badges = [
    `<span class="badge-soft">${escapeHTML(format)}</span>`,
    `<span class="badge-soft badge-neutral">${escapeHTML(category)}</span>`,
  ];

  if (seatBadge) {
    badges.push(`<span class="badge-soft ${seatBadge.className}">${escapeHTML(seatBadge.text)}</span>`);
  }

  return `
    <div class="col-12 col-md-6 col-xl-4">
      <article class="card event-card h-100">
        <div class="card-body d-flex flex-column">
          <div class="badge-row">${badges.join("")}</div>
          <h3 class="card-title h5">${escapeHTML(title)}</h3>
          <p class="card-text text-muted event-card-description">
            ${escapeHTML(description)}
          </p>
          <dl class="event-card-meta">
            <div>
              <dt>Date</dt>
              <dd>${escapeHTML(formatDate(event.date))}</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>${escapeHTML(event.time || "TBC")}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>${escapeHTML(city)} - ${escapeHTML(location)}</dd>
            </div>
            <div>
              <dt>Seats</dt>
              <dd>${escapeHTML(seatsLeft)} available</dd>
            </div>
          </dl>
          <div class="event-card-footer mt-auto">
            <span class="event-price">${escapeHTML(formatPrice(event.price))}</span>
            <a href="${detailUrl}" class="btn btn-outline-primary"
               aria-label="View details for ${escapeHTML(title)}">
              View details
            </a>
          </div>
        </div>
      </article>
    </div>
  `;
}

function renderEvents() {
  const container = document.getElementById("events-container");
  const summary = document.getElementById("results-summary");
  if (!container) return;

  const filters = getFilterValues();
  const filteredEvents = allEvents.filter((event) => eventMatchesFilters(event, filters));

  if (summary) {
    const total = allEvents.length;
    const shown = filteredEvents.length;
    summary.textContent = total
      ? `${shown} of ${total} events shown`
      : "";
  }

  if (!filteredEvents.length) {
    container.innerHTML = `
      <div class="col-12">
        <div class="empty-state">
          <h3>No matching events</h3>
          <p>Try changing the search term, city, format or price filter.</p>
          <button type="button" class="btn btn-outline-primary" id="clear-empty-filters">
            Clear filters
          </button>
        </div>
      </div>
    `;

    document.getElementById("clear-empty-filters")?.addEventListener("click", clearFilters);
    return;
  }

  container.innerHTML = filteredEvents.map(renderEventCard).join("");
}

function populateCityFilter(events) {
  const cityFilter = document.getElementById("city-filter");
  if (!cityFilter) return;

  const cities = [...new Set(events.map((event) => normaliseText(event.city)).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));

  cityFilter.innerHTML = '<option value="">All cities</option>';
  cities.forEach((city) => {
    const option = document.createElement("option");
    option.value = city;
    option.textContent = city;
    cityFilter.appendChild(option);
  });
}

function updateHeroStats(events) {
  const eventCount = document.getElementById("hero-event-count");
  const cityCount = document.getElementById("hero-city-count");
  const cities = new Set(events.map((event) => normaliseText(event.city)).filter(Boolean));

  if (eventCount) eventCount.textContent = events.length;
  if (cityCount) cityCount.textContent = cities.size;
}

function clearFilters() {
  const filtersForm = document.getElementById("event-filters");
  filtersForm?.reset();
  renderEvents();
}

function bindFilters() {
  ["event-search", "city-filter", "type-filter", "price-filter"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", renderEvents);
    document.getElementById(id)?.addEventListener("change", renderEvents);
  });

  document.getElementById("clear-filters")?.addEventListener("click", clearFilters);
}

async function loadEvents() {
  const container = document.getElementById("events-container");
  const loading = document.getElementById("loading");

  try {
    allEvents = await apiGet("/events");
    if (loading) loading.classList.add("d-none");

    populateCityFilter(allEvents);
    updateHeroStats(allEvents);
    renderEvents();
  } catch (err) {
    if (loading) loading.classList.add("d-none");
    if (container) {
      container.innerHTML = `
        <div class="col-12">
          <div class="alert alert-danger" role="alert">
            Failed to load events. ${escapeHTML(err.message || "")}
          </div>
        </div>
      `;
    }
    console.error(err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  bindFilters();
  loadEvents();
});
