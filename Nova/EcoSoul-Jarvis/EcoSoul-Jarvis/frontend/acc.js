const API_URL = window.API_CONFIG?.API_URL || "/api";
const authToken = localStorage.getItem("token");

// Initialize Dashboard
document.addEventListener("DOMContentLoaded", initDashboard);

// Listen for profile photo updates from social.html
window.addEventListener("profilePhotoUpdated", (e) => {
  const profileImg = document.getElementById("profile-summary-img");
  if (profileImg && e.detail.photoUrl) {
    profileImg.src = e.detail.photoUrl;
    console.log("✅ Profile photo synced from social.html");
  }
});

// Listen for localStorage changes (cross-tab sync)
window.addEventListener("storage", (e) => {
  if (e.key && e.key.startsWith("profilePic_")) {
    const userId = localStorage.getItem("userId");
    if (e.key === `profilePic_${userId}` && e.newValue) {
      const profileImg = document.getElementById("profile-summary-img");
      if (profileImg) {
        profileImg.src = e.newValue;
        console.log("✅ Profile photo synced from other tab");
      }
    }
  }

  // Listen for credit updates from payment.html
  if (e.key === "updateAccCredits" && e.newValue === "true") {
    console.log("🌱 Credit update signal received from payment");
    loadEcoCredits();
    localStorage.removeItem("updateAccCredits");
  }
});

async function initDashboard() {
  // Check authentication first
  if (!authToken || localStorage.getItem("isLoggedIn") !== "true") {
    alert("Please login to access dashboard");
    window.location.href = "homepage.html";
    return;
  }

  // Load user info in sidebar
  const userName = localStorage.getItem("userName") || "User";
  const userEmail = localStorage.getItem("userEmail") || "";

  const summaryName = document.getElementById("profile-summary-name");
  const summaryEmail = document.getElementById("profile-summary-email");

  if (summaryName) summaryName.textContent = `Hello, ${userName.split(" ")[0]}`;
  if (summaryEmail) summaryEmail.textContent = userEmail;

  // Load all data
  await Promise.all([
    loadProfile(),
    loadCart(),
    loadOrders(),
    loadDashboardStats(),
  ]);

  // Setup navigation
  setupNavigation();
  setupLogout();

  // 🔔 Check for stored notifications (from payment.html)
  const storedNotification = localStorage.getItem("orderNotification");
  if (storedNotification) {
    try {
      const notif = JSON.parse(storedNotification);
      setTimeout(() => {
        addNotification(notif.title, notif.message, notif.type);
      }, 500);
      localStorage.removeItem("orderNotification");
    } catch (err) {
      console.error("Failed to parse stored notification");
    }
  }

  // Real-time eco-credits update every 5 seconds
  setInterval(async () => {
    await loadEcoCredits();
  }, 5000);

  // Listen for storage changes (cross-tab and same-tab signals)
  window.addEventListener("storage", async (e) => {
    if (e.key === "lastEcoCredits") {
      console.log("🔔 Credits updated from storage:", e.newValue);
      const ecoCreditsDisplay = document.getElementById("eco-credits-display");
      if (ecoCreditsDisplay) {
        ecoCreditsDisplay.textContent = e.newValue || 100;
      }
    }
  });

  // Listen for local credit updates (immediate)
  window.addEventListener("updateCreditsNow", async () => {
    console.log("⚡ Immediate credit update triggered");
    await loadEcoCredits();
  });
}

