// (function() {
//     console.log("🚀 Nova Assistant Initializing...");

//     if (document.getElementById('nova-container')) return;

//     // --- 1. CSS ---
//     const style = document.createElement('style');
//     style.innerHTML = `
//         #nova-container {
//             position: fixed; bottom: 20px; right: 20px; z-index: 10000;
//             display: flex; flex-direction: column; align-items: flex-end;
//             font-family: 'Segoe UI', sans-serif; pointer-events: none;
//         }
//         #nova-orb {
//             width: 70px; height: 70px; border-radius: 50%; pointer-events: auto;
//             background: radial-gradient(circle, #3b82f6, #000);
//             box-shadow: 0 0 15px #00faff; cursor: pointer; border: 2px solid rgba(255,255,255,0.2);
//             transition: transform 0.2s, box-shadow 0.2s;
//         }
//         #nova-orb:active { transform: scale(0.95); }
//         #nova-orb:hover { transform: scale(1.05); box-shadow: 0 0 30px #00faff; }

//         #nova-output {
//             background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(10px);
//             color: #00faff; padding: 12px; border-radius: 12px;
//             margin-bottom: 12px; max-width: 280px; display: none;
//             border: 1px solid rgba(59, 130, 246, 0.5); font-size: 13px;
//             pointer-events: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.4);
//         }
//         .jv-nova { color: #fff; margin-top: 4px; line-height: 1.4; }
//         .jv-user { color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
//     `;
//     document.head.appendChild(style);

//     // --- 2. HTML ---
//     const container = document.createElement('div');
//     container.id = 'nova-container';
//     container.innerHTML = `<div id="nova-output"></div><div id="nova-orb" title="Nova AI"></div>`;
//     document.body.appendChild(container);

//     // --- 3. LOGIC ---
//     const orb = document.getElementById("nova-orb");
//     const output = document.getElementById("nova-output");
//     let recognition = null;
//     let isBusy = false;
//     let silenceTimer = null;

//     function log(who, text) {
//         output.style.display = "block";
//         output.innerHTML = `<div class="jv-user">${who}</div><div class="jv-nova">${text}</div>`;
//         clearTimeout(silenceTimer);
//         silenceTimer = setTimeout(() => {
//             if(!isBusy) output.style.display = "none";
//         }, 6000);
//     }

//     function updateOrb(state) {
//         if (state === "listening") orb.style.boxShadow = "0 0 30px #00faff, inset 0 0 20px #00faff";
//         else if (state === "speaking") orb.style.boxShadow = "0 0 30px #00ff00, inset 0 0 20px #00ff00";
//         else if (state === "processing") orb.style.boxShadow = "0 0 30px #ff00ff, inset 0 0 20px #ff00ff";
//         else orb.style.boxShadow = "0 0 15px #00faff";
//     }

//     function speak(text) {
//         if (recognition) recognition.abort();
//         isBusy = true;
//         updateOrb("speaking");
//         log("Nova", text);

//         const u = new SpeechSynthesisUtterance(text);
//         u.lang = "en-IN";

//         u.onend = () => {
//             isBusy = false;
//             updateOrb("listening");
//             startMic();
//         };
//         u.onerror = () => { isBusy = false; startMic(); };
//         window.speechSynthesis.speak(u);
//     }

//     // --- SMART NAVIGATOR HELPER ---
//     function navigateToSection(sectionId) {
//         // Check if user is on Home Page (index.html or root /)
//         const isHomePage = window.location.pathname.endsWith("index.html") || window.location.pathname === "/";

//         if (isHomePage) {
//             // Smooth Scroll
//             const el = document.getElementById(sectionId);
//             if(el) el.scrollIntoView({ behavior: "smooth" });
//             else window.location.href = "index.html#" + sectionId;
//         } else {
//             // Redirect
//             window.location.href = "index.html#" + sectionId;
//         }
//     }

//     async function sendCommand(cmd) {
//         isBusy = true;
//         updateOrb("processing");
//         log("You", cmd);

//         try {
//             const res = await fetch("http://127.0.0.1:5000/command", {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({ command: cmd })
//             });
//             const data = await res.json();

//             // --- ACTION ROUTING ---

//             // 1. Pages
//             if (data.action === "navigate_shop") window.location.href = "products.html";
//             else if (data.action === "navigate_social") window.location.href = "social.html";
//             else if (data.action === "navigate_cart") window.location.href = "acc.html";
//             else if (data.action === "NAVIGATE_PAYMENT") {
//                 speak("Opening payment gateway.");
//                 setTimeout(() => window.location.href = "acc.html", 1000);
//                 return;
//             }

