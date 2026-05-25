// ---------- Data (replace with API/DB in production) ----------
const DATA = {
  product: {
    id: "scalp",
    title: "JustLatest Scalp Massager, Solar Powered (Marble Pink)",
    price: 79,
    mrp: 119,
    images: [
      "img/g2.avif",
      "img/img1.webp",
      "img/brush5.avif",
      "img/brush1.avif",
      "img/brush2.avif",
    ],
  },

  fbt: [
    {
      id: "scalp",
      title: "JustLatest Scalp Massager (Marble Pink)",
      price: 79,
      img: "img/g5.avif",
      checked: true,
    },
    {
      id: "serum",
      title: "WishCare Hair Growth Serum Concentrate — 59 ml",
      price: 699,
      img: "img/brush.avif",
      checked: true,
    },
    {
      id: "oil",
      title: "Mielle Organics Rosemary Mint Hair Oil — 59 ml",
      price: 249,
      img: "img/brush3.avif",
      checked: true,
    },
  ],
  related: [
    {
      id: "r1",
      title: "Lifelong Rechargeable Head & Scalp Massager",
      price: 1899,
      img: "img/g1.avif",
    },
    {
      id: "r2",
      title: "SLOVIC Scalp Massager [3 Speed]",
      price: 2299,
      img: "img/img3.webp",
    },
    {
      id: "r3",
      title: "Fritzy Scalp Massage | For Hair",
      price: 1499,
      img: "img/p5.jpg",
    },
    {
      id: "r4",
      title: "TISSCARE Scalp Massager, Electric",
      price: 2599,
      img: "img/p4.jpg",
    },
    {
      id: "r5",
      title: "Arata Scalp Massager with Medical-Grade Silicone",
      price: 249,
      img: "img/g3.avif",
    },
    {
      id: "r6",
      title: "Houzaide Sparsh Scalp Massager — 96 Silicon Nodes",
      price: 349,
      img: "img/g4.avif",
    },
    {
      id: "r7",
      title: "JEKEMI Electric Scalp Massager",
      price: 2999,
      img: "img/img2.webp",
    },
  ],
};

DATA.fbt[0].img = DATA.product.images[0];

// ---------- Utilities ----------
const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const qs = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => [...r.querySelectorAll(s)];
const getCart = () => JSON.parse(localStorage.getItem("cart") || "[]");
const setCart = (c) => localStorage.setItem("cart", JSON.stringify(c));
const cartCountEl = () => qs("#cartCount");

function updateCartCount() {
  const count = getCart().reduce((n, it) => n + it.qty, 0);
  if (cartCountEl()) cartCountEl().textContent = String(count);
}

function addToCart(item) {
  const cart = getCart();
  const idx = cart.findIndex((x) => x.id === item.id);
  if (idx >= 0) {
    cart[idx].qty += item.qty || 1;
  } else {
    cart.push({
      id: item.id,
      title: item.title,
      price: item.price,
      qty: item.qty || 1,
      img: item.img || DATA.product.images?.[0],
    });
  }
  setCart(cart);
  updateCartCount();
}

function removeFromCart(id) {
  const cart = getCart().filter((x) => x.id !== id);
  setCart(cart);
  updateCartCount();
}

function setQty(id, qty) {
  const cart = getCart().map((x) =>
    x.id === id ? { ...x, qty: Math.max(1, qty) } : x
  );
  setCart(cart);
  updateCartCount();
}

// ---------- Page Boot ----------
document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();
  const page = document.body.dataset.page;
  if (page === "product") initProductPage();
  if (page === "cart") initCartPage();
  if (page === "checkout") initCheckoutPage();
});

