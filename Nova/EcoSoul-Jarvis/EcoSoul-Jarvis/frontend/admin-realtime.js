const API = window.API_CONFIG?.API_URL || '/api';
const token = localStorage.getItem("adminToken"); // Use ADMIN token

// Check if user is admin
if (!token) {
  window.location.href = "admin-login.html";
}

// Initialize Socket.io
const socket = io("http://localhost:5002");

// ==================== TOAST NOTIFICATIONS ====================
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ==================== SECTION NAVIGATION ====================
function showSection(section) {
  document
    .querySelectorAll(".section")
    .forEach((s) => s.classList.add("hidden"));
  document.getElementById(section).classList.remove("hidden");

  document
    .querySelectorAll(".nav-btn")
    .forEach((b) => b.classList.remove("active"));
  event.target.classList.add("active");

  // Load data for the section
  if (section === "dashboard") loadDashboard();
  if (section === "users") loadUsersWithCarts();
  if (section === "orders") loadAllOrders();
  if (section === "activity") loadActivity();
}

// ==================== LOGOUT ====================
function handleLogout() {
  if (confirm("Are you sure you want to logout?")) {
    // Remove ADMIN keys
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminName");
    localStorage.removeItem("adminEmail");
    localStorage.removeItem("adminId");
    localStorage.removeItem("adminLoggedIn");
    localStorage.removeItem("userType");
    window.location.href = "admin-login.html";
  }
}

// ==================== DASHBOARD ====================
let allOrders = [];
let allUsers = [];