//             // 2. Sections (Using Helper)
//             else if (data.action === "navigate_home") navigateToSection("Home");
//             else if (data.action === "navigate_reviews") navigateToSection("review");
//             else if (data.action === "navigate_testimonials") navigateToSection("testimonials");
//             else if (data.action === "navigate_about") navigateToSection("About");
//             else if (data.action === "navigate_contact") navigateToSection("Contact");
//             else if (data.action === "navigate_offers") navigateToSection("review"); // Using Review section for offers as fallback

//             // 3. Shopping
//             else if (data.action === "ADD_TO_CART") {
//                 await handleCartAdd(data.payload.name, data.response);
//                 return;
//             }
//             else if (data.action === "stop_mic") {
//                 speak("Goodbye.");
//                 updateOrb("idle");
//                 return;
//             }

//             speak(data.response);

//         } catch (e) {
//             console.error(e);
//             speak("Server offline.");
//         }
//     }

//     async function handleCartAdd(name, voiceMsg) {
//         try {
//             const res = await fetch("http://localhost:5002/api/products");
//             const json = await res.json();
//             const product = json.products.find(p =>
//                 p.name.toLowerCase().includes(name.toLowerCase()) ||
//                 name.toLowerCase().includes(p.name.toLowerCase())
//             );

//             if (!product) {
//                 speak(`Sorry, ${name} not found.`);
//                 return;
//             }

//             const token = localStorage.getItem("token");
//             if (!token) {
//                 speak("Please login first.");
//                 return;
//             }

//             const addRes = await fetch("http://localhost:5002/api/cart/add", {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
//                 body: JSON.stringify({ productId: product._id, quantity: 1 })
//             });

//             const addData = await addRes.json();
//             if (addData.success) {
//                 speak(`${voiceMsg} Added to cart.`);
//                 if(window.updateCartBadge) window.updateCartBadge();
//             } else {
//                 speak("Could not add to cart.");
//             }
//         } catch (e) {
//             console.error(e);
//             speak("Error adding to cart.");
//         }
//     }

//     function startMic() {
//         if (isBusy) return;

//         const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
//         if (!SR) return alert("Mic not supported.");

//         recognition = new SR();
//         recognition.lang = "en-IN";
//         recognition.continuous = false;
//         recognition.interimResults = false;

//         recognition.onstart = () => updateOrb("listening");

//         recognition.onend = () => {
//             if (!isBusy) setTimeout(startMic, 200);
//         };

//         recognition.onresult = (e) => {
//             const text = e.results[0][0].transcript.trim();
//             if (text.length > 0) {
//                 recognition.abort();
//                 sendCommand(text);
//             }
//         };

//         try { recognition.start(); } catch(e){}
//     }

//     orb.addEventListener("click", () => {
//         speak("Nova Online.");
//     });

// })();

