const BASE_URL = window.API_CONFIG?.API_URL || "http://localhost:5002/api";

// Signup user
export async function signupUser({
  fullName,
  email,
  password,
  confirmPassword,
  source = "website",
}) {
  try {
    // Client-side validation
    if (!fullName || !email || !password || !confirmPassword) {
      return { success: false, message: "Please fill all required fields" };
    }

    if (password.length < 8) {
      return {
        success: false,
        message: "Password must be at least 8 characters long",
      };
    }

    if (password !== confirmPassword) {
      return { success: false, message: "Passwords do not match" };
    }
    const res = await fetch(`${BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        email,
        password,
        confirmPassword,
        source,
      }),
    });

    let data;
    try {
      const text = await res.text();
      console.log("📝 Signup response text:", text);
      data = JSON.parse(text);
    } catch (parseError) {
      console.error("JSON parse error in signup:", parseError);
      return {
        success: false,
        message:
          "Invalid response from server. Please check if backend is running correctly.",
      };
    }

    if (!res.ok) {
      return { success: false, message: data.message || "Signup failed" };
    }

    // Store auth data
    if (data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userType", "user");
      localStorage.setItem("userName", data.user.fullName);
      localStorage.setItem("userEmail", data.user.email);
      localStorage.setItem("userId", data.user.id);
    }

    return { success: true, ...data };
  } catch (err) {
    return { success: false, message: "Network error: " + err.message };
  }
}

// Signin user
export async function signinUser({ email, password }) {
  try {
    if (!email || !password) {
      return { success: false, message: "Email and password are required" };
    }

    const res = await fetch(`${BASE_URL}/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    console.log("🔐 Signin HTTP status:", res.status);

    // Parse response body only once
    let data;
    try {
      const text = await res.text();
      console.log("🔐 Response text:", text);
      data = JSON.parse(text);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return {
        success: false,
        message:
          "Invalid response from server. Please check if backend is running correctly.",
      };
    }

    // Check if response is OK after parsing
    if (!res.ok) {
      return {
        success: false,
        message: data.message || `Server error: ${res.status}`,
      };
    }

    // Store auth data
    if (data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userType", "user");
      localStorage.setItem("userName", data.user.fullName);
      localStorage.setItem("userEmail", data.user.email);
      localStorage.setItem("userId", data.user.id);
    }

    return { success: true, ...data };
  } catch (err) {
    console.error("Signin error:", err);
    return {
      success: false,
      message:
        "Network error: " +
        err.message +
        ". Check if backend server is running on port 5002.",
    };
  }
}

// Logout user - only clear USER keys, not admin keys
export function logoutUser() {
  // Remove only USER login keys, preserve admin keys if they exist
  localStorage.removeItem("token");
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("userName");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userId");
  localStorage.removeItem("loginTime");

  // Remove userType if it was "user" (but keep if "admin")
  const userType = localStorage.getItem("userType");
  if (userType === "user") {
    localStorage.removeItem("userType");
  }

  sessionStorage.clear();
  window.location.href = "homepage.html";
}

// Check if logged in
export function isUserLoggedIn() {
  const token = localStorage.getItem("token");
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  return !!(token && isLoggedIn === "true");
}

// Get auth token
export function getAuthToken() {
  return localStorage.getItem("token");
}

// Get current user info
export function getCurrentUser() {
  return {
    name: localStorage.getItem("userName"),
    email: localStorage.getItem("userEmail"),
    id: localStorage.getItem("userId"),
  };
}
