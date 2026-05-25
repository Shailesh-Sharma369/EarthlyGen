// const GOOGLE_CLIENT_ID="522896595616-8lrf81rf107oc7j6j5io9mv1bdrcaf3m.apps.googleusercontent.com";

// /* ===== COMMON LOGIN SUCCESS ===== */
// function onAuthSuccess(data) {
//   localStorage.setItem("token", data.token);
//   localStorage.setItem("isLoggedIn", "true");

//   // 🔑 Consistent keys (project-wide)
//   localStorage.setItem("userName", data.user.fullName);
//   localStorage.setItem("userEmail", data.user.email);
//   localStorage.setItem("userId", data.user.id);

//   window.location.href = "index.html";
// }

// /* ===== GOOGLE AUTH INIT ===== */
// function initGoogleAuth() {
//   if (!window.google || !google.accounts || !google.accounts.id) {
//     console.warn("Google SDK not ready, retrying...");
//     setTimeout(initGoogleAuth, 300);
//     return;
//   }

//   google.accounts.id.initialize({
//     client_id: GOOGLE_CLIENT_ID,
//     callback: handleGoogleResponse,
//   });

//   // Render button wherever .google-btn exists
//   document.querySelectorAll(".google-btn").forEach((el) => {
//     google.accounts.id.renderButton(el, {
//       theme: "outline",
//       size: "large",
//       width: 300,
//     });
//   });
// }

// // frontend/js/auth.js

// // export function initGoogleAuth() {
// //   console.log("Google auth initialized");
// // }

// /* ===== GOOGLE CALLBACK ===== */
// async function handleGoogleResponse(response) {
//   try {
//     if (!response || !response.credential) {
//       console.error("No Google credential", response);
//       alert("Google login failed (no credential)");
//       return;
//     }

//     const res = await fetch("http://localhost:5002/api/oauth/google", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ idToken: response.credential }),
//     });

//     const data = await res.json();

//     if (!res.ok || !data.success) {
//       console.error("Backend Google auth error:", data);
//       alert(data.message || "Google login failed");
//       return;
//     }

//     onAuthSuccess(data);
//   } catch (err) {
//     console.error("Google login exception:", err);
//     alert("Google login failed");
//   }
// }

// /* ===== LOGOUT ===== */
// function logout() {
//   localStorage.clear();
//   window.location.href = "homepage.html";
// }

// /* ===== INIT ===== */
// document.addEventListener("DOMContentLoaded", () => {
//   initGoogleAuth();
// });

// // frontend/js/auth.js

// const GOOGLE_CLIENT_ID =
//   "522896595616-8lrf81rf107oc7j6j5io9mv1bdrcaf3m.apps.googleusercontent.com";

// /* ===== GOOGLE AUTH INIT (EXPORT ONLY) ===== */
// export function initGoogleAuth() {
//   if (!window.google || !google.accounts || !google.accounts.id) {
//     console.warn("Google SDK not ready, retrying...");
//     setTimeout(initGoogleAuth, 300);
//     return;
//   }

//   google.accounts.id.initialize({
//     client_id: GOOGLE_CLIENT_ID,
//     callback: handleGoogleResponse,
//   });

//   const container = document.querySelector(".google-btn");
//   if (!container) {
//     console.error("❌ .google-btn container not found");
//     return;
//   }

//   google.accounts.id.renderButton(container, {
//     theme: "outline",
//     size: "large",
//     width: 300,
//   });
// }

// /* ===== GOOGLE CALLBACK (INTERNAL) ===== */
// async function handleGoogleResponse(response) {
//   try {
//     if (!response?.credential) {
//       alert("Google login failed (no credential)");
//       return;
//     }

//     const res = await fetch("http://localhost:5002/api/oauth/google", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ idToken: response.credential }),
//     });

//     const data = await res.json();

//     if (!res.ok || !data.success) {
//       alert(data.message || "Google login failed");
//       return;
//     }

//     // ✅ Save auth data
//     localStorage.setItem("token", data.token);
//     localStorage.setItem("isLoggedIn", "true");
//     localStorage.setItem("userName", data.user.fullName);
//     localStorage.setItem("userEmail", data.user.email);
//     localStorage.setItem("userId", data.user.id);

//     window.location.href = "index.html";
//   } catch (err) {
//     console.error("Google login exception:", err);
//     alert("Google login failed");
//   }
// }

// frontend/js/auth.js  (MODULE ONLY)

// const GOOGLE_CLIENT_ID =
//   "522896595616-8lrf81rf107oc7j6j5io9mv1bdrcaf3m.apps.googleusercontent.com";

// export function initGoogleAuth() {
//   if (!window.google || !google.accounts?.id) {
//     console.warn("Google SDK not ready, retrying...");
//     setTimeout(initGoogleAuth, 300);
//     return;
//   }