(function () {
  // 🔥 SAFEGUARD: Wait for HTML Body to load before running
  window.addEventListener("DOMContentLoaded", initNova);

  function initNova() {
    console.log("🚀 Nova Assistant Initializing...");

    // Prevent duplicate instances
    if (document.getElementById("nova-container")) return;

    // --- 1. CSS Injection ---
    const style = document.createElement("style");
    style.innerHTML = `
            #nova-container {
                position: fixed; bottom: 20px; right: 20px; z-index: 10000;
                display: flex; flex-direction: column; align-items: flex-end;
                font-family: 'Segoe UI', sans-serif; pointer-events: none;
            }
            #nova-orb {
                width: 60px; height: 60px; border-radius: 50%; pointer-events: auto;
                background: radial-gradient(circle, #3b82f6, #000);
                box-shadow: 0 0 15px #00faff; cursor: pointer; border: 2px solid rgba(255,255,255,0.2);
                transition: transform 0.2s, box-shadow 0.2s;
            }
            #nova-orb:active { transform: scale(0.95); }
            #nova-orb:hover { transform: scale(1.05); box-shadow: 0 0 30px #00faff; }
            
            #nova-output {
                background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(10px);
                color: #00faff; padding: 12px; border-radius: 12px;
                margin-bottom: 12px; max-width: 280px; display: none;
                border: 1px solid rgba(59, 130, 246, 0.5); font-size: 13px;
                pointer-events: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.4);
            }
            .jv-nova { color: #fff; margin-top: 4px; line-height: 1.4; }
            .jv-user { color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        `;
    document.head.appendChild(style);

    // --- 2. HTML Injection ---
    const container = document.createElement("div");
    container.id = "nova-container";
    container.innerHTML = `<div id="nova-output"></div><div id="nova-orb" title="Nova AI"></div>`;

    // This line used to crash if body wasn't ready. Now it's safe.
    document.body.appendChild(container);

    // --- 3. LOGIC ---
    const orb = document.getElementById("nova-orb");
    const output = document.getElementById("nova-output");
    let recognition = null;
    let isBusy = false;
    let silenceTimer = null;

    function log(who, text) {
      if (!output) return;
      output.style.display = "block";
      output.innerHTML = `<div class="jv-user">${who}</div><div class="jv-nova">${text}</div>`;
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        if (!isBusy && output) output.style.display = "none";
      }, 6000);
    }

    function updateOrb(state) {
      if (!orb) return;
      if (state === "listening")
        orb.style.boxShadow = "0 0 30px #00faff, inset 0 0 20px #00faff";
      else if (state === "speaking")
        orb.style.boxShadow = "0 0 30px #00ff00, inset 0 0 20px #00ff00";
      else if (state === "processing")
        orb.style.boxShadow = "0 0 30px #ff00ff, inset 0 0 20px #ff00ff";
      else orb.style.boxShadow = "0 0 15px #00faff";
    }

    function speak(text) {
      if (recognition) recognition.abort();
      isBusy = true;
      updateOrb("speaking");
      log("Nova", text);

      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-IN"; // Indian Accent

      u.onend = () => {
        isBusy = false;
        updateOrb("listening");
        startMic();
      };
      u.onerror = () => {
        isBusy = false;
        startMic();
      };
      window.speechSynthesis.speak(u);
    }

    // --- SMART NAVIGATOR HELPER ---
    function navigateToSection(sectionId) {
      const isHomePage =
        window.location.pathname.endsWith("index.html") ||
        window.location.pathname === "/";
      if (isHomePage) {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: "smooth" });
        else window.location.href = "index.html#" + sectionId;
      } else {
        window.location.href = "index.html#" + sectionId;
      }
    }

    async function sendCommand(cmd) {
      isBusy = true;
      updateOrb("processing");
      log("You", cmd);

      try {
        // NOTE: Confirm your Flask AI is running on Port 5000
        const res = await fetch("http://127.0.0.1:5000/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: cmd }),
        });
        const data = await res.json();

        // --- ACTION ROUTING ---
        if (data.action === "navigate_shop")
          window.location.href = "products.html";
        else if (data.action === "navigate_social")
          window.location.href = "social.html";
        else if (data.action === "navigate_cart")
          window.location.href = "acc.html";
        else if (data.action === "NAVIGATE_PAYMENT") {
          speak("Opening payment gateway.");
          setTimeout(() => (window.location.href = "acc.html"), 1000);
          return;
        }

        // Section Navigation
        else if (data.action === "navigate_home") navigateToSection("Home");
        else if (data.action === "navigate_reviews")
          navigateToSection("review");
        else if (data.action === "navigate_about") navigateToSection("About");
        // Shopping Actions (Port 5002)
        else if (data.action === "ADD_TO_CART") {
          await handleCartAdd(data.payload.name, data.response);
          return;
        } else if (data.action === "stop_mic") {
          speak("Goodbye.");
          updateOrb("idle");
          if (recognition) recognition.stop();
          return;
        }

        speak(data.response);
      } catch (e) {
        console.error(e);
        speak("I cannot connect to the brain server.");
      }
    }

    async function handleCartAdd(name, voiceMsg) {
      try {
        // NOTE: Confirm your Node E-commerce is running on Port 5002
        const API = window.API_CONFIG?.API_URL || "http://localhost:5002/api";
        const res = await fetch(`${API}/products`);
        const json = await res.json();

        // Safe check for product existence
        if (!json.products) throw new Error("No products found");

        const product = json.products.find(
          (p) =>
            p.name.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(p.name.toLowerCase()),
        );

        if (!product) {
          speak(`Sorry, I couldn't find ${name}.`);
          return;
        }

        const token = localStorage.getItem("token");
        if (!token) {
          speak("You need to login to add items.");
          return;
        }

        const API = window.API_CONFIG?.API_URL || "http://localhost:5002/api";
        const addRes = await fetch(`${API}/cart/add`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify({ productId: product._id, quantity: 1 }),
        });

        const addData = await addRes.json();
        if (addData.success) {
          speak(`${voiceMsg} Added to cart.`);
          // Updates Cart Badge if function exists
          if (typeof window.updateCartBadge === "function")
            window.updateCartBadge();
        } else {
          speak("Could not add to cart.");
        }
      } catch (e) {
        console.error("Cart Error:", e);
        speak("There was an error adding the item.");
      }
    }

    function startMic() {
      if (isBusy) return;

      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        console.log("Mic not supported in this browser");
        return;
      }

      recognition = new SR();
      recognition.lang = "en-IN";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => updateOrb("listening");

      // Auto-restart logic (Always listening)
      recognition.onend = () => {
        if (!isBusy) setTimeout(startMic, 500);
      };

      recognition.onresult = (e) => {
        const text = e.results[0][0].transcript.trim();
        if (text.length > 0) {
          recognition.stop(); // Stop listening while processing
          sendCommand(text);
        }
      };

      try {
        recognition.start();
      } catch (e) {
        // Ignore "already started" errors
      }
    }

    // Initialize click to start
    orb.addEventListener("click", () => {
      speak("Nova Online.");
    });
  }
})();
