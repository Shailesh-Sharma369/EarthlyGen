// Local Storage Address Manager
let addresses = JSON.parse(localStorage.getItem("my_addresses") || "[]");

// Map variables for real-time address geocoding
let addressMap = null;
let addressMarker = null;
let addressGeocoder = null;

function saveAddresses() {
  localStorage.setItem("my_addresses", JSON.stringify(addresses));
}

function renderAddresses() {
  const tbody = document.getElementById("addressesBody");
  const search = document
    .getElementById("addressSearch")
    .value.toLowerCase()
    .trim();

  tbody.innerHTML = "";

  const filtered = addresses.filter((a) =>
    [
      a.name,
      a.street,
      a.city,
      a.state,
      a.zip,
      a.country,
      a.phone || "",
      a.type,
    ].some((v) => v.toLowerCase().includes(search)),
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:40px;color:#888;">
            ${search ? "No matching addresses found..." : "No addresses yet. Add your first one!"}
        </td></tr>`;
    return;
  }

  filtered.forEach((addr) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td>${addr.id}</td>
            <td>${addr.name}</td>
            <td>${addr.street}</td>
            <td>${addr.city}</td>
            <td>${addr.state}</td>
            <td>${addr.zip}</td>
            <td>${addr.country}</td>
            <td>${addr.phone || "—"}</td>
            <td><span class="type-badge">${addr.type}</span></td>
            <td>
                <button class="btn edit-btn" onclick="editAddress(${addr.id})">Edit</button>
                <button class="btn delete-btn" onclick="deleteAddress(${addr.id})">Delete</button>
            </td>
        `;

    // Add click to preview on map
    tr.style.cursor = "pointer";
    tr.addEventListener("click", () => {
      console.log("🖱️ ADDRESS ROW CLICKED:", addr);
      console.log(
        "🔍 Checking if showAddressPreview exists:",
        typeof window.showAddressPreview,
      );

      if (window.showAddressPreview) {
        console.log("✅ Calling showAddressPreview...");
        window.showAddressPreview({
          fullName: addr.name,
          street: addr.street,
          city: addr.city,
          state: addr.state,
          zip: addr.zip,
          country: addr.country,
          phone: addr.phone || "",
          type: addr.type,
        });
      } else {
        console.error("❌ window.showAddressPreview is NOT defined!");
        console.log(
          "Available window functions:",
          Object.keys(window).filter(
            (k) =>
              k.includes("show") ||
              k.includes("address") ||
              k.includes("Address"),
          ),
        );
      }
    });

    tbody.appendChild(tr);
  });
}

function openModal(isEdit = false) {
  document.getElementById("addressModal").classList.add("active");

  // Initialize map when modal opens
  setTimeout(() => {
    initializeAddressMap();
  }, 100);

  if (!isEdit) {
    document.getElementById("modalTitle").textContent = "Add New Address";
    document.getElementById("addressForm").reset();
    document.getElementById("editId").value = "";
  }
}

function closeModal() {
  document.getElementById("addressModal").classList.remove("active");
  // Cleanup map resources
  if (addressMap) {
    addressMap = null;
  }
}

// ==========================================
// REAL-TIME ADDRESS GEOCODING (NEW!)
// ==========================================

