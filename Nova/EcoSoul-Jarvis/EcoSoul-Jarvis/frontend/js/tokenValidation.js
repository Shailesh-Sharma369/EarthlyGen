// ==================== TOKEN VALIDATION UTILITY ====================
// This module handles token validation, expiry checks, and auto-logout

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} true if expired, false if valid
 */
function isTokenExpired(token) {
  if (!token) return true;

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

    // Check if token has exp claim
    if (decoded.exp) {
      const expiryTime = decoded.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      return currentTime > expiryTime;
    }

    return false;
  } catch (error) {
    console.error("Error checking token expiry:", error);
    return true;
  }
}

/**
 * Validate user token
 * @returns {boolean} true if user is properly logged in
 */
function validateUserToken() {
  const token = localStorage.getItem("token");
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  const userType = localStorage.getItem("userType");

  // Check all required fields
  if (!token || isLoggedIn !== "true" || userType !== "user") {
    console.warn("❌ User token validation failed");
    return false;
  }

  // Check if token is expired
  if (isTokenExpired(token)) {
    console.warn("⏰ User token is expired");
    localStorage.removeItem("token");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userId");
    localStorage.removeItem("userType");
    return false;
  }

  console.log("✅ User token is valid");
  return true;
}

/**
 * Validate admin token
 * @returns {boolean} true if admin is properly logged in
 */
function validateAdminToken() {
  const adminToken = localStorage.getItem("adminToken");
  const adminId = localStorage.getItem("adminId");
  const userType = localStorage.getItem("userType");

  // Check all required fields
  if (!adminToken || !adminId || userType !== "admin") {
    console.warn("❌ Admin token validation failed");
    return false;
  }

  // Check if token is expired
  if (isTokenExpired(adminToken)) {
    console.warn("⏰ Admin token is expired");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminLoggedIn");
    localStorage.removeItem("adminName");
    localStorage.removeItem("adminEmail");
    localStorage.removeItem("adminId");
    localStorage.removeItem("userType");
    return false;
  }

  console.log("✅ Admin token is valid");
  return true;
}

/**
 * Get token to use in API calls (user or admin)
 * @returns {string|null} Valid token or null
 */
function getValidToken() {
  // Check admin token first
  const adminToken = localStorage.getItem("adminToken");
  if (adminToken && !isTokenExpired(adminToken)) {
    return adminToken;
  }

  // Check user token
  const userToken = localStorage.getItem("token");
  if (userToken && !isTokenExpired(userToken)) {
    return userToken;
  }

  // No valid token
  return null;
}

/**
 * Setup automatic logout on token expiry
 * Checks token validity every 60 seconds
 */
function setupTokenExpiryCheck() {
  const checkInterval = 60000; // Check every 60 seconds

  setInterval(() => {
    const userToken = localStorage.getItem("token");
    const adminToken = localStorage.getItem("adminToken");

    // Check user token
    if (userToken && isTokenExpired(userToken)) {
      console.warn("🔐 User token expired - logging out");
      localStorage.removeItem("token");
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("userName");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userId");
      localStorage.removeItem("userType");
      window.location.href = "homepage.html";
    }

    // Check admin token
    if (adminToken && isTokenExpired(adminToken)) {
      console.warn("🔐 Admin token expired - logging out");
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminLoggedIn");
      localStorage.removeItem("adminName");
      localStorage.removeItem("adminEmail");
      localStorage.removeItem("adminId");
      localStorage.removeItem("userType");
      window.location.href = "admin-login.html";
    }
  }, checkInterval);
}

/**
 * Validate and setup token expiry checks
 * Call this on every page load
 */
function initializeTokenValidation() {
  // Validate current tokens
  const userValid = validateUserToken();
  const adminValid = validateAdminToken();

  // If page is admin and token not valid, redirect
  if (window.location.pathname.includes("admin") && !adminValid) {
    console.log("📍 Admin page detected but token invalid - redirecting");
    if (!window.location.pathname.includes("admin-login")) {
      window.location.href = "admin-login.html";
    }
  }

  // Setup periodic checks
  setupTokenExpiryCheck();
}

// Export for use in other files
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    isTokenExpired,
    validateUserToken,
    validateAdminToken,
    getValidToken,
    setupTokenExpiryCheck,
    initializeTokenValidation,
  };
}

// Also make available globally
window.tokenValidation = {
  isTokenExpired,
  validateUserToken,
  validateAdminToken,
  getValidToken,
  setupTokenExpiryCheck,
  initializeTokenValidation,
};