//   google.accounts.id.initialize({
//     client_id: GOOGLE_CLIENT_ID,
//     callback: handleGoogleResponse,
//   });

//   const container = document.querySelector(".google-btn");
//   if (!container) {
//     console.error("❌ .google-btn not found in HTML");
//     return;
//   }

//   google.accounts.id.renderButton(container, {
//     theme: "outline",
//     size: "large",
//     width: 300,
//   });
// }

// async function handleGoogleResponse(response) {
//   try {
//     if (!response?.credential) {
//       alert("Google login failed");
//       return;
//     }

//     const res = await fetch("http://localhost:5002/api/oauth/google", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ idToken: response.credential }),
//     });

//     const data = await res.json();

//     if (!data.success) {
//       alert(data.message || "Google login failed");
//       return;
//     }

//     localStorage.setItem("token", data.token);
//     localStorage.setItem("isLoggedIn", "true");
//     localStorage.setItem("userName", data.user.fullName);
//     localStorage.setItem("userEmail", data.user.email);
//     localStorage.setItem("userId", data.user.id);

//     window.location.href = "index.html";
//   } catch (err) {
//     alert("Google login error");
//   }
// }

const GOOGLE_CLIENT_ID =
  "522896595616-ikkmokekho0ldg91hrg3udc9fvi9t8bc.apps.googleusercontent.com";
let isGoogleLoading = false;
const BACKEND_BASE_URL =
  window.API_CONFIG?.BACKEND_URL || `${window.location.protocol}//${window.location.host}`;
const FACE_MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";

let faceModelsReady = false;
let faceStream = null;
let capturedFaceDescriptor = null;

/* ===== LOGIN SUCCESS ===== */
function onAuthSuccess(data) {
  // Save all auth data - USER KEYS (separate from admin)
  localStorage.setItem("token", data.token);
  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("userName", data.user.fullName || "User");
  localStorage.setItem("userEmail", data.user.email);
  localStorage.setItem("userId", data.user.id);
  localStorage.setItem("loginTime", new Date().toISOString());
  localStorage.setItem("userType", "user"); // Mark as user, not admin

  console.log("✅ Google login successful!");
  console.log("User:", data.user);

  // Redirect after 500ms (allow token to be saved)
  setTimeout(() => {
    window.location.href = "homepage.html";
  }, 500);
}

function setFaceStatus(message, isError = false) {
  const status = document.getElementById("faceStatus");
  if (!status) return;
  status.textContent = message || "";
  status.style.color = isError ? "#fecaca" : "#dcfce7";
}

async function ensureFaceModels() {
  if (faceModelsReady) return true;
  if (!window.faceapi) {
    throw new Error("face-api.js not loaded");
  }

  setFaceStatus("Loading face models...");
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(FACE_MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(FACE_MODEL_URL),
  ]);
  faceModelsReady = true;
  setFaceStatus("Face models ready.");
  return true;
}

async function startFaceCamera() {
  try {
    const video = document.getElementById("faceVideo");
    if (!video) return;

    if (faceStream) {
      video.srcObject = faceStream;
      return;
    }

    faceStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
    video.srcObject = faceStream;
    await video.play();
    setFaceStatus("Camera started. Center your face and capture.");
  } catch (error) {
    console.error("Camera start error:", error);
    setFaceStatus("Could not start camera. Check camera permission.", true);
  }
}

async function captureFaceDescriptor() {
  try {
    const email = document.getElementById("faceEmail")?.value?.trim();
    const video = document.getElementById("faceVideo");
    const canvas = document.getElementById("faceCanvas");
    if (!video || !canvas) return;

    if (!email) {
      setFaceStatus("Enter email first.", true);
      return null;
    }

    await ensureFaceModels();
    if (!faceStream) {
      await startFaceCamera();
    }

    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection || !detection.descriptor) {
      setFaceStatus("No face detected. Ensure face is visible and try again.", true);
      return null;
    }

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    capturedFaceDescriptor = Array.from(detection.descriptor);
    setFaceStatus("Face captured successfully.");
    return capturedFaceDescriptor;
  } catch (error) {
    console.error("Face capture error:", error);
    setFaceStatus(`Face capture failed: ${error.message}`, true);
    return null;
  }
}