// Load Dashboard Stats
async function loadDashboardStats() {
  try {
    // Try to fetch stats from dashboard endpoint
    try {
      const response = await fetch(`${API_URL}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      // Check if response is JSON (not HTML error)
      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        console.warn(
          "⚠️ Stats endpoint returned non-JSON, calculating from available data...",
        );
        throw new Error("Endpoint not available");
      }

      const data = await response.json();

      if (data.success) {
        const totalOrders = document.getElementById("total-orders");
        const cartItems = document.getElementById("cart-items");
        const totalSpent = document.getElementById("total-spent");

        if (totalOrders) totalOrders.textContent = data.stats.totalOrders || 0;
        if (cartItems) cartItems.textContent = data.stats.cartItems || 0;
        if (totalSpent)
          totalSpent.textContent = `₹${data.stats.totalSpent || 0}`;
      }
    } catch (err) {
      console.warn("Stats endpoint failed, calculating manually...");
      // Fallback: Calculate from orders and cart
      await calculateStatsFallback();
    }

    // Load eco-credits
    await loadEcoCredits();
  } catch (err) {
    console.error("Stats load error:", err);
  }
}

// Fallback: Calculate stats from available endpoints
async function calculateStatsFallback() {
  try {
    // Get orders
    const ordersRes = await fetch(`${API_URL}/orders`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const ordersData = await ordersRes.json();
    const orders = ordersData.orders || [];

    // Get cart items
    const cartRes = await fetch(`${API_URL}/cart`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const cartData = await cartRes.json();
    const cartItems = cartData.items || [];

    // Calculate totals
    const totalOrders = orders.length;
    const totalCartItems = cartItems.length;
    const totalSpent = orders.reduce((sum, order) => {
      return sum + (parseFloat(order.amount) || 0);
    }, 0);

    // Update UI
    const totalOrdersEl = document.getElementById("total-orders");
    const cartItemsEl = document.getElementById("cart-items");
    const totalSpentEl = document.getElementById("total-spent");

    if (totalOrdersEl) totalOrdersEl.textContent = totalOrders;
    if (cartItemsEl) cartItemsEl.textContent = totalCartItems;
    if (totalSpentEl) totalSpentEl.textContent = `₹${totalSpent.toFixed(2)}`;

    console.log("✅ Stats calculated:", {
      totalOrders,
      totalCartItems,
      totalSpent,
    });
  } catch (err) {
    console.error("Fallback stats error:", err);
    // If all fails, just leave defaults (0)
  }
}

// Load Eco-Credits
async function loadEcoCredits() {
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await response.json();

    if (data.success && data.user) {
      const ecoCreditsDisplay = document.getElementById("eco-credits-display");
      if (ecoCreditsDisplay) {
        ecoCreditsDisplay.textContent = data.user.ecoCredits || 100;
        console.log("✅ Eco-credits loaded:", data.user.ecoCredits);
      }
    }
  } catch (err) {
    console.error("Eco-credits load error:", err);
  }
}

// Update Credits Display (Real-time)
window.updateEcoCreditsDisplay = async function () {
  console.log("🌱 Updating eco-credits display...");
  await loadEcoCredits();
};

// Load Profile

// acc.js mein loadProfile function ko isse replace karein
async function loadProfile() {
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    if (!data.success) throw new Error();

    const user = data.user;
    const [firstName, ...rest] = user.fullName.split(" ");

    // Inputs fill karo
    document.getElementById("first-name").value = firstName || "";
    document.getElementById("last-name").value = rest.join(" ") || "";
    document.getElementById("email").value = user.email || "";
    document.getElementById("phone").value = user.phone || "";

    // Sidebar Info Update
    document.getElementById("profile-summary-name").textContent =
      `Hello, ${firstName}`;
    document.getElementById("profile-summary-email").textContent = user.email;

    // === NEW: PROFILE PIC UPDATE ===
    const profileImg = document.getElementById("profile-summary-img");
    const userId = localStorage.getItem("userId");

    // Check for synced profile pic from social.html
    const syncedProfilePic = localStorage.getItem(`profilePic_${userId}`);

    if (syncedProfilePic) {
      profileImg.src = syncedProfilePic;
    } else if (user.profilePic) {
      profileImg.src = user.profilePic;
      // Sync to localStorage for consistency
      localStorage.setItem(`profilePic_${userId}`, user.profilePic);
    }
    // ===============================
  } catch {
    // Agar fail ho to login par bhej do (optional)
    // window.location.href = "login1.html";
    console.log("User not logged in");
  }
}

// Profile photo upload is disabled in acc.html
// Users must use social.html to change profile photo
function previewImage(event) {
  event.preventDefault();
  alert(
    "⚠️ Profile photo can only be changed from the Social Media page.\n\nPlease go to social.html to update your profile picture.",
  );
  return false;
}

// 2. Updated Save Profile Function
function saveProfile() {
  const firstName = document.getElementById("first-name")?.value || "";
  const lastName = document.getElementById("last-name")?.value || "";
  const email = document.getElementById("email")?.value || "";
  const phone = document.getElementById("phone")?.value || "";

  // Data object taiyar karo (profile pic removed - can only be changed from social.html)
  const payload = {
    fullName: `${firstName} ${lastName}`.trim(),
    email,
    phone,
  };

  fetch(`${API_URL}/user/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(payload), // Send full payload
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        showToast("Profile updated successfully!", "success");
        // Local storage update (optional)
        localStorage.setItem("userName", data.user.fullName);
        // Refresh profile to confirm changes
        loadProfile();
      } else {
        showToast(data.message || "Failed to save profile", "error");
      }
    })
    .catch(() => showToast("Failed to save profile", "error"));
}

// Window object par function expose karein taaki HTML se call ho sake
window.previewImage = previewImage;

// async function loadProfile() {
//   try {
//     const response = await fetch(`${API_URL}/user/profile`, {
//       headers: { Authorization: `Bearer ${authToken}` },
//     });
//     const data = await response.json();

//     if (data.success) {
//       const user = data.user;
//       const nameParts = user.fullName?.split(" ") || ["", ""];

//       const firstName = document.getElementById("first-name");
//       const lastName = document.getElementById("last-name");
//       const email = document.getElementById("email");
//       const phone = document.getElementById("phone");

//       if (firstName) firstName.value = nameParts[0] || "";
//       if (lastName) lastName.value = nameParts.slice(1).join(" ") || "";
//       if (email) email.value = user.email || "";
//       if (phone) phone.value = user.phone || "";
//     }
//   } catch (err) {
//     console.error("Profile error:", err);
//   }
// }

// Load Cart

// async function loadCart() {
//   try {
//     const res = await fetch(`${API_URL}/cart`, {
//       headers: { Authorization: `Bearer ${authToken}` },
//     });
//     const data = await res.json();
//     console.log("CART API RESPONSE:", data.items);

//     if (!data.success) return;

//     const items = data.items.map(i => ({
//       _id: i._id,
//       quantity: i.quantity,
//       name: i.productId.name,
//       price: i.productId.price,
//       image: i.productId.image,
//     }));

//     const total = items.reduce(
//       (sum, i) => sum + i.price * i.quantity,
//       0
//     );

//    renderCart(data.items);
//   } catch (err) {
//     console.error("Cart load error", err);
//   }
// }

async function loadCart() {
  try {
    const res = await fetch(`${API_URL}/cart`, {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    });

    const data = await res.json();
    console.log("CART API RESPONSE:", data.items);

    if (data.success) {
      renderCart(data.items); // ✅ Render in cart section
      renderDashboardCart(data.items); // ✅ NEW: Render in dashboard
    }
  } catch (err) {
    console.error("Cart load error", err);
  }
}