function initializeAddressMap() {
  if (addressMap) return; // Already initialized

  const mapContainer = document.getElementById("addressMap");
  if (!mapContainer) {
    console.error("❌ Map container not found!");
    return;
  }

  // Check if Google Maps API is loaded
  if (!window.google || !window.google.maps) {
    console.error("❌ Google Maps API not loaded!");
    showAddressBadge(
      "❌ Google Maps API not loaded<br/>Check your internet connection",
      "error",
    );
    return;
  }

  const defaultLocation = { lat: 28.6139, lng: 77.209 }; // India center

  try {
    addressMap = new google.maps.Map(mapContainer, {
      zoom: 15,
      center: defaultLocation,
      styles: [
        {
          featureType: "all",
          elementType: "labels.text.fill",
          stylers: [{ color: "#616161" }],
        },
      ],
    });

    // Create marker
    addressMarker = new google.maps.Marker({
      map: addressMap,
      position: defaultLocation,
      animation: google.maps.Animation.DROP,
      title: "Your Address",
      icon: "https://maps.google.com/mapfiles/ms/micons/blue-dot.png",
    });

    // Initialize geocoder
    if (!addressGeocoder) {
      addressGeocoder = new google.maps.Geocoder();
      console.log("✅ Geocoder initialized");
    }

    // Setup real-time address input listener
    const streetInput = document.getElementById("street");
    if (streetInput) {
      let debounceTimeout;
      streetInput.addEventListener("input", (e) => {
        clearTimeout(debounceTimeout);

        if (e.target.value.length > 2) {
          showAddressBadge("🔍 Searching address...", "loading");

          debounceTimeout = setTimeout(() => {
            geocodeAddressInput(e.target.value);
          }, 500);
        } else {
          showAddressBadge("📍 Type address to see on map", "info");
          // Reset to default
          addressMarker.setPosition(defaultLocation);
          addressMap.setCenter(defaultLocation);
          addressMap.setZoom(15);
        }
      });

      // Allow Enter key to confirm
      streetInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          clearTimeout(debounceTimeout);
          if (streetInput.value.length > 2) {
            geocodeAddressInput(streetInput.value);
          }
        }
      });

      console.log("✅ Street input listeners attached");
    }

    console.log("✅ Address map initialized with real-time geocoding");
  } catch (error) {
    console.error("❌ Error initializing map:", error);
    showAddressBadge("❌ Map initialization failed: " + error.message, "error");
  }
}

function geocodeAddressInput(addressText) {
  if (!addressGeocoder || !addressMap) {
    console.error("❌ Geocoder or Map not initialized!");
    showAddressBadge("❌ Map not ready - try again", "error");
    return;
  }

  console.log("🔍 Starting geocoding for:", addressText);
  showAddressBadge("🔍 Searching for: " + addressText, "loading");

  addressGeocoder.geocode(
    { address: addressText, componentRestrictions: { country: "IN" } },
    (results, status) => {
      console.log("📍 Geocoding Response - Status:", status);
      console.log("📍 Results:", results);

      if (status === "OK" && results.length > 0) {
        const place = results[0];
        console.log("✅ Address found successfully!");
        showAddressBadge("✅ Address found!", "success");

        // Extract address components
        let street = "";
        let city = "";
        let state = "";
        let zip = "";

        place.address_components.forEach((component) => {
          if (component.types.includes("street_number")) {
            street += component.long_name;
          }
          if (component.types.includes("route")) {
            street += " " + component.long_name;
          }
          if (component.types.includes("locality")) {
            city = component.long_name;
          }
          if (component.types.includes("administrative_area_level_1")) {
            state = component.short_name;
          }
          if (component.types.includes("postal_code")) {
            zip = component.long_name;
          }
        });

        // Auto-populate form fields
        if (street) document.getElementById("street").value = street;
        if (city) document.getElementById("city").value = city;
        if (state) document.getElementById("state").value = state;
        if (zip) document.getElementById("zip").value = zip;

        // Update map marker
        const location = place.geometry.location;
        addressMarker.setPosition(location);
        addressMap.setCenter(location);
        addressMap.setZoom(16);

        // Show coordinates badge
        const coords = `${location.lat().toFixed(4)}, ${location.lng().toFixed(4)}`;
        showAddressBadge(
          `✅ ${place.formatted_address}<br/>🧭 ${coords}`,
          "confirmed",
        );

        console.log("🗺️ Address geocoded:", {
          address: place.formatted_address,
          lat: location.lat(),
          lng: location.lng(),
          city,
          state,
          zip,
        });
      } else if (status === "REQUEST_DENIED") {
        console.error(
          "❌ REQUEST_DENIED - Geocoding API not enabled or invalid API key",
        );
        showAddressBadge(
          "⚠️ Maps Not Available<br/>📝 You can still save the address manually!<br/>Enable Geocoding API in Google Cloud for map preview",
          "error",
        );
      } else if (status === "ZERO_RESULTS") {
        console.warn("❌ Address not found in India:", addressText);
        showAddressBadge("❌ Address not found in India", "error");
      } else {
        console.error("❌ Geocoding error - Status:", status);
        showAddressBadge(`❌ Error: ${status}`, "error");
      }
    },
  );
}

