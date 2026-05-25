const GOOGLE_CLIENT_ID =
  "522896595616-ikkmokekho0ldg91hrg3udc9fvi9t8bc.apps.googleusercontent.com";
const API_BASE =
  window.API_CONFIG?.API_URL || `${window.location.protocol}//${window.location.host}/api`;

window.onload = () => {
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,

    // 👇 THIS IS GOOGLE CALLBACK (like github-callback.html)
    callback: async (response) => {
      try {
        const res = await fetch(`${API_BASE}/oauth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idToken: response.credential, // 🔑 GOOGLE TOKEN
          }),
        });

        const data = await res.json();

        if (data.success) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("isLoggedIn", "true");
          window.location.href = "index.html";
        } else {
          alert("Google login failed");
        }
      } catch (err) {
        alert("Something went wrong with Google login");
      }
    },
  });

  // Button click
  document.getElementById("googleLoginBtn").onclick = () => {
    google.accounts.id.prompt();
  };
};