// NEW: Render cart items on dashboard
function renderDashboardCart(items) {
  const dashboardCartContainer = document.getElementById(
    "dashboard-cart-items",
  );

  if (!dashboardCartContainer) return;

  if (!items || items.length === 0) {
    dashboardCartContainer.innerHTML = `
      <div class="dashboard-cart-empty">
        <p>🛒 Your cart is empty</p>
        <p style="font-size: 14px; color: #aaa;">Add products to see them here</p>
        <a href="products.html">Browse Products</a>
      </div>
    `;
    return;
  }

  let cartHTML = "";

  items.forEach((item) => {
    if (!item.productId) return;

    const {
      name,
      price,
      image,
      category,
      eco_impact,
      ["old price"]: oldPrice,
    } = item.productId;
    const qty = item.quantity;
    const itemTotal = price * qty;
    const discount = oldPrice
      ? Math.round(((oldPrice - price) / oldPrice) * 100)
      : 0;

    cartHTML += `
      <div class="dashboard-cart-item">
        <img src="${image}" alt="${name}" class="dashboard-cart-item-image" />
        <div class="dashboard-cart-item-info">
          <h4>${name}</h4>
          <p style="font-size: 11px; color: #999;">Category: ${
            category || "N/A"
          }</p>
          ${eco_impact ? `<p style="font-size: 11px; color: #2e7d32; margin: 4px 0;">♻️ ${eco_impact}</p>` : ""}
          <div class="dashboard-cart-item-price">
            <span style="font-weight: 700; color: #1e7e34;">₹${price}</span>
            ${oldPrice ? `<span style="text-decoration: line-through; color: #999; font-size: 11px; margin: 0 6px;">₹${oldPrice}</span>` : ""}
            ${discount > 0 ? `<span style="background: #fff3cd; color: #856404; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600;">-${discount}%</span>` : ""}
          </div>
          <div class="dashboard-cart-item-quantity">Qty: ${qty} | Total: ₹${itemTotal.toLocaleString("en-IN")}</div>
        </div>
      </div>
    `;
  });

  dashboardCartContainer.innerHTML = cartHTML;
}

function renderCart(items) {
  const cartList = document.getElementById("cart-list");
  const subtotalEl = document.getElementById("subtotal");
  const totalEl = document.getElementById("total");

  if (!cartList) return;

  if (!items || items.length === 0) {
    cartList.innerHTML = "<p>Your cart is empty</p>";
    if (subtotalEl) subtotalEl.textContent = "0";
    if (totalEl) totalEl.textContent = "0";
    return;
  }

  let total = 0;
  cartList.innerHTML = "";

  items.forEach((item) => {
    if (!item.productId) return; // 🔒 SAFETY

    const {
      name,
      price,
      image,
      eco_impact,
      ["old price"]: oldPrice,
    } = item.productId;
    const qty = item.quantity;
    const itemTotal = price * qty;
    total += itemTotal;
    const discount = oldPrice
      ? Math.round(((oldPrice - price) / oldPrice) * 100)
      : 0;

    let priceDisplay = `<strong>₹${price * qty}</strong>`;
    if (oldPrice) {
      const oldItemTotal = oldPrice * qty;
      priceDisplay = `
        <div style="display: flex; flex-direction: column; align-items: flex-start;">
          <strong>₹${price * qty}</strong>
          <span style="text-decoration: line-through; color: #999; font-size: 12px;">₹${oldItemTotal}</span>
          ${discount > 0 ? `<span style="background: #fff3cd; color: #856404; padding: 1px 4px; border-radius: 2px; font-size: 10px; margin-top: 2px;">Save ${discount}%</span>` : ""}
        </div>
      `;
    }

    let ecoDisplay = eco_impact
      ? `<p style="font-size: 11px; color: #2e7d32; margin-top: 4px;">♻️ ${eco_impact}</p>`
      : "";

    cartList.insertAdjacentHTML(
      "beforeend",
      `
  <div class="cart-item">
    <img src="${image}" />

    <div class="cart-info">
      <h4>${name}</h4>
      <p>Eco Friendly Product</p>
      ${ecoDisplay}

      <div class="qty-box">
        <button onclick="updateQuantity('${item._id}', ${qty - 1})">−</button>
        <span>${qty}</span>
        <button onclick="updateQuantity('${item._id}', ${qty + 1})">+</button>
      </div>
    </div>

    <div class="cart-price">
      ${priceDisplay}
      <button class="remove-btn" onclick="removeItem('${item._id}')">
        Remove
      </button>
    </div>
  </div>
`,
    );
  });

  if (subtotalEl) subtotalEl.textContent = total;
  if (totalEl) totalEl.textContent = total;
}

// function renderCart(items) {
//   console.log("RENDER CART ITEMS:", items); // 🔥 debug

//   const cartList = document.getElementById("cart-list");
//   const subtotalEl = document.getElementById("subtotal");
//   const totalEl = document.getElementById("total");

//   if (!cartList) return;

//   if (!items || items.length === 0) {
//     cartList.innerHTML = `<p>Your cart is empty</p>`;
//     subtotalEl.textContent = "0";
//     totalEl.textContent = "0";
//     return;
//   }

//   let total = 0;
//   cartList.innerHTML = "";

//   items.forEach(item => {
//     // 🔥 SAFE ACCESS (IMPORTANT)
//     const product = item.productId || {};
//     const name = product.name || "Unknown Product";
//     const price = Number(product.price) || 0;
//     const image = product.image || "https://via.placeholder.com/100";

//     const itemTotal = price * item.quantity;
//     total += itemTotal;

//     cartList.insertAdjacentHTML("beforeend", `
//       <div class="cart-item">
//         <img src="${image}" alt="${name}" width="80">
//         <div>
//           <h4>${name}</h4>
//           <p>₹${price}</p>
//           <div>
//             <button onclick="updateQuantity('${item._id}', ${item.quantity - 1})">-</button>
//             <span>${item.quantity}</span>
//             <button onclick="updateQuantity('${item._id}', ${item.quantity + 1})">+</button>
//           </div>
//           <button onclick="removeItem('${item._id}')">Remove</button>
//         </div>
//       </div>
//     `);
//   });

//   subtotalEl.textContent = total;
//   totalEl.textContent = total;
// }

// function renderCart(items, total) {
//   const cartBody = document.getElementById("user-cart-list");
//   const subtotalEl = document.getElementById("cart-subtotal");
//   const totalEl = document.getElementById("user-cart-total");

