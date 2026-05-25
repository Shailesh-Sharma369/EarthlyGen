// // // cartApi.js - Cart Management API
// // const API_URL = "http://localhost:5002/api";

// // function getAuthToken() {
// //   return localStorage.getItem("token");
// // }

// // export function isUserLoggedIn() {
// //   return !!getAuthToken() && localStorage.getItem("isLoggedIn") === "true";
// // }

// // // Add to Cart
// // export async function addProductToCart(product) {
// //   console.log("Adding to cart:", product);
// // }

// // export const addToCart = addProductToCart;

// // export async function addProductToCart(productId) {
// //   const token = localStorage.getItem("token");

// //   const res = await fetch("http://localhost:5002/api/cart/add", {
// //     method: "POST",
// //     headers: {
// //       "Content-Type": "application/json",
// //       Authorization: `Bearer ${token}`,
// //     },
// //     body: JSON.stringify({
// //       productId: productId,   // ✅ ONLY ID
// //       quantity: 1,
// //     }),
// //   });

// //   return res.json();
// // }

// // // Get Cart Items
// // export async function getCartItems() {
// //   const token = getAuthToken();
// //   if (!token) return { items: [] };

// //   const res = await fetch(`${API_URL}/cart`, {
// //     headers: { Authorization: `Bearer ${token}` },
// //   });
// //   return res.json();
// // }

// // // Alias for backward compatibility
// // export const getCart = getCartItems;

// // // Update Cart Item Quantity
// // export async function updateCartQuantity(itemId, quantity) {
// //   const token = getAuthToken();
// //   if (!token) throw new Error("Please login first");

// //   const response = await fetch(`${API_URL}/cart/${itemId}`, {
// //     method: "PUT",
// //     headers: {
// //       "Content-Type": "application/json",
// //       Authorization: `Bearer ${token}`,
// //     },
// //     body: JSON.stringify({ quantity }),
// //   });

// //   const data = await response.json();
// //   if (!data.success) throw new Error(data.message);
// //   return data;
// // }

// // // Remove from Cart
// // export async function removeFromCart(itemId) {
// //   const token = getAuthToken();
// //   if (!token) throw new Error("Please login first");

// //   const response = await fetch(`${API_URL}/cart/${itemId}`, {
// //     method: "DELETE",
// //     headers: { Authorization: `Bearer ${token}` },
// //   });

// //   const data = await response.json();
// //   if (!data.success) throw new Error(data.message);

// //   showToast("Item removed from cart", "success");
// //   return data;
// // }

// // // Clear Cart
// // export async function clearCart() {
// //   const token = getAuthToken();

// //   const res = await fetch(`${API_URL}/cart`, {
// //     method: "DELETE",
// //     headers: { Authorization: `Bearer ${token}` },
// //   });

// //   return res.json();
// // }
// // // Place Order
// // export async function placeOrder(orderData) {
// //   const token = getAuthToken();
// //   if (!token) throw new Error("Please login to place order");

// //   const response = await fetch(`${API_URL}/orders`, {
// //     method: "POST",
// //     headers: {
// //       "Content-Type": "application/json",
// //       Authorization: `Bearer ${token}`,
// //     },
// //     body: JSON.stringify(orderData),
// //   });

// //   const data = await response.json();
// //   if (!data.success) throw new Error(data.message);

// //   showToast("Order placed successfully!", "success");
// //   return data;
// // }

// // // Get User Orders
// // export async function getUserOrders() {
// //   const token = getAuthToken();
// //   if (!token) return { orders: [] };

// //   try {
// //     const response = await fetch(`${API_URL}/orders`, {
// //       headers: { Authorization: `Bearer ${token}` },
// //     });
// //     const data = await response.json();
// //     return data.success ? data : { orders: [] };
// //   } catch (err) {
// //     console.error("Get orders error:", err);
// //     return { orders: [] };
// //   }
// // }

