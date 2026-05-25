import { addProductToCart } from "./cartApi.js";

document.addEventListener("DOMContentLoaded", async () => {
  const API_URL = window.API_CONFIG?.API_URL || '/api';
  const res = await fetch(`${API_URL}/products`);
  const data = await res.json();

  const grid = document.getElementById("productsGrid");
  grid.innerHTML = "";

  window.__ruhiProductCache = window.__ruhiProductCache || {};

  data.products.forEach(product => {
    const normalized = normalizeProduct(product);
    window.__ruhiProductCache[normalized.product_id] = normalized;

    grid.innerHTML += `
      <div class="product-card" data-product-id="${normalized.product_id}">
        <img src="${product.image}">
        <h3>${product.name}</h3>
        <p>₹${product.price}</p>
        <div class="eco-status-container" id="eco-status-${normalized.product_id}"></div>
        <button class="add-to-cart-btn" data-id="${normalized.product_id}">
          Add to Cart 🛒
        </button>
      </div>
    `;
  });

  // Automatically verify each loaded product using full product payload.
  if (window.verifyProductEco) {
    data.products.forEach(product => {
      const fullProduct = normalizeProduct(product);
      document.dispatchEvent(new CustomEvent("ruhi:product-loaded", { detail: { product: fullProduct } }));
      fetchEcoStatus(fullProduct);
    });
  }
});

function normalizeProduct(product) {
  return {
    product_id: String(product.product_id || product._id || product.id || ""),
    name: String(product.name || ""),
    materials: product.materials || product.material || product.category || "",
    packaging: product.packaging || product.package_type || "",
    transport: product.transport || product.transport_info || "",
    description: String(product.description || product.eco_impact || ""),
    certificate_name: String(product.certificate_name || ""),
    certificate_id: String(product.certificate_id || ""),
    issuing_authority: String(product.issuing_authority || ""),
    proof_url: String(product.proof_url || ""),
    user_id: product.user_id || product.seller_id || "",
    eco_checked: Boolean(product.eco_checked)
  };
}

function ecoStatusDisplay(status) {
  if (status === "certified") {
    return { label: "✅ Certified Eco", color: "#34d399" };
  }
  if (status === "eco_verified") {
    return { label: "🌱 Eco Friendly", color: "#8bc34a" };
  }
  if (status === "partially_eco") {
    return { label: "⚠️ Partially Eco", color: "#fbbf24" };
  }
  return { label: "❌ Not Verified", color: "#f87171" };
}

/**
 * Fetch and display eco verification status for a product
 */
async function fetchEcoStatus(product) {
  try {
    const statusDiv = document.getElementById(`eco-status-${product.product_id}`);
    if (!statusDiv) return;

    let data = null;
    if (window.verifyProductEco) {
      data = await window.verifyProductEco(product, { auto: true, silent: true, source: "loaded" });
    }

    if (!data || !data.eco_status) {
      const API_URL = window.API_CONFIG?.API_URL || '/api';
      const response = await fetch(`${API_URL}/verify/eco/status/${product.product_id}`);
      data = await response.json();
    }

    if (data && (data.success || data.eco_status)) {
      const status = data.eco_status || data.overall_status || "not_verified";
      const score = Number(data.eco_score || 0);
      const trust = data.trust_level || "Basic";
      const badge = ecoStatusDisplay(status);

      const trustTone = trust === "Eco Advocate" ? "#34d399" : trust === "Trusted" ? "#60a5fa" : "#cbd5e1";

      if (!statusDiv) return;
      
      statusDiv.innerHTML = `
        <div style="font-size: 12px; margin: 6px 0; padding: 6px 8px; border-radius: 8px; background: rgba(15,23,42,0.55); color: ${badge.color}; text-align: left; border: 1px solid rgba(148,163,184,0.25);">
          <div style="font-weight:700;">${badge.label}</div>
          <div style="margin-top:4px;color:#cbd5e1;">🌱 Eco Score: ${score}</div>
          <div style="margin-top:2px;color:${trustTone};">👤 Seller Trust: ${trust}</div>
        </div>
      `;
    }
  } catch (error) {
    console.error(`Failed to fetch eco status for product ${product.product_id}:`, error);
  }
}

// Expose eco verification to window so other scripts can call it
window.fetchProductEcoStatus = fetchEcoStatus;

document.addEventListener("click", e => {
  if (e.target.classList.contains("add-to-cart-btn")) {
    addProductToCart(e.target.dataset.id); // ✅ ONLY _id
  }
});
