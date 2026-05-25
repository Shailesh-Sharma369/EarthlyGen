const API = window.API_CONFIG?.API_URL || "/api";
const token = localStorage.getItem("adminToken"); // Use ADMIN token, not user token

// ✅ CHECK IF USER IS ADMIN - If not, redirect to admin login page
if (!token) {
  console.warn("⚠️ No admin token found, redirecting to admin login...");
  window.location.href = "admin-login.html";
}

// Extract admin ID from JWT token
let adminId = null;
let userRole = null;
if (token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    const decoded = JSON.parse(jsonPayload);
    adminId = decoded.id || decoded.userId;
    userRole = decoded.role;
    console.log("✅ Admin ID extracted from token:", adminId);
    console.log("✅ User role:", userRole);

    // ✅ SECURITY: Check if user is actually an admin
    if (userRole !== "ADMIN") {
      console.error("❌ User is not an admin! Role:", userRole);
      alert(
        "❌ Access Denied: Only admins can access this panel.\n\nYour role: " +
          userRole,
      );
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminLoggedIn");
      window.location.href = "admin-login.html";
    }
  } catch (err) {
    console.error("❌ Failed to decode token:", err.message);
    window.location.href = "admin-login.html";
  }
}

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

function ecoBadge(status) {
  const map = {
    certified: "eco-certified",
    eco_verified: "eco-verified",
    partially_eco: "eco-partial",
    not_verified: "eco-not-verified",
  };
  return map[status] || "eco-not-verified";
}

function ecoStatusLabel(status) {
  const map = {
    certified: "Certified Eco",
    eco_verified: "Eco Verified",
    partially_eco: "Partially Eco",
    not_verified: "Not Verified",
  };
  return map[status] || "Not Verified";
}

function renderVerificationResult(verification, approved) {
  const box = document.getElementById("verificationResult");
  if (!box || !verification) return;

  const status = verification.eco_status || "not_verified";
  const score = verification.eco_score ?? 0;
  const confidence = verification.eco_confidence ?? 0;
  const category = verification.eco_category || "Poor";

  box.classList.remove("hidden", "success", "error");
  box.classList.add(approved ? "success" : "error");
  box.innerHTML = `
    <div class="verify-header">${approved ? "✅ Verification Passed" : "❌ Verification Failed"}</div>
    <div class="verify-row"><span class="badge ${ecoBadge(status)}">${ecoStatusLabel(status)}</span></div>
    <div class="verify-row">Eco Score: <strong>${score}</strong> (${category})</div>
    <div class="verify-row">Confidence: <strong>${confidence}%</strong></div>
  `;
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
  if (section === "products") loadProducts();
  if (section === "orders") loadOrders();
  if (section === "carts") loadUserCarts();
  if (section === "messages") loadUsersForMessaging();
  if (section === "activity") loadActivity();
}

// ==================== LOGOUT ====================
function handleLogout() {
  if (confirm("Are you sure you want to logout?")) {
    // Remove ADMIN keys only (not user keys)
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminLoggedIn");
    localStorage.removeItem("adminName");
    localStorage.removeItem("adminEmail");
    localStorage.removeItem("adminId");
    localStorage.removeItem("userType");
    window.location.href = "admin-login.html";
  }
}

// ==================== DASHBOARD ====================
async function loadDashboard() {
  try {
    const res = await fetch(`${API}/admin/stats/sales`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      if (res.status === 403) {
        // Silently handle - user doesn't have admin access to stats
        console.log("⚠️ Stats not available (permission denied)");
        document.getElementById("totalOrders").textContent = "---";
        document.getElementById("totalRevenue").textContent = "₹---";
        document.getElementById("totalUsers").textContent = "---";
        document.getElementById("activeCarts").textContent = "---";
        return;
      }
      throw new Error(`HTTP ${res.status}`);
    }

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
  }
}