//   if (!cartBody) return;

//   if (items.length === 0) {
//     cartBody.innerHTML = `
//       <tr>
//         <td colspan="5" style="text-align:center;padding:40px;">
//           🛒 Your cart is empty
//         </td>
//       </tr>
//     `;
//     subtotalEl.innerText = "0.00";
//     totalEl.innerText = "0.00";
//     return;
//   }

//   cartBody.innerHTML = items.map(item => `
//     <tr>
//       <td>${item.name}</td>
//       <td>₹${item.price}</td>
//       <td>
//         <button onclick="updateQuantity('${item._id}', ${item.quantity - 1})">-</button>
//         ${item.quantity}
//         <button onclick="updateQuantity('${item._id}', ${item.quantity + 1})">+</button>
//       </td>
//       <td>₹${item.price * item.quantity}</td>
//       <td>
//         <button onclick="removeItem('${item._id}')">❌</button>
//       </td>
//     </tr>
//   `).join("");

//   subtotalEl.innerText = total.toFixed(2);
//   totalEl.innerText = total.toFixed(2);
// }

// async function loadCart() {
//   try {
//     const response = await fetch(`${API_URL}/cart`, {
//       headers: { Authorization: `Bearer ${authToken}` },
//     });
//     const data = await response.json();

//     if (data.success) {
//       renderCart(data.cart, data.cartTotal);
//     }
//   } catch (err) {
//     console.error("Cart load error:", err);
//   }
// }

// function renderCart(cart, total) {
//   const cartContainer = document.getElementById("user-cart-list");
//   const cartSubtotal = document.getElementById("cart-subtotal");
//   const cartTotal = document.getElementById("user-cart-total");

//   if (!cartContainer) return;

//   if (!cart || cart.length === 0) {
//     cartContainer.innerHTML = `
//       <tr>
//         <td colspan="5" style="text-align: center; padding: 40px; color: #6b7280;">
//           <i class="fa-solid fa-shopping-cart" style="font-size: 48px; margin-bottom: 15px; display: block;"></i>
//           <h3>Your cart is empty</h3>
//           <p>Add items to get started!</p>
//           <a href="index.html" class="btn btn-primary" style="display: inline-block; margin-top: 20px;">Browse Products</a>
//         </td>
//       </tr>
//     `;
//     if (cartSubtotal) cartSubtotal.textContent = "0.00";
//     if (cartTotal) cartTotal.textContent = "0.00";
//     return;
//   }

//   cartContainer.innerHTML = cart.map((item) => `
//     <tr>
//       <td>
//         <div style="display: flex; align-items: center; gap: 12px;">
//           <img src="${item.image}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;">
//           <span>${item.name}</span>
//         </div>
//       </td>
//       <td>₹${item.price.toFixed(2)}</td>
//       <td>
//         <div style="display: flex; align-items: center; gap: 8px;">
//           <button onclick="updateQuantity('${item._id}', ${item.quantity - 1})" class="btn btn-secondary" style="padding: 4px 10px;">-</button>
//           <span style="min-width: 30px; text-align: center;">${item.quantity}</span>
//           <button onclick="updateQuantity('${item._id}', ${item.quantity + 1})" class="btn btn-secondary" style="padding: 4px 10px;">+</button>
//         </div>
//       </td>
//       <td>₹${(item.price * item.quantity).toFixed(2)}</td>
//       <td>
//         <button onclick="removeItem('${item._id}')" class="btn btn-danger" style="padding: 6px 12px;">
//           <i class="fa-solid fa-trash"></i>
//         </button>
//       </td>
//     </tr>
//   `).join("");

//   if (cartSubtotal) cartSubtotal.textContent = total.toFixed(2);
//   if (cartTotal) cartTotal.textContent = total.toFixed(2);
// }

