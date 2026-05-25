/**
 * Cart Management API
 * Handles all cart operations with backend
 */

const API_URL = window.API_CONFIG?.API_URL || '/api';

// ========== AUTHENTICATION ==========
function getAuthToken() {
  return localStorage.getItem("token");
}

export function isUserLoggedIn() {
  const token = getAuthToken();
  return !!token && localStorage.getItem("isLoggedIn") === "true";
}

// ========== CART OPERATIONS ==========

/**
 * Add product to cart
 * @param {string} productId - Product ID to add
 * @param {number} quantity - Quantity to add (default: 1)
 * @returns {Promise<Object>} Response from server
 */
export async function addProductToCart(productId, quantity = 1) {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Please login first");
  }

  if (!productId) {
    throw new Error("Product ID is required");
  }

  const res = await fetch(`${API_URL}/cart/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      productId,
      quantity: Math.max(1, parseInt(quantity) || 1),
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to add to cart");
  }
  return data;
}

/**
 * Get all cart items
 * @returns {Promise<Object>} Cart data with items
 */
export async function getCartItems() {
  const token = getAuthToken();

  if (!token) {
    return { success: false, items: [] };
  }

  try {
    const res = await fetch(`${API_URL}/cart`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    return data.success ? data : { items: [] };
  } catch (err) {
    console.error("Get cart error:", err);
    return { items: [] };
  }
}

// Alias for backward compatibility
export const getCart = getCartItems;

/**
 * Update cart item quantity
 * @param {string} itemId - Cart item ID
 * @param {number} quantity - New quantity
 * @returns {Promise<Object>} Updated cart
 */
export async function updateCartQuantity(itemId, quantity) {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Please login first");
  }

  if (quantity < 1) {
    throw new Error("Quantity must be at least 1");
  }

  const res = await fetch(`${API_URL}/cart/${itemId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ quantity }),
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || "Failed to update quantity");
  }
  return data;
}

/**
 * Remove item from cart
 * @param {string} itemId - Cart item ID to remove
 * @returns {Promise<Object>} Updated cart
 */
export async function removeFromCart(itemId) {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Please login first");
  }

  const res = await fetch(`${API_URL}/cart/${itemId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || "Failed to remove item");
  }

  showToast("Item removed from cart", "success");
  return data;
}

/**
 * Clear entire cart
 * @returns {Promise<Object>} Response from server
 */
export async function clearCart() {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Please login first");
  }

  const res = await fetch(`${API_URL}/cart`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || "Failed to clear cart");
  }
  return data;
}

// ========== ORDER OPERATIONS ==========

/**
 * Place an order
 * @param {Object} orderData - Order details
 * @returns {Promise<Object>} Created order
 */
export async function placeOrder(orderData) {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Please login to place order");
  }

  const res = await fetch(`${API_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(orderData),
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || "Failed to place order");
  }

  showToast("Order placed successfully!", "success");
  return data;
}

/**
 * Get user's orders
 * @returns {Promise<Object>} Array of orders
 */
export async function getUserOrders() {
  const token = getAuthToken();

  if (!token) {
    return { success: false, orders: [] };
  }

  try {
    const res = await fetch(`${API_URL}/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    return data.success ? data : { orders: [] };
  } catch (err) {
    console.error("Get orders error:", err);
    return { orders: [] };
  }
}

/**
 * Get single order details
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Order details
 */
export async function getOrderDetails(orderId) {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Please login first");
  }

  const res = await fetch(`${API_URL}/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || "Failed to fetch order");
  }
  return data;
}

// ========== UTILITY FUNCTIONS ==========

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type: 'success', 'error', 'info'
 */
export function showToast(message, type = "success") {
  // Remove existing toast
  const existing = document.querySelector(".cart-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `cart-toast toast-${type}`;

  const colors = {
    success: "#10b981",
    error: "#ef4444",
    info: "#3b82f6",
  };

  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 25px;
    background: ${colors[type] || colors.info};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    font-family: sans-serif;
    font-size: 14px;
    animation: slideIn 0.3s ease-out;
  `;

  toast.textContent = message;
  document.body.appendChild(toast);

  // Add animation styles
  if (!document.getElementById("toast-styles")) {
    const style = document.createElement("style");
    style.id = "toast-styles";
    style.innerHTML = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  // Auto remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = "fadeOut 0.3s ease-out";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Update cart badge count
 * @param {number} count - Number of items in cart
 */
export function updateCartBadge(count) {
  const badge = document.querySelector(
    ".cart-badge, #cart-badge, [data-cart-count]",
  );
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? "inline-block" : "none";
  }
}

export default {
  addProductToCart,
  getCartItems,
  updateCartQuantity,
  removeFromCart,
  clearCart,
  placeOrder,
  getUserOrders,
  getOrderDetails,
  showToast,
  updateCartBadge,
  isUserLoggedIn,
  getAuthToken,
};