async function loadSalesChart() {
  try {
    const res = await fetch(`${API}/admin/stats/sales`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      if (res.status === 403) {
        // Silently handle - user doesn't have admin access
        return;
      }
      throw new Error(`HTTP ${res.status}`);
    }

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

// ==================== PRODUCTS MANAGEMENT ====================
async function addProduct() {
  const name = document.getElementById("name").value.trim();
  const price = document.getElementById("price").value;
  const stock = document.getElementById("stock").value;
  const category = document.getElementById("category").value.trim();
  const description = document.getElementById("description").value.trim();
  const image = document.getElementById("image").value.trim();

  if (!name || !price || !stock || !category || !image) {
    showToast("Please fill all required fields", "error");
    return;
  }

  try {
    const res = await fetch(`${API}/admin/products/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name,
        price: parseFloat(price),
        stock: parseInt(stock),
        category,
        description,
        image,
        isActive: true,
      }),
    });

    const data = await res.json();
    if (data.success) {
      renderVerificationResult(data.verification, true);
      showToast("Product added successfully!", "success");
      document.getElementById("name").value = "";
      document.getElementById("price").value = "";
      document.getElementById("stock").value = "";
      document.getElementById("category").value = "";
      document.getElementById("description").value = "";
      document.getElementById("image").value = "";
      loadProducts();
    } else {
      renderVerificationResult(data.verification, false);
      showToast(data.message || "Error adding product", "error");
    }
  } catch (error) {
    console.error("Add product error:", error);
    showToast("Error adding product", "error");
  }
}

async function loadProducts() {
  try {
    const res = await fetch(`${API}/products`);
    const data = await res.json();

    const tbody = document.getElementById("productList");
    tbody.innerHTML = "";

    data.products.forEach((p) => {
      const ecoStatus = p.eco_status || "not_verified";
      tbody.innerHTML += `
        <tr>
          <td>${p.name}</td>
          <td>₹${p.price}</td>
          <td>${p.stock}</td>
          <td>${p.category || "N/A"}</td>
          <td>
            <span class="badge ${ecoBadge(ecoStatus)}">${ecoStatusLabel(ecoStatus)}</span>
          </td>
          <td><span class="badge ${p.isActive ? "active" : "disabled"}">${p.isActive ? "Active" : "Disabled"}</span></td>
          <td>
            <button class="btn edit" onclick="editProduct('${p._id}', '${p.name}', ${p.price}, ${p.stock})">✏️</button>
            <button class="btn delete" onclick="deleteProduct('${p._id}')">🗑️</button>
          </td>
        </tr>
      `;
    });
  } catch (error) {
    console.error("Load products error:", error);
    showToast("Error loading products", "error");
  }
}

async function editProduct(id, name, price, stock) {
  const newName = prompt("Product name:", name);
  if (!newName) return;

  const newPrice = prompt("Price:", price);
  if (!newPrice) return;

  const newStock = prompt("Stock:", stock);
  if (!newStock) return;

  try {
    const res = await fetch(`${API}/admin/products/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: newName,
        price: parseFloat(newPrice),
        stock: parseInt(newStock),
      }),
    });

    const data = await res.json();
    if (data.success) {
      showToast("Product updated successfully!", "success");
      loadProducts();
    } else {
      showToast("Error updating product", "error");
    }
  } catch (error) {
    console.error("Edit product error:", error);
    showToast("Error updating product", "error");
  }
}