// Update Cart Quantity
async function updateQuantity(itemId, quantity) {
  if (quantity < 1) return;

  try {
    const res = await fetch(`${API_URL}/cart/${itemId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
      body: JSON.stringify({ quantity }),
    });

    const data = await res.json();

    if (data.success) {
      renderCart(data.items); // 🔥 instant update
      renderDashboardCart(data.items); // Update dashboard too
    } else {
      console.error("Failed to update quantity:", data.message);
      alert("Failed to update cart");
    }
  } catch (err) {
    console.error("Update quantity error:", err);
    alert("Error updating cart");
  }
}

// Remove Item from Cart
async function removeItem(itemId) {
  try {
    const res = await fetch(`${API_URL}/cart/${itemId}`, {
      method: "DELETE",
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    });

    const data = await res.json();

    if (data.success) {
      renderCart(data.items); // 🔥 no refresh
      renderDashboardCart(data.items); // Update dashboard too
    } else {
      console.error("Failed to remove item:", data.message);
      alert("Failed to remove item");
    }
  } catch (err) {
    console.error("Remove item error:", err);
    alert("Error removing item from cart");
  }
}

// Clear Entire Cart
async function clearEntireCart() {
  try {
    const res = await fetch(`${API_URL}/cart`, {
      method: "DELETE",
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    });

    const data = await res.json();
    if (data.success) {
      renderCart([]);
      renderDashboardCart([]);
    } else {
      console.error("Failed to clear cart:", data.message);
      alert("Failed to clear cart");
    }
  } catch (err) {
    console.error("Clear cart error:", err);
    alert("Error clearing cart");
  }
}

// Load Orders
async function loadOrders() {
  try {
    console.log("Loading orders from:", `${API_URL}/orders`);
    const response = await fetch(`${API_URL}/orders`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    console.log("Orders response status:", response.status);
    const data = await response.json();
    console.log("Orders data:", data);

    if (data.success && data.orders) {
      renderOrders(data.orders);
    } else {
      console.warn("No orders returned or API error:", data.message);
      renderOrders([]);
    }
  } catch (err) {
    console.error("Orders error:", err);
    renderOrders([]);
  }
}

function renderOrders(orders) {
  const ordersTable = document.querySelector("#orders-table tbody");
  if (!ordersTable) {
    console.warn("Orders table not found in DOM");
    return;
  }

  if (!orders || orders.length === 0) {
    ordersTable.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px; color: #6b7280;">
          No orders yet
        </td>
      </tr>
    `;
    return;
  }

  try {
    ordersTable.innerHTML = orders
      .map((order) => {
        if (!order) return "";

        const statusClass =
          order.status === "delivered"
            ? "status-delivered"
            : order.status === "shipped"
              ? "status-shipped"
              : "status-pending";

        const orderDate = order.createdAt
          ? new Date(order.createdAt).toLocaleDateString("en-IN", {
              dateStyle: "medium",
            })
          : "N/A";

        // Get order items details
        const itemsCount = order.items ? order.items.length : 0;
        const itemsDetail =
          order.items && order.items.length > 0
            ? order.items
                .map(
                  (item) =>
                    `${item?.productId?.name || "Product"} (${
                      item?.quantity || 0
                    })`,
                )
                .join(", ")
            : "N/A";

        const status = order.status || "pending";
        const total = order.grandTotal || 0;
        const orderId = order.orderId || order._id?.slice(-6) || "N/A";

        return `
          <tr data-status="${status}">
            <td>
              <div style="font-weight: 600;">${orderId}</div>
              <div style="font-size: 12px; color: #999; margin-top: 4px;">${itemsDetail}</div>
            </td>
            <td>${orderDate}</td>
            <td><span class="status ${statusClass}">${
              status.charAt(0).toUpperCase() + status.slice(1)
            }</span></td>
            <td>
              <div style="font-weight: 700;">₹${total.toFixed(2)}</div>
              <div style="font-size: 12px; color: #999; margin-top: 2px;">${itemsCount} item${
                itemsCount !== 1 ? "s" : ""
              }</div>
            </td>
            <td>
              <button class="btn btn-secondary" onclick="viewOrderDetails('${
                order._id
              }')">View Details</button>
              <button class="btn btn-primary" onclick="displayOrderTrackingMap('${order._id}')" style="margin-left: 8px; background-color: #1e7e34;">📍 View Tracking</button>
            ${
              status !== "CANCELLED" &&
              (status === "CONFIRMED" || status === "PLACED")
                ? `<button class="btn btn-danger" onclick="cancelOrder('${order._id}')" style="margin-left: 8px;">Cancel Order</button>`
                : ""
            }
            </td>
          </tr>
        `;
      })
      .join("");
  } catch (err) {
    console.error("Error rendering orders:", err);
    ordersTable.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px; color: red;">
          Error loading orders
        </td>
      </tr>
    `;
  }
}

// Function to view order details
async function viewOrderDetails(orderId) {
  if (!orderId) {
    alert("Invalid order ID");
    return;
  }

  try {
    console.log("Fetching order details for:", orderId);
    const response = await fetch(`${API_URL}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    console.log("Order details response status:", response.status);
    const data = await response.json();
    console.log("Order details data:", data);

    if (data.success && data.order) {
      const order = data.order;
      const status = order.status || "unknown";
      const total = order.grandTotal || 0;
      const subtotal = order.subtotal || 0;
      const shipping = order.shipping || 0;
      const orderId = order._id?.slice(-6) || "N/A";
      const createdDate = order.createdAt
        ? new Date(order.createdAt).toLocaleDateString("en-IN")
        : "N/A";

      // Build items HTML with images
      let itemsHTML = `
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
      `;

      if (order.items && order.items.length > 0) {
        itemsHTML += `<h4 style="margin-top: 0; margin-bottom: 15px;">Items:</h4>`;
        itemsHTML += order.items
          .map((item) => {
            const productImage =
              item?.productId?.image || "https://via.placeholder.com/100";
            const productName = item?.productId?.name || "Product";
            const price = item?.price || 0;
            const quantity = item?.quantity || 1;
            const itemTotal = item?.total || 0;

            return `
              <div style="display: flex; gap: 15px; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e5e7eb;">
                <img src="${productImage}" alt="${productName}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 6px;">
                <div style="flex: 1;">
                  <div style="font-weight: 600; margin-bottom: 5px;">${productName}</div>
                  <div style="color: #666; font-size: 14px; margin-bottom: 5px;">Price: ₹${price.toFixed(2)}</div>
                  <div style="color: #666; font-size: 14px; margin-bottom: 5px;">Quantity: ${quantity}</div>
                  <div style="font-weight: 600; color: #10b981;">Total: ₹${itemTotal.toFixed(2)}</div>
                </div>
              </div>
            `;
          })
          .join("");
      } else {
        itemsHTML += `<p style="color: #999;">No items in this order</p>`;
      }
      itemsHTML += `</div>`;

      // Build the full order details HTML
      const contentHTML = `
        <div style="margin-bottom: 20px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
            <div>
              <div style="color: #666; font-size: 14px;">Order ID</div>
              <div style="font-weight: 600; font-size: 16px;">#ECO-${orderId}</div>
            </div>
            <div>
              <div style="color: #666; font-size: 14px;">Order Date</div>
              <div style="font-weight: 600; font-size: 16px;">${createdDate}</div>
            </div>
            <div>
              <div style="color: #666; font-size: 14px;">Status</div>
              <div style="font-weight: 600; font-size: 16px;">
                <span class="status status-${status.toLowerCase()}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
              </div>
            </div>
            <div>
              <div style="color: #666; font-size: 14px;">Payment Status</div>
              <div style="font-weight: 600; font-size: 16px;">${order.paymentStatus || "PENDING"}</div>
            </div>
          </div>

          ${itemsHTML}

          <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span>Subtotal:</span>
              <span>₹${subtotal.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span>Shipping:</span>
              <span>${shipping === 0 ? "FREE" : `₹${shipping.toFixed(2)}`}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 16px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
              <span>Total:</span>
              <span style="color: #10b981;">₹${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      `;

      // Display in modal
      const modal = document.getElementById("order-details-modal");
      const contentDiv = document.getElementById("order-details-content");
      if (modal && contentDiv) {
        contentDiv.innerHTML = contentHTML;
        modal.style.display = "flex";
      } else {
        // Fallback to alert if modal not found
        alert(
          `Order #${orderId}\nStatus: ${status}\nTotal: ₹${total.toFixed(2)}`,
        );
      }
    } else {
      console.error("Order not found or API error:", data.message);
      alert(`Could not load order details: ${data.message || "Unknown error"}`);
    }
  } catch (err) {
    console.error("Error fetching order details:", err);
    alert("Could not load order details. Please try again.");
  }
}

// Function to close order details modal
function closeOrderDetailsModal() {
  const modal = document.getElementById("order-details-modal");
  if (modal) {
    modal.style.display = "none";
  }
}

// Function to display order on tracking map
async function displayOrderTrackingMap(orderId) {
  try {
    const response = await fetch(`${API_URL}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const data = await response.json();

    if (data.success && data.order) {
      const order = data.order;

      // Scroll to the map
      const mapContainer = document.getElementById("orderTrackingMap");
      if (mapContainer) {
        setTimeout(() => {
          mapContainer.parentElement.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 300);
      }

      // Call the global map display function from acc.html script
      if (window.showOrderTracking) {
        window.showOrderTracking({
          orderId: order.orderId || order._id?.slice(-6) || "Unknown",
          status: order.status || "pending",
          total: order.grandTotal || 0,
          shippingLocation: order.shippingLocation || {},
        });
      } else {
        alert("Map functionality not available. Please refresh the page.");
      }
    } else {
      alert("Order not found or no location data available yet.");
    }
  } catch (err) {
    console.error("Error fetching order for map:", err);
    alert("Could not load order tracking. Please try again.");
  }
}

// Function to cancel order
async function cancelOrder(orderId) {
  if (!orderId) {
    alert("Invalid order ID");
    return;
  }

  const confirmCancel = confirm(
    "Are you sure you want to cancel this order? You will receive a refund within 5-7 business days.",
  );
  if (!confirmCancel) {
    return;
  }

  try {
    console.log("Cancelling order:", orderId);
    const response = await fetch(`${API_URL}/orders/${orderId}/cancel`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log("Cancel response:", data);

    if (data.success) {
      alert(
        "Order cancelled successfully! You will receive a confirmation email shortly.",
      );
      // Reload orders to refresh the table
      await loadOrders();
    } else {
      alert(`Could not cancel order: ${data.message || "Unknown error"}`);
    }
  } catch (err) {
    console.error("Error cancelling order:", err);
    alert("Could not cancel order. Please try again.");
  }
}

// Clear Order History
async function clearOrderHistory() {
  const confirmClear = confirm(
    "Are you sure you want to clear all order history? This action cannot be undone.",
  );
  if (!confirmClear) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/orders/clear/history`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log("Clear history response:", data);

    if (data.success) {
      alert("Order history cleared successfully!");
      // Reload orders to refresh the table
      await loadOrders();
      await loadDashboardStats();
    } else {
      alert(`Could not clear history: ${data.message || "Unknown error"}`);
    }
  } catch (err) {
    console.error("Error clearing order history:", err);
    alert("Could not clear order history. Please try again.");
  }
}

// Proceed to Checkout
async function proceedToCheckout() {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Please login first");
    return;
  }

  const res = await fetch(`${API_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({
      address: "Default Address",
      paymentMethod: "COD",
    }),
  });

  const data = await res.json();

  if (data.success) {
    alert("Order placed successfully");
    window.location.href = "acc.html";
  } else {
    alert(data.message);
  }
}

// Setup Navigation
function setupNavigation() {
  const navLinks = document.querySelectorAll(".sidebar-nav li");
  const contentPanels = document.querySelectorAll(".content-panel");
  const mainTitle = document.getElementById("main-title");

  function activatePanel(targetId) {
    contentPanels.forEach((panel) =>
      panel.classList.toggle("active", panel.id === targetId),
    );

    let activeLinkText = "Dashboard";
    navLinks.forEach((link) => {
      const isActive = link.getAttribute("data-target") === targetId;
      link.classList.toggle("active", isActive);
      if (isActive) activeLinkText = link.textContent.trim();
    });

    if (mainTitle) mainTitle.textContent = activeLinkText;

    // 🔄 Reload cart and orders when dashboard is activated
    if (targetId === "dashboard-content") {
      loadDashboardStats(); // Update stats
      loadCart(); // Reload cart items
      loadOrders(); // Reload orders (for new orders after payment)
    }
  }

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const target = link.getAttribute("data-target");
      if (target) activatePanel(target);
    });
  });

  // Setup clear history button
  const clearHistoryBtn = document.getElementById("clear-history-btn");
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener("click", clearOrderHistory);
  }

  // Handle deep-link hash from Ruhi AI (e.g. acc.html#cart, acc.html#orders)
  const hashMap = {
    "#cart": "cart-content",
    "#orders": "dashboard-content",
    "#profile": "profile-content",
    "#addresses": "addresses-content",
    "#settings": "settings-content",
    "#dashboard": "dashboard-content",
  };
  const targetPanel = hashMap[window.location.hash] || "dashboard-content";
  activatePanel(targetPanel);

  // Also handle hash changes at runtime (e.g. from ruhi.js same-page nav)
  window.addEventListener("hashchange", () => {
    const panel = hashMap[window.location.hash];
    if (panel) activatePanel(panel);
  });
}

// Setup Logout
function setupLogout() {
  const logoutBtn = document.querySelector(".logout-btn");
  const modal = document.getElementById("confirmation-modal");
  const cancelBtn = document.getElementById("modal-cancel-btn");
  const confirmBtn = document.getElementById("modal-confirm-btn");

  logoutBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    if (modal) modal.style.display = "flex";
  });

  cancelBtn?.addEventListener("click", () => {
    if (modal) modal.style.display = "none";
  });

  confirmBtn?.addEventListener("click", () => {
    // Remove only USER keys, preserve admin keys
    localStorage.removeItem("token");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userId");
    localStorage.removeItem("loginTime");

    // Remove userType if it was "user"
    const userType = localStorage.getItem("userType");
    if (userType === "user") {
      localStorage.removeItem("userType");
    }

    sessionStorage.clear();
    showToast("Logged out successfully", "success");
    setTimeout(() => (window.location.href = "homepage.html"), 500);
  });

  // Close modal on outside click
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });
}

// Save Profile
function saveProfile() {
  const firstName = document.getElementById("first-name")?.value || "";
  const lastName = document.getElementById("last-name")?.value || "";
  const email = document.getElementById("email")?.value || "";
  const phone = document.getElementById("phone")?.value || "";

  fetch(`${API_URL}/user/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      fullName: `${firstName} ${lastName}`.trim(),
      email,
      phone,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        showToast("Profile saved successfully!", "success");
        localStorage.setItem("userName", data.user.fullName);
        localStorage.setItem("userEmail", data.user.email);
      } else {
        showToast(data.message || "Failed to save profile", "error");
      }
    })
    .catch(() => showToast("Failed to save profile", "error"));
}