// ---------- Product Page ----------
function initProductPage() {
  // Gallery
  const mainImg = qs("#mainImg");
  mainImg.src = DATA.product.images[0];

  const thumbs = qs("#thumbs");
  thumbs.innerHTML = ""; // clear any old content before rendering

  DATA.product.images.forEach((src, i) => {
    const img = document.createElement("img");
    img.src = src || "img/placeholder.jpg";
    img.alt = "thumbnail " + (i + 1);

    img.addEventListener("mouseover", () => {
      mainImg.style.opacity = "0";
      setTimeout(() => {
        mainImg.src = src || "img/placeholder.jpg";
        mainImg.style.opacity = "1";
      }, 200);

      // remove active from all thumbs
      thumbs
        .querySelectorAll("img")
        .forEach((t) => t.classList.remove("active"));
      img.classList.add("active");
    });

    if (i === 0) img.classList.add("active"); // first one active
    thumbs.appendChild(img);
  });

  // Details
  qs("#pTitle").textContent = DATA.product.title;
  qs("#pPrice").textContent = INR.format(DATA.product.price);
  qs("#pMRP").textContent = INR.format(DATA.product.mrp);
  qs("#ctaPrice").textContent = INR.format(DATA.product.price);

  // FBT, CTA, Related … (rest of your code stays same)

  // FBT
  renderFBT();

  // CTA buttons
  qs("#addMain").addEventListener("click", () => {
    addToCart({
      id: DATA.product.id,
      title: DATA.product.title,
      price: DATA.product.price,
      img: DATA.product.images[0],
    });
    alert("Added to cart: " + DATA.product.title);
  });
  qs("#buyNow").addEventListener("click", () => {
    addToCart({
      id: DATA.product.id,
      title: DATA.product.title,
      price: DATA.product.price,
      img: DATA.product.images[0],
    });
    window.location.href = "checkout.html";
  });

  // Related
  const rail = qs("#rail");
  DATA.related.forEach((p) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${p.img}" alt="${p.title}">
      <div style="font-weight:600;">${p.title}</div>
      <div class="muted">${INR.format(p.price)}</div>
      <button class="btn" style="padding:8px">Add to Cart</button>
    `;
    card.querySelector("button").addEventListener("click", () => {
      addToCart({ id: p.id, title: p.title, price: p.price, img: p.img });
      alert("Added: " + p.title);
    });
    rail.appendChild(card);
  });

  // rail nav
  qs("#prevBtn").addEventListener("click", () =>
    rail.scrollBy({ left: -400, behavior: "smooth" })
  );
  qs("#nextBtn").addEventListener("click", () =>
    rail.scrollBy({ left: 400, behavior: "smooth" })
  );
}

function renderFBT() {
  const grid = qs("#fbtGrid");
  const totalEl = qs("#fbtTotal");
  grid.innerHTML = "";
  DATA.fbt.forEach((item) => {
    const row = document.createElement("div");
    row.className = "fbt-item";
    row.innerHTML = `
      <img src="${item.img}" alt="${item.title}">
      <div>
        <label style="display:flex; gap:8px; align-items:flex-start;">
          <input type="checkbox" ${item.checked ? "checked" : ""} data-id="${
      item.id
    }"/>
          <div>
            <div style="font-weight:600;">${item.title}</div>
            <div class="muted">${INR.format(item.price)}</div>
          </div>
        </label>
      </div>
      <div style="font-weight:700;">+</div>
    `;
    grid.appendChild(row);
  });
  if (grid.lastElementChild)
    grid.lastElementChild.lastElementChild.textContent = "";

  grid.querySelectorAll('input[type="checkbox"]').forEach((cb) =>
    cb.addEventListener("change", (e) => {
      const id = e.target.getAttribute("data-id");
      const item = DATA.fbt.find((x) => x.id === id);
      if (item) item.checked = e.target.checked;
      updateFBTTotal();
    })
  );
  updateFBTTotal();

  qs("#addAll").addEventListener("click", () => {
    const selected = DATA.fbt.filter((x) => x.checked);
    selected.forEach((it) =>
      addToCart({ id: it.id, title: it.title, price: it.price, img: it.img })
    );
    // Also ensure main product is included
    addToCart({
      id: DATA.product.id,
      title: DATA.product.title,
      price: DATA.product.price,
      img: DATA.product.images[0],
    });
    alert(
      "Added to cart:\n• " +
        [DATA.product.title, ...selected.map((x) => x.title)].join("\n• ")
    );
    window.location.href = "cart.html";
  });
}

function updateFBTTotal() {
  const total = DATA.fbt
    .filter((x) => x.checked)
    .reduce((s, x) => s + x.price, DATA.product.price);
  qs("#fbtTotal").textContent = INR.format(total);
}

// ---------- Cart Page ----------
function initCartPage() {
  const body = qs("#cartBody");
  const totalEl = qs("#cartTotal");
  const relatedRail = qs("#cartRelated");

  function render() {
    const cart = getCart();
    body.innerHTML = "";
    let total = 0;
    cart.forEach((item) => {
      const sub = item.price * item.qty;
      total += sub;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="display:flex;align-items:center;gap:10px"><img src="${
          item.img
        }" alt="" style="width:48px;height:48px;border-radius:8px;object-fit:cover"> ${
        item.title
      }</td>
        <td>${INR.format(item.price)}</td>
        <td><input class="qty" type="number" min="1" value="${
          item.qty
        }" data-id="${item.id}"></td>
        <td>${INR.format(sub)}</td>
        <td class="actions"><button data-rm="${item.id}">Remove</button></td>
      `;
      body.appendChild(tr);
    });
    totalEl.textContent = INR.format(total);

    // events
    qsa("input.qty", body).forEach((inp) =>
      inp.addEventListener("change", (e) => {
        const id = e.target.dataset.id;
        setQty(id, parseInt(e.target.value || "1", 10));
        render();
      })
    );
    qsa("button[data-rm]", body).forEach((btn) =>
      btn.addEventListener("click", (e) => {
        const id = e.target.dataset.rm;
        removeFromCart(id);
        render();
      })
    );
  }
  render();

  // Related rail on cart
  DATA.related.slice(0, 5).forEach((p) => {
    const card = document.createElement("div");
    card.className = "card";
    card.style.width = "200px";
    card.innerHTML = `
      <img src="${p.img}" alt="${p.title}">
      <div style="font-weight:600;">${p.title}</div>
      <div class="muted">${INR.format(p.price)}</div>
      <button class="btn" style="padding:8px">Add</button>
    `;
    card.querySelector("button").addEventListener("click", () => {
      addToCart({ id: p.id, title: p.title, price: p.price, img: p.img });
      render();
    });
    relatedRail.appendChild(card);
  });

  qs("#toCheckout").addEventListener(
    "click",
    () => (window.location.href = "checkout.html")
  );
}

// ---------- Checkout Page ----------
function initCheckoutPage() {
  const summary = qs("#orderSummary");
  const totalEl = qs("#checkoutTotal");
  const cart = getCart();
  let total = 0;
  summary.innerHTML = "";
  cart.forEach((it) => {
    total += it.price * it.qty;
    const row = document.createElement("div");
    row.innerHTML = `<div style="display:flex;justify-content:space-between;gap:8px"><span>${
      it.title
    } × ${it.qty}</span><strong>${INR.format(
      it.price * it.qty
    )}</strong></div>`;
    summary.appendChild(row);
  });
  totalEl.textContent = INR.format(total);

  qs("#shipForm").addEventListener("submit", (e) => {
    e.preventDefault();
    // Simple success flow
    localStorage.setItem("lastOrderTotal", String(total));
    setCart([]);
    window.location.href = "confirmation.html";
  });
}

const rail = document.getElementById("rail");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

const scrollAmount = 220; // adjust if needed

nextBtn.addEventListener("click", () => {
  rail.scrollBy({ left: scrollAmount, behavior: "smooth" });
});

prevBtn.addEventListener("click", () => {
  rail.scrollBy({ left: -scrollAmount, behavior: "smooth" });
});