async function deleteProduct(id) {
  if (!confirm("Are you sure you want to delete this product?")) return;

  try {
    const res = await fetch(`${API}/admin/products/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    if (data.success) {
      showToast("Product deleted successfully!", "success");
      loadProducts();
    } else {
      showToast("Error deleting product", "error");
    }
  } catch (error) {
    console.error("Delete product error:", error);
    showToast("Error deleting product", "error");
  }
}

// ==================== ORDERS MANAGEMENT ====================
async function loadOrders() {
  try {
    const filter = document.getElementById("orderFilter")?.value || "";
    let url = `${API}/admin/orders`;
    if (filter) url += `?status=${filter}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    const tbody = document.getElementById("orderList");
    tbody.innerHTML = "";

    if (data.orders && data.orders.length > 0) {
      data.orders.forEach((order) => {
        const productsList =
          order.items?.map((item) => item.name || "Unknown").join(", ") ||
          "N/A";
        const date = new Date(order.createdAt).toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        tbody.innerHTML += `
          <tr>
            <td>${order._id?.substring(0, 8)}...</td>
            <td>${order.userId?.email || "Unknown"}</td>
            <td>${productsList}</td>
            <td>₹${order.grandTotal?.toLocaleString() || 0}</td>
            <td>
              <select onchange="updateOrderStatus('${order._id}', this.value)" class="status-select">
                <option value="pending" ${order.status === "pending" ? "selected" : ""}>Pending</option>
                <option value="processing" ${order.status === "processing" ? "selected" : ""}>Processing</option>
                <option value="shipped" ${order.status === "shipped" ? "selected" : ""}>Shipped</option>
                <option value="delivered" ${order.status === "delivered" ? "selected" : ""}>Delivered</option>
                <option value="cancelled" ${order.status === "cancelled" ? "selected" : ""}>Cancelled</option>
              </select>
            </td>
            <td>${date}</td>
            <td><button class="btn info" onclick="viewOrderDetails('${order._id}')">View</button></td>
          </tr>
        `;
      });
    } else {
      tbody.innerHTML = "<tr><td colspan='7'>No orders found</td></tr>";
    }
  } catch (error) {
    console.error("Load orders error:", error);
    showToast("Error loading orders", "error");
  }
}

async function updateOrderStatus(orderId, status) {
  try {
    const res = await fetch(`${API}/admin/orders/${orderId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });

    const data = await res.json();
    if (data.success) {
      showToast("Order status updated!", "success");
      loadOrders();
    } else {
      showToast("Error updating order", "error");
    }
  } catch (error) {
    console.error("Update order error:", error);
    showToast("Error updating order", "error");
  }
}

function viewOrderDetails(orderId) {
  showToast("Viewing order: " + orderId, "info");
}

// ==================== USER CARTS ====================
async function loadUserCarts() {
  try {
    const res = await fetch(`${API}/admin/carts`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    const tbody = document.getElementById("cartsList");
    tbody.innerHTML = "";

    if (data.carts && data.carts.length > 0) {
      data.carts.forEach((cart) => {
        const itemsCount = cart.items?.length || 0;

        // Calculate cart total with proper product price
        const cartTotal =
          cart.items?.reduce((sum, item) => {
            const price = item.productId?.price || 0;
            const quantity = item.quantity || 0;
            return sum + price * quantity;
          }, 0) || 0;

        // Better date handling
        let lastUpdated = "N/A";
        try {
          if (cart.updatedAt) {
            const date = new Date(cart.updatedAt);
            if (!isNaN(date.getTime())) {
              lastUpdated = date.toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
            }
          }
        } catch (e) {
          console.warn("Date parsing error:", e);
        }

        tbody.innerHTML += `
          <tr>
            <td>${cart.userId?.email || "Unknown"}</td>
            <td>${itemsCount}</td>
            <td>₹${cartTotal.toLocaleString()}</td>
            <td>${lastUpdated}</td>
            <td><button class="btn info" onclick="viewCartDetails('${cart._id}', '${cart.userId?._id}')">View</button></td>
          </tr>
        `;
      });
    } else {
      tbody.innerHTML = "<tr><td colspan='5'>No active carts</td></tr>";
    }
  } catch (error) {
    console.error("Load carts error:", error);
    showToast("Error loading carts", "error");
  }
}

async function viewCartDetails(cartId, userId) {
  try {
    showToast("Loading cart details...", "info");

    const res = await fetch(`${API}/admin/carts/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();

    if (!data.success) {
      showToast("Error loading cart details", "error");
      return;
    }

    // Update modal content
    document.getElementById("cartUserEmail").textContent =
      `Cart Details - ${data.userEmail}`;

    const tbody = document.getElementById("cartDetailsList");
    tbody.innerHTML = "";

    if (data.items && data.items.length > 0) {
      let total = 0;

      data.items.forEach((item) => {
        const product = item.productId;
        if (!product) return;

        const price = product.price || 0;
        const quantity = item.quantity || 0;
        const subtotal = price * quantity;
        total += subtotal;

        tbody.innerHTML += `
          <tr>
            <td>
              <div style="display: flex; align-items: center; gap: 10px;">
                ${product.image ? `<img src="${product.image}" alt="${product.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" />` : ""}
                <span>${product.name}</span>
              </div>
            </td>
            <td>₹${price.toLocaleString()}</td>
            <td>${quantity}</td>
            <td>₹${subtotal.toLocaleString()}</td>
          </tr>
        `;
      });

      document.getElementById("cartTotal").textContent =
        `₹${total.toLocaleString()}`;
    } else {
      tbody.innerHTML = "<tr><td colspan='4'>No items in cart</td></tr>";
      document.getElementById("cartTotal").textContent = "₹0";
    }

    // Show modal
    document.getElementById("cartModal").classList.remove("hidden");
  } catch (error) {
    console.error("View cart details error:", error);
    showToast("Error loading cart details", "error");
  }
}

function closeCartModal() {
  document.getElementById("cartModal").classList.add("hidden");
}

// ==================== ACTIVITY LOG ====================
async function loadActivity() {
  try {
    const tbody = document.getElementById("activityList");
    if (tbody.children.length === 0) {
      showToast("Waiting for live activity...", "info");
    }
  } catch (error) {
    console.error("Load activity error:", error);
  }
}

// ==================== DARK MODE ====================
function toggleTheme() {
  document.body.classList.toggle("dark");
  localStorage.setItem(
    "admin-theme",
    document.body.classList.contains("dark") ? "dark" : "light",
  );
}

// Load saved theme on page load
(function () {
  const savedTheme = localStorage.getItem("admin-theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
  }
})();

// ==================== SOCKET.IO - LIVE UPDATES ====================
const BACKEND_URL = window.API_CONFIG?.BACKEND_URL || "http://localhost:5002";
const socket = io(BACKEND_URL, {
  auth: {
    token: token,
  },
});

socket.on("cart-activity", (data) => {
  console.log("🛒 LIVE CART ACTIVITY:", data);

  const tbody = document.getElementById("activityList");
  if (!tbody) return;

  const user = data.user || data.userEmail || data.userId || "Unknown";
  const product = data.product || data.productName || "Unknown";
  const action = data.action || "unknown";
  const quantity = data.quantity || 1;
  const time = new Date(data.time || Date.now()).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const row = `
    <tr>
      <td>${user}</td>
      <td>${product}</td>
      <td><span class="badge ${action === "add" ? "success" : "warning"}">${action.toUpperCase()}</span></td>
      <td>${quantity}</td>
      <td>${time}</td>
    </tr>
  `;

  tbody.insertAdjacentHTML("afterbegin", row);

  // Keep only last 20 activities
  while (tbody.children.length > 20) {
    tbody.removeChild(tbody.lastChild);
  }
});

socket.on("order-created", (data) => {
  console.log("📦 NEW ORDER:", data);
  showToast(`New order from ${data.userEmail || "User"}`, "info");
  if (
    document.getElementById("orders") &&
    !document.getElementById("orders").classList.contains("hidden")
  ) {
    loadOrders();
  }
});

socket.on("inventory-updated", (data) => {
  console.log("📊 INVENTORY UPDATE:", data);
  if (
    document.getElementById("products") &&
    !document.getElementById("products").classList.contains("hidden")
  ) {
    loadProducts();
  }
});

// ==================== INITIAL LOAD ====================
window.addEventListener("load", () => {
  loadDashboard();
  setupAdminMessaging();
});

// ==================== ADMIN MESSAGING SYSTEM ====================
let selectedUserId = null;
let adminUsers = [];

// Setup Socket.IO for real-time messages
function setupAdminMessaging() {
  if (!window.adminSocket) {
    // Initialize message ID tracker for deduplication
    if (!window.adminMessageIds) {
      window.adminMessageIds = new Set();
    }

    window.adminSocket = io(BACKEND_URL, {
      auth: {
        token: token,
      },
    });

    window.adminSocket.on("connect", () => {
      console.log("✅ Admin connected to real-time messaging");

      // Tell server this is an admin connection
      window.adminSocket.emit("join-admin-room");
    });

    // ✅ ERROR HANDLERS
    window.adminSocket.on("auth-error", (data) => {
      console.error("❌ Admin authentication failed:", data.message);
      showToast("Admin authentication failed. Please login again.", "error");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);
    });

    window.adminSocket.on("error", (data) => {
      console.error("❌ Admin socket error:", data.message);
      showToast(data.message, "error");
    });

    window.adminSocket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error);
      showToast("Connection error. Retrying...", "error");
    });

    // ✅ MAIN EVENT: Listen for new messages (user to admin and admin-to-user)
    window.adminSocket.on("new-message", (data) => {
      console.log("📨 NEW MESSAGE RECEIVED:", {
        from: data.from || data.senderId,
        text: data.text?.substring(0, 50),
        isAdmin: data.isAdminMessage,
        messageType: data.messageType,
        senderName: data.senderName,
      });

      // Deduplication
      const messageId = data._id || data.id || data.messageId;
      if (messageId && window.adminMessageIds.has(messageId)) {
        console.log("⏭️ Duplicate message ignored:", messageId);
        return;
      }

      if (messageId) {
        window.adminMessageIds.add(messageId);
        if (window.adminMessageIds.size > 500) {
          const idsArray = Array.from(window.adminMessageIds);
          window.adminMessageIds = new Set(idsArray.slice(-500));
        }
      }

      // Extract user ID (message FROM a user TO admin)
      const senderUserId = data.from || data.senderId;
      const senderName = data.senderName || data.fromName || "User";

      console.log("📨 Message from user:", senderUserId, senderName);
      showToast(`💬 ${senderName}: ${data.text?.substring(0, 30)}...`, "info");

      // Refresh conversation if this user is selected
      if (selectedUserId === senderUserId) {
        console.log(
          "🔄 Refreshing conversation for selected user:",
          senderUserId,
        );
        setTimeout(() => loadConversationHistory(selectedUserId), 100);
      } else {
        console.log("🔄 Reloading users list");
        // Load users again to update unread badges
        loadUsersForMessaging();
      }
    });

    // Fallback: Listen for user-admin-message (older naming)
    window.adminSocket.on("user-admin-message", (data) => {
      console.log("📨 USER-ADMIN-MESSAGE event:", data);
      showToast(`New message from ${data.senderName || "User"}`, "info");
      const senderUserId = data.senderId || data.from;
      if (selectedUserId === senderUserId) {
        loadConversationHistory(selectedUserId);
      } else {
        loadUsersForMessaging();
      }
    });

    // Listen for admin message sent confirmations
    window.adminSocket.on("admin-message-sent", (data) => {
      console.log("✅ Message sent confirmation:", data);

      if (data.message?._id) {
        window.adminMessageIds.add(data.message._id);
      }

      if (selectedUserId === data.receiverId) {
        loadConversationHistory(selectedUserId);
      }
    });

    // Listen for user read confirmations
    window.adminSocket.on("message-read-status", (data) => {
      console.log("✓ Message read by user:", data.userId);
      refreshMessagesList();
    });

    // Listen for message deletions
    window.adminSocket.on("message-deleted", (data) => {
      console.log("🗑️ Message deleted:", data.messageId);
      if (selectedUserId) {
        loadConversationHistory(selectedUserId);
      }
    });

    // Listen for user status changes (online/offline)
    window.adminSocket.on("user-status-changed", (data) => {
      console.log("👤 User status changed:", data);
      const { userId, isOnline, lastSeen } = data;

      // Update the user in the list
      const userIndex = adminUsers.findIndex((u) => u._id === userId);
      if (userIndex !== -1) {
        adminUsers[userIndex].isOnline = isOnline;
        adminUsers[userIndex].lastSeen = lastSeen;
        renderUsersList();
        console.log(
          `✅ Updated user status: ${userId} is ${isOnline ? "ONLINE" : "OFFLINE"}`,
        );
      }
    });

    window.adminSocket.on("disconnect", () => {
      console.log("❌ Admin disconnected from real-time");
      showToast("Disconnected from server. Attempting to reconnect...", "info");
    });
  }
}