// Toast Notification
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${
    type === "success" ? "fa-check-circle" : "fa-times-circle"
  }"></i> ${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Mobile Sidebar Toggle
const hamburgerMenu = document.getElementById("hamburger-menu");
const sidebar = document.querySelector(".sidebar");

hamburgerMenu?.addEventListener("click", () => {
  sidebar?.classList.toggle("show");
});

// Order Details Modal - Close on outside click
const orderDetailsModal = document.getElementById("order-details-modal");
if (orderDetailsModal) {
  orderDetailsModal.addEventListener("click", (e) => {
    if (e.target === orderDetailsModal) {
      orderDetailsModal.style.display = "none";
    }
  });
}

// Order Filtering
document.querySelectorAll(".filter-btn").forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.getAttribute("data-filter");
    document
      .querySelectorAll(".filter-btn")
      .forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    document.querySelectorAll("#orders-table tbody tr").forEach((row) => {
      row.style.display =
        filter === "all" || row.dataset.status === filter ? "" : "none";
    });
  });
});

// Save Profile Button
document
  .getElementById("save-profile-btn")
  ?.addEventListener("click", saveProfile);

// ===== NEW: NOTIFICATION SYSTEM =====
let notifications = [];

function initNotificationSystem() {
  const bellIcon = document.getElementById("notification-bell");
  const notificationPanel = document.getElementById("notification-panel");
  const clearBtn = document.getElementById("notification-clear-btn");

  if (bellIcon) {
    bellIcon.addEventListener("click", () => {
      notificationPanel?.classList.toggle("show");
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      notifications = [];
      document.getElementById("notification-list").innerHTML =
        '<div class="notification-empty">No notifications yet</div>';
      updateNotificationBadge();
    });
  }

  // Close panel when clicking outside
  document.addEventListener("click", (e) => {
    if (
      !bellIcon?.contains(e.target) &&
      !notificationPanel?.contains(e.target)
    ) {
      notificationPanel?.classList.remove("show");
    }
  });
}