async function registerFace() {
  try {
    const email = document.getElementById("faceEmail")?.value?.trim();
    const password = document.getElementById("facePassword")?.value || "";

    if (!email || !password) {
      setFaceStatus("Email and password are required for face registration.", true);
      return;
    }

    const descriptor = capturedFaceDescriptor || (await captureFaceDescriptor());
    if (!descriptor) return;

    setFaceStatus("Registering face...");
    const res = await fetch(`${BACKEND_BASE_URL}/api/auth/face/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        faceDescriptor: descriptor,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Face registration failed");
    }

    setFaceStatus("Face registered. You can now login with face.");
  } catch (error) {
    console.error("Face register error:", error);
    setFaceStatus(error.message || "Face registration failed", true);
  }
}

async function loginWithFace() {
  try {
    const email = document.getElementById("faceEmail")?.value?.trim();
    if (!email) {
      setFaceStatus("Email is required for face login.", true);
      return;
    }

    const descriptor = capturedFaceDescriptor || (await captureFaceDescriptor());
    if (!descriptor) return;

    setFaceStatus("Verifying face and signing in...");
    const res = await fetch(`${BACKEND_BASE_URL}/api/auth/face/signin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email,
        faceDescriptor: descriptor,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Face login failed");
    }

    setFaceStatus("Face matched. Logging you in...");
    onAuthSuccess(data);
  } catch (error) {
    console.error("Face login error:", error);
    setFaceStatus(error.message || "Face login failed", true);
  }
}

function bindFaceAuthEvents() {
  const startBtn = document.getElementById("faceStartCamera");
  const captureBtn = document.getElementById("faceCapture");
  const registerBtn = document.getElementById("faceRegisterBtn");
  const loginBtn = document.getElementById("faceLoginBtn");

  if (!startBtn || !captureBtn || !registerBtn || !loginBtn) {
    return;
  }

  startBtn.addEventListener("click", startFaceCamera);
  captureBtn.addEventListener("click", captureFaceDescriptor);
  registerBtn.addEventListener("click", registerFace);
  loginBtn.addEventListener("click", loginWithFace);
}

/* ===== INIT GOOGLE ===== */
function initGoogleAuth() {
  // Wait for Google SDK to load
  if (!window.google?.accounts?.id) {
    console.log("⏳ Google SDK not ready yet, retrying...");
    setTimeout(initGoogleAuth, 300);
    return;
  }

  console.log("✅ Google SDK loaded, initializing...");

  try {
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleResponse,
      auto_select: false,
      itp_support: true,
    });

    // Render Google button on all .google-btn elements
    document.querySelectorAll(".google-btn").forEach((el) => {
      if (el.children.length === 0) {
        google.accounts.id.renderButton(el, {
          theme: "outline",
          size: "large",
          width: 300,
          locale: "en",
        });
      }
    });
    console.log("✅ Google button rendered");
  } catch (err) {
    console.error("❌ Error initializing Google:", err);
  }
}

/* ===== CALLBACK ===== */
async function handleGoogleResponse(response) {
  if (isGoogleLoading) return;
  isGoogleLoading = true;

  try {
    console.log("🔐 Google callback received");

    if (!response?.credential) {
      throw new Error("No credential received from Google");
    }

    // Show loading indicator
    const buttons = document.querySelectorAll(".google-btn");
    buttons.forEach((btn) => (btn.style.opacity = "0.5"));

    console.log("📤 Sending Google token to backend...");
    const res = await fetch(`${BACKEND_BASE_URL}/api/oauth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ idToken: response.credential }),
    });

    console.log("📥 Backend response status:", res.status);

    if (!res.ok) {
      const errorText = await res.text();
      console.error("❌ Backend error response:", errorText);

      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.message || `HTTP ${res.status}`);
      } catch (e) {
        throw new Error(`Server error (${res.status})`);
      }
    }

    const data = await res.json();
    console.log("✅ Backend response received:", data);

    if (data.success) {
      onAuthSuccess(data);
    } else {
      throw new Error(data.message || "Google login failed");
    }
  } catch (err) {
    console.error("❌ Google login error:", err);

    // Reset button opacity
    const buttons = document.querySelectorAll(".google-btn");
    buttons.forEach((btn) => (btn.style.opacity = "1"));

    // Show user-friendly error with helpful instructions
    let errorMsg = "❌ Google login failed";

    if (
      err.message.includes("ORIGIN NOT AUTHORIZED") ||
      err.message.includes("invalid_token_audience") ||
      err.message.includes("401")
    ) {
      errorMsg =
        "❌ GOOGLE CLOUD SETUP REQUIRED!\n\nSteps to fix:\n1. Go to console.cloud.google.com\n2. APIs & Services -> Credentials\n3. Click your OAuth 2.0 Client ID\n4. Add to 'Authorized JavaScript origins':\n   • http://localhost:5002\n   • http://127.0.0.1:5002\n   • http://localhost:5500\n   • http://127.0.0.1:5500\n5. Click Save\n6. Wait 2-3 minutes\n7. Reload this page";
    } else if (err.message.includes("credential")) {
      errorMsg = "❌ Google sign-in cancelled. Please try again.";
    } else {
      errorMsg = "❌ " + err.message;
    }

    alert(errorMsg);
  } finally {
    isGoogleLoading = false;
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initGoogleAuth();
    bindFaceAuthEvents();
  });
} else {
  initGoogleAuth();
  bindFaceAuthEvents();
}