// Load users list for admin messaging
async function loadUsersForMessaging() {
  try {
    console.log("👥 Loading users for messaging...");
    console.log("🔗 API URL:", `${API}/admin/messages/users/list`);

    const res = await fetch(`${API}/admin/messages/users/list`, {
      headers: { Authorization: `Bearer ${token}` }, // Use admin token variable
    });

    console.log("📡 Response status:", res.status);

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Error loading users:", errorText);
      throw new Error(`Failed to load users: ${res.status}`);
    }

    adminUsers = await res.json();
    console.log("✅ Loaded users:", adminUsers.length);
    console.log(
      "Users:",
      adminUsers.map((u) => u.fullName),
    );

    renderUsersList();
  } catch (err) {
    console.error("❌ Error loading users:", err);
    showToast("Failed to load users: " + err.message, "error");
  }
}

// Render users list
function renderUsersList() {
  const usersList = document.getElementById("usersList");
  const searchTerm =
    document.getElementById("userSearch")?.value.toLowerCase() || "";

  const filteredUsers = adminUsers.filter(
    (u) =>
      u.fullName.toLowerCase().includes(searchTerm) ||
      u.email.toLowerCase().includes(searchTerm),
  );

  usersList.innerHTML = filteredUsers
    .map((user) => {
      const statusColor = user.isOnline ? "#22c55e" : "#ef4444";
      const statusText = user.isOnline ? "🟢 Online" : "🔴 Offline";
      const lastSeenTime = user.lastSeen
        ? new Date(user.lastSeen).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Never";

      return `
    <div style="padding: 10px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; background: ${selectedUserId === user._id ? "#e0f2fe" : "#fff"};" onclick="selectUserForMessaging('${user._id}', '${user.fullName}')">
      <div style="font-weight: bold; display: flex; align-items: center; gap: 8px;">
        ${user.fullName}
        <span style="font-size: 0.75rem; color: white; background: ${statusColor}; padding: 2px 8px; border-radius: 4px;">${statusText}</span>
      </div>
      <div style="font-size: 0.85rem; color: #666;">${user.email}</div>
      <div style="font-size: 0.8rem; color: #999; margin-top: 4px;">Last seen: ${lastSeenTime}</div>
    </div>
  `;
    })
    .join("");
}