async function loadDashboard() {
  try {
    const res = await fetch(`${API}/admin/stats/sales`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    document.getElementById("totalOrders").textContent = data.totalOrders || 0;
    document.getElementById("totalRevenue").textContent =
      `₹${(data.totalRevenue || 0).toLocaleString()}`;
    document.getElementById("totalUsers").textContent = data.totalUsers || 0;
    document.getElementById("activeCarts").textContent = data.activeCarts || 0;

    // Load chart
    loadSalesChart();
  } catch (error) {
    console.error("Dashboard error:", error);
    showToast("Error loading dashboard", "error");
  }
}

async function loadSalesChart() {
  try {
    const res = await fetch(`${API}/admin/stats/sales`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    const ctx = document.getElementById("salesChart");
    if (ctx && window.Chart) {
      new Chart(ctx, {
        type: "bar",
        data: {
          labels: ["Orders", "Revenue"],
          datasets: [
            {
              label: "Sales Overview",
              data: [data.totalOrders || 0, (data.totalRevenue || 0) / 1000],
              backgroundColor: ["#3b82f6", "#10b981"],
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: true },
          },
        },
      });
    }
  } catch (error) {
    console.error("Chart error:", error);
  }
}

// ==================== USERS WITH CARTS & ORDERS ====================
async function loadUsersWithCarts() {
  try {
    const usersRes = await fetch(`${API}/user/all`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const usersData = await usersRes.json();
    allUsers = usersData.users || [];

    const cartsRes = await fetch(`${API}/admin/carts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const cartsData = await cartsRes.json();

    const ordersRes = await fetch(`${API}/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const ordersData = ordersRes.json();
    allOrders = (await ordersData).orders || [];

    renderUsersWithCarts(allUsers, cartsData.carts || []);
  } catch (error) {
    console.error("Error loading users:", error);
    showToast("Error loading users data", "error");
  }
}

function renderUsersWithCarts(users, carts) {
  const container = document.getElementById("usersContainer");

  const html = users
    .map((user) => {
      const userCart = carts.find((c) => c.userId === user._id);
      const userOrders = allOrders.filter((o) => o.userId === user._id);
      const cartItems = userCart?.items?.length || 0;
      const cartTotal =
        userCart?.items?.reduce((sum, item) => sum + item.quantity * 50, 0) ||
        0;

      return `
      <div class="user-card">
        <div class="user-header">
          <div class="user-info">
            <h3>${user.name}</h3>
            <p>${user.email}</p>
            <span class="user-badge">${user.role || "USER"}</span>
          </div>
          <div class="user-stats">
            <div class="stat">
              <span class="stat-value">${cartItems}</span>
              <span class="stat-label">Cart Items</span>
            </div>
            <div class="stat">
              <span class="stat-value">₹${cartTotal}</span>
              <span class="stat-label">Cart Value</span>
            </div>
            <div class="stat">
              <span class="stat-value">${userOrders.length}</span>
              <span class="stat-label">Orders</span>
            </div>
          </div>
        </div>

        <div class="user-content">
          ${
            cartItems > 0
              ? `
            <div class="cart-section">
              <h4>🛒 Cart Items (${cartItems})</h4>
              <div class="items-list">
                ${userCart.items
                  .map(
                    (item, idx) => `
                  <div class="item">
                    <span>${idx + 1}. Product ID: ${item.productId}</span>
                    <span class="qty">Qty: ${item.quantity}</span>
                  </div>
                `,
                  )
                  .join("")}
              </div>
            </div>
          `
              : '<p class="empty">No items in cart</p>'
          }

          ${
            userOrders.length > 0
              ? `
            <div class="orders-section">
              <h4>📦 Orders (${userOrders.length})</h4>
              <div class="orders-list">
                ${userOrders
                  .map(
                    (order) => `
                  <div class="order-item">
                    <div class="order-header">
                      <span class="order-id">Order #${order._id.substring(0, 8)}</span>
                      <span class="order-status ${order.status.toLowerCase()}">${order.status}</span>
                    </div>
                    <p class="order-amount">₹${order.grandTotal}</p>
                    <p class="order-date">${new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                `,
                  )
                  .join("")}
              </div>
            </div>
          `
              : '<p class="empty">No orders yet</p>'
          }
        </div>
      </div>
    `;
    })
    .join("");

  container.innerHTML =
    html ||
    '<p style="grid-column: 1/-1; text-align: center;">No users found</p>';
}

// ==================== ALL ORDERS ====================
async function loadAllOrders() {
  try {
    const res = await fetch(`${API}/admin/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    allOrders = data.orders || [];

    renderAllOrders(allOrders);
  } catch (error) {
    console.error("Error loading orders:", error);
    showToast("Error loading orders", "error");
  }
}

function renderAllOrders(orders) {
  const container = document.getElementById("ordersContainer");

  if (!orders || orders.length === 0) {
    container.innerHTML =
      '<p style="grid-column: 1/-1; text-align: center;">No orders found</p>';
    return;
  }

  const html = orders
    .map(
      (order) => `
    <div class="order-card">
      <div class="order-header">
        <div>
          <h3>Order #${order._id.substring(0, 8)}</h3>
          <p class="user-info">Customer: ${order.userId}</p>
        </div>
        <div class="order-meta">
          <span class="status-badge ${order.status.toLowerCase()}">${order.status}</span>
          <span class="date">${new Date(order.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
      
      <div class="order-items">
        <h4>Items (${order.items?.length || 0})</h4>
        ${(order.items || [])
          .map(
            (item) => `
          <div class="item-row">
            <span>${item.name}</span>
            <span>x${item.quantity}</span>
            <span class="price">₹${item.total}</span>
          </div>
        `,
          )
          .join("")}
      </div>

      <div class="order-total">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>₹${order.subtotal}</span>
        </div>
        <div class="total-row">
          <span>Shipping:</span>
          <span>₹${order.shipping}</span>
        </div>
        <div class="total-row grand">
          <span>Total:</span>
          <span>₹${order.grandTotal}</span>
        </div>
      </div>

      <div class="order-actions">
        <select class="status-select" onchange="updateOrderStatus('${order._id}', this.value)">
          <option value="PENDING" ${order.status === "PENDING" ? "selected" : ""}>PENDING</option>
          <option value="PROCESSING" ${order.status === "PROCESSING" ? "selected" : ""}>PROCESSING</option>
          <option value="SHIPPED" ${order.status === "SHIPPED" ? "selected" : ""}>SHIPPED</option>
          <option value="DELIVERED" ${order.status === "DELIVERED" ? "selected" : ""}>DELIVERED</option>
          <option value="CANCELLED" ${order.status === "CANCELLED" ? "selected" : ""}>CANCELLED</option>
        </select>
      </div>
    </div>
  `,
    )
    .join("");

  container.innerHTML = html;
}

async function updateOrderStatus(orderId, newStatus) {
  try {
    const res = await fetch(`${API}/admin/orders/${orderId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: newStatus }),
    });

    if (res.ok) {
      showToast(`Order status updated to ${newStatus}`, "success");
      loadAllOrders();
    }
  } catch (error) {
    console.error("Error updating order:", error);
    showToast("Error updating order", "error");
  }
}

// ==================== ACTIVITY FEED ====================
let activityLog = [];

function loadActivity() {
  const container = document.getElementById("activityContainer");

  if (activityLog.length === 0) {
    container.innerHTML =
      '<p style="text-align: center; grid-column: 1/-1;">No activities yet. Waiting for real-time updates...</p>';
    return;
  }

  const html = activityLog
    .map(
      (activity) => `
    <div class="activity-item">
      <span class="activity-time">${new Date(activity.timestamp).toLocaleTimeString()}</span>
      <p>${activity.message}</p>
    </div>
  `,
    )
    .join("");

  container.innerHTML = html;
}

// ==================== REAL-TIME SOCKET.IO LISTENERS ====================
socket.on("cart-updated", (data) => {
  console.log("📊 Cart Updated:", data);

  const message =
    data.type === "ITEM_ADDED"
      ? `✅ ${data.userName} added "${data.productName}" (${data.quantity}x) to cart`
      : `❌ ${data.userName} removed item from cart`;

  activityLog.unshift({
    message,
    timestamp: data.timestamp,
  });

  showToast(message, "info");

  // Reload users if viewing that section
  if (!document.getElementById("dashboard").classList.contains("hidden")) {
    loadUsersWithCarts();
  }
});

socket.on("order-placed", (data) => {
  console.log("🛍️ Order Placed:", data);

  const message = `🎉 New Order from ${data.userName}: ₹${data.totalAmount} (${data.itemCount} items)`;

  activityLog.unshift({
    message,
    timestamp: data.timestamp,
  });

  showToast(message, "success");

  // Reload orders if viewing that section
  if (!document.getElementById("orders").classList.contains("hidden")) {
    loadAllOrders();
  }
});

socket.on("order-cancelled", (data) => {
  console.log("❌ Order Cancelled:", data);

  const message = `Order cancelled by ${data.userName}`;

  activityLog.unshift({
    message,
    timestamp: data.timestamp,
  });

  showToast(message, "warning");

  if (!document.getElementById("orders").classList.contains("hidden")) {
    loadAllOrders();
  }
});

socket.on("connect", () => {
  console.log("🟢 Connected to real-time updates");
  showToast("Connected to real-time updates", "success");
});

socket.on("disconnect", () => {
  console.log("🔴 Disconnected from real-time updates");
  showToast("Disconnected from server", "error");
});

// ==================== THEME TOGGLE ====================
function toggleTheme() {
  const isDark = document.body.classList.toggle("dark-mode");
  localStorage.setItem("darkMode", isDark);
}

// Load theme preference
if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark-mode");
}

// ==================== INITIALIZE ====================
document.addEventListener("DOMContentLoaded", () => {
  loadDashboard();
  loadActivity();
});