// // // Helper Functions
// // function generateProductId(name) {
// //   return name
// //     .toLowerCase()
// //     .replace(/\s+/g, "-")
// //     .replace(/[^a-z0-9-]/g, "");
// // }

// // function updateCartBadge(count) {
// //   const badge = document.querySelector(".cart-badge, #cart-badge");
// //   if (badge) {
// //     badge.textContent = count;
// //     badge.style.display = count > 0 ? "inline-block" : "none";
// //   }
// // }

// // // Toast Notification
// // export function showToast(message, type = "success") {
// //   // Remove existing toasts
// //   const existingToast = document.querySelector(".cart-toast");
// //   if (existingToast) existingToast.remove();

// //   const toast = document.createElement("div");
// //   toast.className = `cart-toast toast-${type}`;
// //   toast.textContent = message;
// //   toast.style.cssText = `
// //     position: fixed;
// //     top: 20px;
// //     right: 20px;
// //     padding: 15px 25px;
// //     background: ${type === "success" ? "#10b981" : type === "error" ? "#ef4444" : "#3b82f6"};
// //     color: white;
// //     border-radius: 8px;
// //     box-shadow: 0 4px 12px rgba(0,0,0,0.15);
// //     z-index: 10000;
// //     font-family: sans-serif;
// //     font-size: 14px;
// //     animation: slideIn 0.3s ease-out;
// //   `;

// //   // Add animation styles if not present
// //   if (!document.getElementById("toast-animations")) {
// //     const style = document.createElement("style");
// //     style.id = "toast-animations";
// //     style.textContent = `
// //       @keyframes slideIn {
// //         from { transform: translateX(100%); opacity: 0; }
// //         to { transform: translateX(0); opacity: 1; }
// //       }
// //       @keyframes fadeOut {
// //         from { opacity: 1; }
// //         to { opacity: 0; }
// //       }
// //     `;
// //     document.head.appendChild(style);
// //   }

// //   document.body.appendChild(toast);

// //   setTimeout(() => {
// //     toast.style.animation = "fadeOut 0.3s ease-out";
// //     setTimeout(() => toast.remove(), 300);
// //   }, 3000);
// // }

// // cartApi.js - Cart Management API
// const API_URL = "http://localhost:5002/api";

// function getAuthToken() {
//   return localStorage.getItem("token");
// }

// export function isUserLoggedIn() {
//   return !!getAuthToken() && localStorage.getItem("isLoggedIn") === "true";
// }

// /* ================= ADD TO CART ================= */
// export async function addProductToCart(productId, quantity = 1) {
//   const token = getAuthToken();
//   if (!token) {
//     throw new Error("Please login first");
//   }

//   const res = await fetch(`${API_URL}/cart/add`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${token}`,
//     },
//     body: JSON.stringify({
//       productId,
//       quantity,
//     }),
//   });

//   return res.json();
// }

// // ✅ Alias (so old imports keep working)
// // cartApi.js
// const API_BASE = "http://localhost:5002/api";

// export const addProductToCart = async (productId) => {
//   const token = localStorage.getItem("token");

//   if (!token) {
//     alert("Please login first!");
//     window.location.href = "login1.html";
//     return;
//   }

//   try {
//     const res = await fetch(`${API_BASE}/cart/add`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`,
//       },
//       // 👇 IMPORTANT: Backend expects 'productId', NOT 'id' or '_id'
//       body: JSON.stringify({
//         productId: productId,
//         quantity: 1,
//       }),
//     });

//     const data = await res.json();

//     if (data.success) {
//       alert("Item added to cart! 🛒");
//       // Optional: Update cart count if you have a function for it
//       // updateCartCount();
//     } else {
//       console.error("Server Error:", data.message);
//       alert(data.message); // Will show "Product not found" if ID is wrong
//     }
//   } catch (err) {
//     console.error("Network Error:", err);
//     alert("Failed to connect to server");
//   }
// };