// Select user for messaging
async function selectUserForMessaging(userId, userName) {
  console.log("👤 User selected for messaging:", userId, userName);
  console.log("📝 Setting selectedUserId to:", userId);

  selectedUserId = userId;
  const headerEl = document.getElementById("selectedUserName");
  if (headerEl) {
    headerEl.textContent = `Message to: ${userName}`;
  }

  const inputEl = document.getElementById("messageInput");
  if (inputEl) {
    inputEl.focus();
  }

  // Reload users list to show selection
  renderUsersList();

  console.log("🔄 Loading conversation history for user:", userId);
  // Load conversation history
  await loadConversationHistory(userId);
}

// Load conversation history
async function loadConversationHistory(userId) {
  try {
    console.log("📨 Loading conversation with user:", userId);
    console.log("🔗 API URL:", `${API}/admin/messages/conversation/${userId}`);
    console.log("🔐 Token available?", !!token);
    console.log("🔐 Admin ID:", adminId);

    if (!token) {
      console.error("❌ No token available");
      showToast("No authentication token. Please login again.", "error");
      return;
    }

    if (!userId) {
      console.error("❌ No user ID provided");
      showToast("No user selected", "error");
      return;
    }

    const res = await fetch(`${API}/admin/messages/conversation/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("📡 Response status:", res.status);

    if (!res.ok) {
      const errorText = await res.text();
      console.error("❌ Error response:", errorText);
      console.error("Response status:", res.status);
      throw new Error(`Failed to load messages: ${res.status} - ${errorText}`);
    }

    const messages = await res.json();
    console.log("✅ Messages received from API:", messages);
    console.log("📊 Message count:", messages?.length || 0);

    if (!Array.isArray(messages)) {
      console.error("❌ Messages response is not an array:", typeof messages);
      showToast("Invalid response format from server", "error");
      return;
    }

    displayMessageHistory(messages);
  } catch (err) {
    console.error("❌ Error loading messages:", err);
    console.error("Error details:", err.message);
    showToast("Failed to load messages: " + err.message, "error");

    // Show error in the messages area
    const messagesList = document.getElementById("messagesList");
    if (messagesList) {
      messagesList.innerHTML = `<div style="padding: 20px; text-align: center; color: #ef4444;">❌ Error: ${err.message}</div>`;
    }
  }
}

// Display message history
function displayMessageHistory(messages) {
  const messagesList = document.getElementById("messagesList");

  console.log("🔍 Displaying messages for admin ID:", adminId);
  console.log("📊 Total messages to display:", messages?.length || 0);
  console.log("📍 messagesList element exists?", !!messagesList);
  console.log("Messages data:", messages);

  if (!messagesList) {
    console.error("❌ messagesList element not found!");
    showToast("Error: Messages container not found", "error");
    return;
  }

  if (!messages) {
    console.error("❌ Messages is null or undefined");
    messagesList.innerHTML =
      '<div style="padding: 20px; text-align: center; color: #999;">⚠️ Error loading messages</div>';
    return;
  }

  console.log("📊 DISPLAY MESSAGE HISTORY:");
  console.log("   Total messages:", messages.length);
  console.log("   Admin ID:", adminId);
  console.log("   Selected User:", selectedUserId);

  if (messages.length > 0) {
    console.log(
      "   Sample messages:",
      messages.slice(0, 3).map((m) => ({
        from: m.senderId?._id || m.senderId,
        type: m.messageType,
        text: m.text?.substring(0, 20),
      })),
    );
  }

  if (messages.length === 0) {
    console.log("ℹ️ No messages yet for this user");
    messagesList.innerHTML =
      '<div style="padding: 20px; text-align: center; color: #999;">💬 No messages yet. Start a conversation!</div>';
    return;
  }

  // Helper to escape HTML
  const escapeHtml = (str) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return (str || "").replace(/[&<>"']/g, (m) => map[m]);
  };

  messagesList.innerHTML = messages
    .map((msg) => {
      // Handle both populated and non-populated senderId
      const senderObj = msg.senderId;
      const senderId =
        typeof senderObj === "object" ? senderObj?._id : senderObj;
      const senderName =
        typeof senderObj === "object" ? senderObj?.fullName || "User" : "User";

      // Compare as strings to avoid ObjectId comparison issues
      // Check if message is from admin (senderId matches adminId OR message type is "admin")
      const isAdminMessage =
        String(senderId) === String(adminId) || msg.messageType === "admin";

      console.log("💬 Message:", {
        senderId: senderId,
        adminId: adminId,
        senderName: senderName,
        isAdmin: isAdminMessage,
        text: msg.text?.substring(0, 30) || "No text",
        messageType: msg.messageType,
      });

      // Determine background color and alignment based on sender
      const bgColor = isAdminMessage ? "#d1fae5" : "#f3f4f6";
      const textAlign = isAdminMessage ? "right" : "left";
      const flexJustify = isAdminMessage ? "flex-end" : "flex-start";

      // ✅ ESCAPE ALL USER INPUT
      const safeSenderName = escapeHtml(senderName);
      const safeText = escapeHtml(msg.text || "No text");
      const safeMessageId = escapeHtml(String(msg._id || ""));
      const safeTimestamp = new Date(msg.createdAt).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      return `
    <div style="margin-bottom: 10px; padding: 10px; border-radius: 4px; background: ${bgColor}; text-align: ${textAlign}; position: relative; word-wrap: break-word;">
      <div style="font-size: 0.85rem; color: #666; margin-bottom: 5px;">
        ${isAdminMessage ? "🔔 Admin" : "👤 " + safeSenderName}
      </div>
      <div style="margin: 5px 0; font-size: 0.95rem;">${safeText}</div>
      <div style="font-size: 0.75rem; color: #999; margin-top: 5px; display: flex; justify-content: ${flexJustify}; gap: 10px; align-items: center;">
        <span>${safeTimestamp}</span>
        ${isAdminMessage && msg._id ? `<button onclick="deleteAdminMessage('${safeMessageId}')" style="background: #ef4444; color: white; border: none; border-radius: 3px; padding: 2px 8px; font-size: 0.75rem; cursor: pointer;">🗑️ Delete</button>` : ""}
      </div>
    </div>
  `;
    })
    .join("");

  console.log("✅ Messages rendered. Count:", messages.length);

  // Scroll to bottom
  setTimeout(() => {
    messagesList.scrollTop = messagesList.scrollHeight;
  }, 50);
}

// Refresh messages list
async function refreshMessagesList() {
  if (selectedUserId) {
    await loadConversationHistory(selectedUserId);
  }
}

// Send message to user
async function sendAdminMessage() {
  const input = document.getElementById("messageInput");
  const text = input.value.trim();
  const messageType = document.getElementById("messageType").value;

  if (!text) {
    showToast("Please type a message", "warning");
    return;
  }

  if (!selectedUserId) {
    showToast("Please select a user first", "warning");
    return;
  }

  // ✅ Disable button while sending
  const sendBtn = event.target;
  const originalText = sendBtn.textContent;
  sendBtn.disabled = true;
  sendBtn.textContent = "Sending...";

  try {
    const res = await fetch(`${API}/admin/messages/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        receiverId: selectedUserId,
        text,
        messageType,
        isBroadcast: false,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to send message");
    }

    const message = await res.json();
    console.log("✅ Message sent:", message);

    // Track message ID for deduplication
    if (message._id) {
      window.adminMessageIds.add(message._id);
    }

    input.value = "";
    await refreshMessagesList();
    showToast("Message sent!", "success");
  } catch (err) {
    console.error("Error sending message:", err);
    showToast("Failed to send message: " + err.message, "error");
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = originalText;
  }
}