function showAddressBadge(message, type = "info") {
  const badge = document.getElementById("mapAddressBadge");
  if (!badge) {
    console.warn("⚠️ mapAddressBadge element not found!");
    return;
  }

  let bgStyle = "background: #f0f9ff; color: #0c63e4;";
  if (type === "success") {
    bgStyle = "background: #d4edda; color: #155724;";
  } else if (type === "confirmed") {
    bgStyle =
      "background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;";
  } else if (type === "loading") {
    bgStyle = "background: #fff3cd; color: #856404;";
  } else if (type === "error") {
    bgStyle = "background: #f8d7da; color: #721c24;";
  }

  badge.innerHTML = `<div style="${bgStyle} padding: 12px; border-radius: 8px; font-size: 13px; margin-top: 8px; border-left: 4px solid currentColor; line-height: 1.5;">${message}</div>`;

  console.log(`📍 Badge updated [${type}]:`, message);
}

// ==========================================
// END REAL-TIME GEOCODING
// ==========================================

function editAddress(id) {
  const addr = addresses.find((a) => a.id === id);
  if (!addr) return;

  document.getElementById("editId").value = addr.id;
  document.getElementById("fullName").value = addr.name;
  document.getElementById("street").value = addr.street;
  document.getElementById("city").value = addr.city;
  document.getElementById("state").value = addr.state;
  document.getElementById("zip").value = addr.zip;
  document.getElementById("country").value = addr.country;
  document.getElementById("addressPhone").value = addr.phone || "";
  document.getElementById("addressType").value = addr.type;

  document.getElementById("modalTitle").textContent = "Edit Address";
  openModal(true);
}

function deleteAddress(id) {
  if (!confirm("Are you sure you want to delete this address?")) return;

  addresses = addresses.filter((a) => a.id !== id);
  saveAddresses();
  renderAddresses();
}

// Events
document
  .getElementById("btnAddNew")
  .addEventListener("click", () => openModal(false));

document.getElementById("addressForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const data = {
    id: parseInt(document.getElementById("editId").value) || null,
    name: document.getElementById("fullName").value.trim(),
    street: document.getElementById("street").value.trim(),
    city: document.getElementById("city").value.trim(),
    state: document.getElementById("state").value.trim(),
    zip: document.getElementById("zip").value.trim(),
    country: document.getElementById("country").value,
    phone: document.getElementById("addressPhone").value.trim() || null,
    type: document.getElementById("addressType").value,
  };

  if (!data.id || isNaN(data.id)) {
    // New address
    const maxId = addresses.length
      ? Math.max(...addresses.map((a) => a.id))
      : 0;
    data.id = maxId + 1;
    addresses.push(data);
  } else {
    // Update
    const index = addresses.findIndex((a) => a.id === data.id);
    if (index !== -1) addresses[index] = data;
  }

  saveAddresses();
  renderAddresses();
  closeModal();
});

// Search live filter
document
  .getElementById("addressSearch")
  .addEventListener("input", renderAddresses);

// Close modal handlers
document.querySelectorAll(".close-modal").forEach((el) => {
  el.addEventListener("click", closeModal);
});

document.getElementById("addressModal").addEventListener("click", (e) => {
  if (e.target.classList.contains("modal")) closeModal();
});

// Initial load
renderAddresses();