function addNotification(title, message, type = "info") {
  const notification = {
    id: Date.now(),
    title,
    message,
    type, // success, error, warning, info
    timestamp: new Date(),
    read: false,
  };

  notifications.unshift(notification);
  if (notifications.length > 10) notifications.pop();

  renderNotifications();
  updateNotificationBadge();

  // Auto-play sound notification
  playNotificationSound();
}

function renderNotifications() {
  const notificationList = document.getElementById("notification-list");
  if (!notificationList) return;

  if (notifications.length === 0) {
    notificationList.innerHTML =
      '<div class="notification-empty">No notifications yet</div>';
    return;
  }

  let html = "";
  notifications.forEach((notif) => {
    const icons = {
      success: "fa-check-circle",
      error: "fa-exclamation-circle",
      warning: "fa-exclamation-triangle",
      info: "fa-info-circle",
    };

    const iconClass = icons[notif.type] || icons.info;
    const timeAgo = getTimeAgo(notif.timestamp);

    html += `
      <div class="notification-item ${notif.read ? "" : "unread"}">
        <div class="notification-icon ${notif.type}">
          <i class="fa-solid ${iconClass}"></i>
        </div>
        <div class="notification-content">
          <div class="notification-title">${notif.title}</div>
          <div class="notification-message">${notif.message}</div>
          <div class="notification-time">${timeAgo}</div>
        </div>
      </div>
    `;
  });

  notificationList.innerHTML = html;
}

function updateNotificationBadge() {
  const badge = document.getElementById("notification-badge");
  const unreadCount = notifications.filter((n) => !n.read).length;

  if (badge) {
    if (unreadCount > 0) {
      badge.style.display = "flex";
      badge.textContent = unreadCount > 9 ? "9+" : unreadCount;
    } else {
      badge.style.display = "none";
    }
  }
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return Math.floor(seconds / 60) + "m ago";
  if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";
  return Math.floor(seconds / 86400) + "d ago";
}

function playNotificationSound() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.frequency.value = 800;
  gain.gain.setValueAtTime(0.3, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.3);
}