// Send broadcast message to all users
async function sendBroadcastMessage() {
  const input = document.getElementById("messageInput");
  const text = input.value.trim();
  const messageType = document.getElementById("messageType").value;

  if (!text) {
    showToast("Please type a message", "warning");
    return;
  }

  const confirmed = confirm(
    "Send this message to ALL users? This will broadcast to everyone.",
  );
  if (!confirmed) return;

  try {
    const res = await fetch(`${API}/admin/messages/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        text,
        messageType,
        isBroadcast: true,
      }),
    });

    if (!res.ok) throw new Error("Failed to send broadcast");

    console.log("✅ Broadcast sent to all users");
    input.value = "";
    showToast("Broadcast sent to all users!", "success");
  } catch (err) {
    console.error("Error sending broadcast:", err);
    showToast("Failed to send broadcast", "error");
  }
}

// Delete message
async function deleteAdminMessage(messageId) {
  if (!messageId) {
    showToast("Invalid message ID", "error");
    return;
  }

  if (!confirm("Are you sure you want to delete this message?")) return;

  try {
    console.log(`🗑️ Deleting message: ${messageId}`);
    const url = `${API}/admin/messages/${messageId}`;
    console.log(`DELETE request to: ${url}`);

    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log(`Delete response status: ${res.status}`);

    if (!res.ok) {
      let errorMessage = `HTTP ${res.status}`;

      // Try to parse error response
      try {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } else {
          errorMessage = `Server returned status ${res.status}`;
        }
      } catch (parseErr) {
        // Response wasn't valid JSON
        console.error("Could not parse error response", parseErr);
      }

      // If message not found, just remove from UI and show success
      if (res.status === 404) {
        console.log("⚠️ Message not found on server, removing from UI anyway");
        showToast("Message removed", "info");
        // Refresh to update UI
        if (selectedUserId) {
          await loadConversationHistory(selectedUserId);
        }
        return;
      }

      throw new Error(errorMessage);
    }

    console.log("✅ Message deleted successfully");
    showToast("Message deleted!", "success");

    // Refresh conversation
    if (selectedUserId) {
      await loadConversationHistory(selectedUserId);
    }
  } catch (err) {
    console.error("❌ Error deleting message:", err);
    showToast(`Failed to delete message: ${err.message}`, "error");
  }
}

// Add search functionality
document.addEventListener("DOMContentLoaded", () => {
  setupAdminMessaging();

  const userSearch = document.getElementById("userSearch");
  if (userSearch) {
    userSearch.addEventListener("input", () => {
      renderUsersList();
    });
  }
});

// ==================== USER-TO-USER MESSAGING ====================
// Get user's direct messages with another user
async function getUserDirectMessages(otherUserId) {
  try {
    const res = await fetch(`${API}/messages/conversation/${otherUserId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Failed to load conversation");

    const messages = await res.json();
    return messages || [];
  } catch (err) {
    console.error("Error loading direct messages:", err);
    return [];
  }
}

// Get list of users for direct messaging
async function getUsersForDirectMessaging() {
  try {
    const res = await fetch(`${API}/users/list`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Failed to load users");

    const users = await res.json();
    return users || [];
  } catch (err) {
    console.error("Error loading users:", err);
    return [];
  }
}

// Send direct message to user
async function sendDirectMessage(recipientId, messageText) {
  try {
    const res = await fetch(`${API}/messages/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        receiverId: recipientId,
        text: messageText,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || "Failed to send message");
    }

    const message = await res.json();
    console.log("✅ Direct message sent:", message);
    return message;
  } catch (err) {
    console.error("Error sending direct message:", err);
    showToast(`Failed to send message: ${err.message}`, "error");
    throw err;
  }
}

// REMOVED: Duplicate setupAdminMessaging() function - using the one defined at line 490 instead