// /* ================= UPDATE QUANTITY ================= */
// export async function updateCartQuantity(itemId, quantity) {
//   const token = getAuthToken();
//   if (!token) throw new Error("Please login first");

//   const response = await fetch(`${API_URL}/cart/${itemId}`, {
//     method: "PUT",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${token}`,
//     },
//     body: JSON.stringify({ quantity }),
//   });

//   const data = await response.json();
//   if (!data.success) throw new Error(data.message);
//   return data;
// }

// /* ================= REMOVE ITEM ================= */
// export async function removeFromCart(itemId) {
//   const token = getAuthToken();
//   if (!token) throw new Error("Please login first");

//   const response = await fetch(`${API_URL}/cart/${itemId}`, {
//     method: "DELETE",
//     headers: { Authorization: `Bearer ${token}` },
//   });

//   const data = await response.json();
//   if (!data.success) throw new Error(data.message);

//   showToast("Item removed from cart", "success");
//   return data;
// }

// /* ================= CLEAR CART ================= */
// export async function clearCart() {
//   const token = getAuthToken();
//   if (!token) throw new Error("Please login first");

//   const res = await fetch(`${API_URL}/cart`, {
//     method: "DELETE",
//     headers: { Authorization: `Bearer ${token}` },
//   });

//   return res.json();
// }

// /* ================= ORDERS ================= */
// export async function placeOrder(orderData) {
//   const token = getAuthToken();
//   if (!token) throw new Error("Please login to place order");

//   const response = await fetch(`${API_URL}/orders`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${token}`,
//     },
//     body: JSON.stringify(orderData),
//   });

//   const data = await response.json();
//   if (!data.success) throw new Error(data.message);

//   showToast("Order placed successfully!", "success");
//   return data;
// }

// export async function getUserOrders() {
//   const token = getAuthToken();
//   if (!token) return { orders: [] };

//   try {
//     const response = await fetch(`${API_URL}/orders`, {
//       headers: { Authorization: `Bearer ${token}` },
//     });
//     const data = await response.json();
//     return data.success ? data : { orders: [] };
//   } catch (err) {
//     console.error("Get orders error:", err);
//     return { orders: [] };
//   }
// }

// /* ================= TOAST ================= */
// export function showToast(message, type = "success") {
//   const existingToast = document.querySelector(".cart-toast");
//   if (existingToast) existingToast.remove();

//   const toast = document.createElement("div");
//   toast.className = `cart-toast toast-${type}`;
//   toast.textContent = message;
//   toast.style.cssText = `
//     position: fixed;
//     top: 20px;
//     right: 20px;
//     padding: 15px 25px;
//     background: ${type === "success" ? "#10b981" : "#ef4444"};
//     color: white;
//     border-radius: 8px;
//     z-index: 10000;
//   `;

//   document.body.appendChild(toast);
//   setTimeout(() => toast.remove(), 3000);
// }

// cartApi.js - Cart Management API
const API_URL = window.API_CONFIG?.API_URL || "/api";

function getAuthToken() {
  return localStorage.getItem("token");
}

export function isUserLoggedIn() {
  return !!getAuthToken() && localStorage.getItem("isLoggedIn") === "true";
}