// ===== NEW: DARK MODE TOGGLE =====
function initDarkMode() {
  const toggle = document.getElementById("dark-mode-toggle");
  const savedMode = localStorage.getItem("darkMode") === "true";

  if (savedMode) {
    document.body.classList.add("dark-mode");
    toggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
  }

  if (toggle) {
    toggle.addEventListener("click", () => {
      const isDarkMode = document.body.classList.toggle("dark-mode");
      localStorage.setItem("darkMode", isDarkMode);
      toggle.innerHTML = isDarkMode
        ? '<i class="fa-solid fa-sun"></i>'
        : '<i class="fa-solid fa-moon"></i>';
    });
  }
}

// ===== NEW: ACTIVITY CHART =====
function initActivityChart() {
  loadActivityChart();
}

async function loadActivityChart() {
  try {
    const response = await fetch(`${API_URL}/orders`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await response.json();
    const orders = data.orders || [];

    // Get last 7 days spending
    const dailySpending = new Array(7).fill(0);
    const today = new Date();

    orders.forEach((order) => {
      const orderDate = new Date(order.createdAt);
      const daysAgo = Math.floor((today - orderDate) / (1000 * 60 * 60 * 24));

      if (daysAgo < 7) {
        dailySpending[6 - daysAgo] += parseFloat(order.amount) || 0;
      }
    });

    // Find max value for scaling
    const maxSpending = Math.max(...dailySpending, 1);

    // Update bars
    const bars = document.querySelectorAll(".activity-bar");
    bars.forEach((bar, index) => {
      const percentage = (dailySpending[index] / maxSpending) * 100;
      bar.style.height = percentage + "%";

      const valueSpan = bar.querySelector(".activity-bar-value");
      if (valueSpan) {
        valueSpan.textContent = `₹${Math.round(dailySpending[index])}`;
      }
    });

    console.log("✅ Activity chart loaded");
  } catch (err) {
    console.error("Activity chart error:", err);
  }
}

// ===== NEW: ECO IMPACT STATS =====
function initEcoImpactStats() {
  loadEcoImpactStats();
}

async function loadEcoImpactStats() {
  try {
    const response = await fetch(`${API_URL}/orders`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await response.json();
    const orders = data.orders || [];

    // Calculate stats based on orders
    const totalProducts = orders.reduce(
      (sum, order) => sum + (order.items?.length || 0),
      0,
    );
    const treesPlanted = Math.floor(totalProducts * 0.5); // 1 tree per 2 eco products
    const waterSaved = totalProducts * 500; // 500L per eco product
    const co2Offset = totalProducts * 2.5; // 2.5kg CO2 per eco product
    const itemsRecycled = totalProducts;

    // Update UI
    const stats = {
      "trees-planted": treesPlanted,
      "water-saved": waterSaved + "L",
      "co2-offset": co2Offset.toFixed(1) + "kg",
      "items-recycled": itemsRecycled,
    };

    Object.entries(stats).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    });

    console.log("✅ Eco impact stats loaded");
  } catch (err) {
    console.error("Eco impact stats error:", err);
  }
}

// ===== NEW: CREDIT TRANSACTION HISTORY =====
function initTransactionHistory() {
  loadTransactionHistory();
}

async function loadTransactionHistory() {
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await response.json();

    if (!data.success) throw new Error("Failed to load user data");

    const creditHistory = data.user.creditHistory || [];
    const transactionList = document.getElementById("transaction-list");

    if (!transactionList) return;

    if (creditHistory.length === 0) {
      transactionList.innerHTML = `
        <div style="text-align: center; padding: 30px; color: var(--text-muted);">
          <p>No transactions yet. Start shopping to earn and spend eco-credits!</p>
        </div>
      `;
      return;
    }

    let html = "";
    creditHistory.slice(0, 10).forEach((transaction) => {
      const isDebit = transaction.amount < 0;
      const icon = isDebit ? "fa-arrow-down" : "fa-arrow-up";
      const typeClass = isDebit ? "debit" : "credit";
      const amountClass = isDebit ? "debit" : "credit";
      const amount = Math.abs(transaction.amount);
      const date = new Date(transaction.date).toLocaleDateString();

      html += `
        <div class="transaction-item ${typeClass}">
          <div class="transaction-info">
            <div class="transaction-icon ${typeClass}">
              <i class="fa-solid ${icon}"></i>
            </div>
            <div class="transaction-details">
              <h4>${transaction.description || (isDebit ? "Credits Used" : "Credits Earned")}</h4>
              <p>${date}</p>
            </div>
          </div>
          <div class="transaction-amount ${amountClass}">
            ${isDebit ? "-" : "+"}${amount}
          </div>
        </div>
      `;
    });

    transactionList.innerHTML = html;
    console.log("✅ Transaction history loaded");
  } catch (err) {
    console.error("Transaction history error:", err);
  }
}

// Update initDashboard to include new initializations
const originalInitDashboard = window.initDashboard;
window.initDashboard = async function () {
  if (originalInitDashboard) {
    // Call original init
    await originalInitDashboard.call(this);
  }

  // Initialize new features
  setTimeout(() => {
    initNotificationSystem();
    initDarkMode();
    initActivityChart();
    initEcoImpactStats();
    initTransactionHistory();

    // Add sample notification
    addNotification(
      "Welcome back!",
      "Check your eco-credits and recent orders",
      "success",
    );

    console.log("✅ All dashboard features initialized");
  }, 500);
};

// Expose functions globally
window.updateQuantity = updateQuantity;
window.removeItem = removeItem;
window.clearEntireCart = clearEntireCart;
window.proceedToCheckout = proceedToCheckout;
window.viewOrderDetails = viewOrderDetails;
window.closeOrderDetailsModal = closeOrderDetailsModal;
window.cancelOrder = cancelOrder;
window.clearOrderHistory = clearOrderHistory;
window.addNotification = addNotification;

function goToPayment() {
  if (!document.getElementById("cart-list")?.children.length) {
    alert("Your cart is empty");
    return;
  }

  window.location.href = "Payment/payment.html";
}

// NOTE: loadOrders() function is already defined above in this file
// Do not add duplicate function definitions
