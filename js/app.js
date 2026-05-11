(function () {
  "use strict";

  const STORAGE_KEY = "pk_cart_v1";

  // ---------- helpers ----------
  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const formatPKR = (n) =>
    "PKR " + Number(n || 0).toLocaleString("en-PK");

  const getProduct = (id) => PRODUCTS.find((p) => p.id === id);
  const productUrl = (p) => (p.slug ? p.slug + ".html" : "product.html?id=" + encodeURIComponent(p.id));
  const mainImage  = (product) =>
    (product.images && product.images[0]) || product.image || "";

  // ---------- cart store ----------
  function loadCart() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    updateCartCount();
  }

  function addToCart(productId, qty) {
    qty = Math.max(1, Number(qty) || 1);
    const cart = loadCart();
    const existing = cart.find((line) => line.id === productId);
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({ id: productId, qty });
    }
    saveCart(cart);
  }

  function setQty(productId, qty) {
    const cart = loadCart();
    const line = cart.find((l) => l.id === productId);
    if (!line) return;
    if (qty <= 0) {
      saveCart(cart.filter((l) => l.id !== productId));
    } else {
      line.qty = qty;
      saveCart(cart);
    }
  }

  function removeFromCart(productId) {
    saveCart(loadCart().filter((l) => l.id !== productId));
  }

  function cartTotals() {
    const cart = loadCart();
    let subtotal = 0;
    let count = 0;
    const lines = cart.map((line) => {
      const product = getProduct(line.id);
      if (!product) return null;
      const lineTotal = product.price * line.qty;
      subtotal += lineTotal;
      count += line.qty;
      return { line, product, lineTotal };
    }).filter(Boolean);
    return { lines, subtotal, count };
  }

  function updateCartCount() {
    const { count } = cartTotals();
    $$("[data-cart-count]").forEach((el) => {
      el.textContent = String(count);
      el.classList.toggle("is-empty", count === 0);
    });
  }

  // ---------- shared branding / footer ----------
  function applyBranding() {
    $$("[data-brand]").forEach((el) => (el.textContent = CONFIG.brand));
    $$("[data-tagline]").forEach((el) => (el.textContent = CONFIG.tagline));
    $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

    $$("[data-company-legal]").forEach((el) => (el.textContent = CONFIG.company.legalName));
    $$("[data-company-address]").forEach((el) => {
      el.textContent = CONFIG.company.addressLine1 + " · " +
        CONFIG.company.city + " " + CONFIG.company.postalCode + ", " + CONFIG.company.country;
    });
    $$("[data-whatsapp-display]").forEach((el) => (el.textContent = CONFIG.whatsappDisplay || ""));

    $$("[data-whatsapp-link]").forEach((el) => {
      el.href = "https://wa.me/" + CONFIG.whatsapp;
      el.target = "_blank";
      el.rel = "noopener";
    });

    $$("[data-shipping-note]").forEach((el) => (el.textContent = CONFIG.shippingNote));
  }

  // ---------- homepage ----------
  function renderProductGrid() {
    const grid = $("[data-product-grid]");
    if (!grid) return;
    grid.innerHTML = PRODUCTS.map((p) => `
      <a class="product-card" href="${productUrl(p)}" aria-label="${p.name} — view details">
        <div class="product-card-media">
          <img src="${mainImage(p)}" alt="${p.name} — chef knife and paring knife by Chef Knife, made in Sialkot Pakistan" loading="lazy" onerror="this.classList.add('placeholder')" />
        </div>
        <div class="product-card-body">
          <h3 class="product-card-title">${p.name}</h3>
          <p class="product-card-tagline">${p.tagline}</p>
          <p class="product-card-price">${p.price ? formatPKR(p.price) : '<span class="muted">Price coming soon</span>'}</p>
        </div>
      </a>
    `).join("");
  }

  // ---------- product detail page (static HTML, JS handles interactivity + price) ----------
  function bindProductDetail() {
    const addBtn = $("[data-add-to-cart][data-product-id]");
    if (!addBtn) return;

    const productId = addBtn.dataset.productId;
    const product = getProduct(productId);
    if (!product) return;

    // Inject price from config (so user only edits config.js)
    const priceEl = $("[data-product-price]");
    if (priceEl && product.price) {
      priceEl.textContent = formatPKR(product.price);
    }

    const qtyInput = $("[data-qty-input]");
    const qtyDec   = $("[data-qty-dec]");
    const qtyInc   = $("[data-qty-inc]");

    if (qtyDec) qtyDec.addEventListener("click", () => {
      qtyInput.value = Math.max(1, (Number(qtyInput.value) || 1) - 1);
    });
    if (qtyInc) qtyInc.addEventListener("click", () => {
      qtyInput.value = (Number(qtyInput.value) || 1) + 1;
    });

    addBtn.addEventListener("click", () => {
      addToCart(productId, qtyInput ? (Number(qtyInput.value) || 1) : 1);
      location.href = "cart.html";
    });
  }

  // ---------- cart page ----------
  function renderCartPage() {
    const itemsEl = $("[data-cart-items]");
    if (!itemsEl) return;

    const { lines, subtotal } = cartTotals();

    if (lines.length === 0) {
      itemsEl.innerHTML = `<p class="empty">Your cart is empty. <a href="/#shop">Browse the chef knife sets</a>.</p>`;
      $("[data-cart-subtotal]").textContent = formatPKR(0);
      $("[data-cart-total]").textContent = formatPKR(0);
      const btn = $("[data-checkout-btn]");
      if (btn) {
        btn.classList.add("is-disabled");
        btn.addEventListener("click", (e) => e.preventDefault());
      }
      return;
    }

    itemsEl.innerHTML = lines.map(({ line, product, lineTotal }) => `
      <article class="cart-line" data-line="${product.id}">
        <a class="cart-line-media" href="${productUrl(product)}">
          <img src="${mainImage(product)}" alt="${product.name}" onerror="this.classList.add('placeholder')" />
        </a>
        <div class="cart-line-body">
          <h3><a href="${productUrl(product)}">${product.name}</a></h3>
          <p class="muted">${product.tagline}</p>
          <p class="cart-line-price">${formatPKR(product.price)}</p>
        </div>
        <div class="cart-line-qty">
          <div class="qty-control small">
            <button type="button" data-line-dec aria-label="Decrease">−</button>
            <input type="number" min="1" value="${line.qty}" data-line-qty />
            <button type="button" data-line-inc aria-label="Increase">+</button>
          </div>
          <button type="button" class="link-btn" data-line-remove>Remove</button>
        </div>
        <div class="cart-line-total">${formatPKR(lineTotal)}</div>
      </article>
    `).join("");

    $$(".cart-line").forEach((el) => {
      const id = el.dataset.line;
      $("[data-line-dec]", el).addEventListener("click", () => {
        setQty(id, (Number($("[data-line-qty]", el).value) || 1) - 1);
        renderCartPage();
      });
      $("[data-line-inc]", el).addEventListener("click", () => {
        setQty(id, (Number($("[data-line-qty]", el).value) || 1) + 1);
        renderCartPage();
      });
      $("[data-line-qty]", el).addEventListener("change", (e) => {
        setQty(id, Number(e.target.value) || 1);
        renderCartPage();
      });
      $("[data-line-remove]", el).addEventListener("click", () => {
        removeFromCart(id);
        renderCartPage();
      });
    });

    $("[data-cart-subtotal]").textContent = formatPKR(subtotal);
    $("[data-cart-total]").textContent = formatPKR(subtotal);
  }

  // ---------- checkout page ----------
  function renderCheckoutPage() {
    const form = $("[data-checkout-form]");
    if (!form) return;

    const { lines, subtotal } = cartTotals();

    if (lines.length === 0) {
      const recap = $("[data-recap-items]");
      if (recap) {
        recap.innerHTML = `<p class="empty">Your cart is empty. <a href="/#shop">Browse the chef knife sets</a>.</p>`;
      }
      form.classList.add("is-disabled");
      const submit = $("[data-submit-order]", form);
      if (submit) submit.disabled = true;
      $("[data-cart-subtotal]").textContent = formatPKR(0);
      $("[data-cart-total]").textContent = formatPKR(0);
      return;
    }

    $("[data-recap-items]").innerHTML = lines.map(({ product, line, lineTotal }) => `
      <div class="recap-line">
        <div class="recap-line-media">
          <img src="${mainImage(product)}" alt="${product.name}" onerror="this.classList.add('placeholder')" />
        </div>
        <div class="recap-line-body">
          <p class="recap-line-name">${product.name}</p>
          <p class="muted">Qty ${line.qty}</p>
        </div>
        <div class="recap-line-total">${formatPKR(lineTotal)}</div>
      </div>
    `).join("");

    $("[data-cart-subtotal]").textContent = formatPKR(subtotal);
    $("[data-cart-total]").textContent = formatPKR(subtotal);

    const itemsText = lines
      .map(({ product, line, lineTotal }) =>
        `${product.name} x${line.qty} - ${formatPKR(lineTotal)}`
      )
      .join(" | ");
    $("[data-order-items]").value = itemsText;
    $("[data-order-subtotal-hidden]").value = formatPKR(subtotal);
    $("[data-order-total-hidden]").value = formatPKR(subtotal);

    $$("[data-easypaisa]").forEach((el) => (el.textContent = CONFIG.payment.easypaisaNumber));
    $$("[data-jazzcash]").forEach((el) => (el.textContent = CONFIG.payment.jazzcashNumber));
    $$("[data-account-name]").forEach((el) => (el.textContent = CONFIG.payment.accountName));
    const epQR = $("[data-easypaisa-qr]");
    const jcQR = $("[data-jazzcash-qr]");
    if (epQR) epQR.src = CONFIG.payment.easypaisaQR;
    if (jcQR) jcQR.src = CONFIG.payment.jazzcashQR;

    const fileInput = $("[data-screenshot]", form);
    const hint = $("[data-upload-hint]", form);
    if (fileInput && hint) {
      fileInput.addEventListener("change", () => {
        const f = fileInput.files && fileInput.files[0];
        hint.textContent = f ? f.name : "Choose file — image or PDF";
      });
    }
  }

  // ---------- boot ----------
  document.addEventListener("DOMContentLoaded", function () {
    applyBranding();
    updateCartCount();
    renderProductGrid();
    bindProductDetail();
    renderCartPage();
    renderCheckoutPage();
  });
})();