/* ================= ADD TO CART (Fixed) ================= */
export async function addProductToCart(productId, quantity = 1) {
  const token = getAuthToken();

  if (!token) {
    alert("Please login first!");
    window.location.href = "login1.html";
    return;
  }

  try {
    const res = await fetch(`${API_URL}/cart/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      // ✅ Correct Payload: Backend expects 'productId'
      body: JSON.stringify({
        productId: productId,
        quantity: quantity,
      }),
    });

    const data = await res.json();

    if (data.success) {
      // Use toast if available, otherwise alert
      if (typeof showToast === "function") {
        showToast("Item added to cart! 🛒", "success");
      } else {
        alert("Item added to cart! 🛒");
      }
    } else {
      console.error("Server Error:", data.message);
      // Show "Product not found" or other errors to user
      alert(data.message || "Failed to add to cart");
    }

    return data; // Return data just in case other files need it
  } catch (err) {
    console.error("Network Error:", err);
    alert("Failed to connect to server");
  }
}

/* ================= GET CART ITEMS ================= */
export async function getCartItems() {
  const token = getAuthToken();
  if (!token) return { success: false, items: [] };

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

// ✅ Alias for addToCart (used in index.html)
export const addToCart = addProductToCart;

/* ================= UPDATE CREDITS DISPLAY (REAL-TIME) ================= */
export async function updateCreditsDisplay() {
  try {
    const token = getAuthToken();
    if (!token) return;

    // Fetch cart to get latest eco-credits info
    const cartData = await getCartItems();

    if (!cartData.success) return;

    const { ecoCredits, discountAmount } = cartData;

    // Update profile page credits display (if on profile page)
    const profileDisplay = document.getElementById("profileCreditsDisplay");
    if (profileDisplay) {
      profileDisplay.textContent = ecoCredits || 0;
      console.log("✅ Profile credits updated:", ecoCredits);
    }

    // Update sidebar/nav credits display
    const navDisplay = document.getElementById("navCreditsDisplay");
    if (navDisplay) {
      navDisplay.textContent = ecoCredits || 0;
      console.log("✅ Nav credits updated:", ecoCredits);
    }

    // Show notification about discount
    if (discountAmount && discountAmount > 0) {
      console.log(`🌱 Eco-credits discount available: ₹${discountAmount}`);
    }
  } catch (err) {
    console.error("Failed to update credits display:", err);
  }
}

/* ================= UPDATE QUANTITY ================= */
export async function updateCartQuantity(itemId, quantity) {
  const token = getAuthToken();
  if (!token) throw new Error("Please login first");

  const response = await fetch(`${API_URL}/cart/${itemId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ quantity }),
  });

  const data = await response.json();
  if (!data.success) throw new Error(data.message);
  return data;
}

/* ================= REMOVE ITEM ================= */
export async function removeFromCart(itemId) {
  const token = getAuthToken();
  if (!token) throw new Error("Please login first");

  const response = await fetch(`${API_URL}/cart/${itemId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();
  if (!data.success) throw new Error(data.message);

  if (typeof showToast === "function") {
    showToast("Item removed from cart", "success");
  }
  return data;
}

/* ================= CLEAR CART ================= */
export async function clearCart() {
  const token = getAuthToken();
  if (!token) throw new Error("Please login first");

  const res = await fetch(`${API_URL}/cart`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.json();
}

/* ================= ORDERS ================= */
export async function placeOrder(orderData) {
  const token = getAuthToken();
  if (!token) throw new Error("Please login to place order");

  const response = await fetch(`${API_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(orderData),
  });

  const data = await response.json();
  if (!data.success) throw new Error(data.message);

  if (typeof showToast === "function") {
    showToast("Order placed successfully!", "success");
  }
  return data;
}

export async function getUserOrders() {
  const token = getAuthToken();
  if (!token) return { orders: [] };

  try {
    const response = await fetch(`${API_URL}/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    return data.success ? data : { orders: [] };
  } catch (err) {
    console.error("Get orders error:", err);
    return { orders: [] };
  }
}

/* ================= TOAST UTILITY ================= */
export function showToast(message, type = "success") {
  const existingToast = document.querySelector(".cart-toast");
  if (existingToast) existingToast.remove();

  const toast = document.createElement("div");
  toast.className = `cart-toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 25px;
    background: ${type === "success" ? "#10b981" : "#ef4444"};
    color: white;
    border-radius: 8px;
    z-index: 10000;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    font-family: system-ui, -apple-system, sans-serif;
    animation: slideIn 0.3s ease-out;
  `;

  // Animation Styles
  if (!document.getElementById("toast-styles")) {
    const style = document.createElement("style");
    style.id = "toast-styles";
    style.innerHTML = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
