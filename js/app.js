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

  // Convert an image src like "images/teak-1.jpg" into the WebP srcset spec
  // used inside <picture><source>. PNG inputs are also supported.
  function webpSourceFor(src) {
    if (!src) return null;
    const m = src.match(/^(.*?)\.(jpe?g|png)$/i);
    if (!m) return null;
    const base = m[1];
    return `${base}-480.webp 480w, ${base}-960.webp 960w, ${base}-1600.webp 1600w`;
  }

  // Build a <picture> element string with WebP source + fallback <img>.
  function pictureTag({ src, alt, sizes, loading = "lazy", extraImgAttrs = "" }) {
    const webp = webpSourceFor(src);
    const imgTag = `<img src="${src}" alt="${alt}" loading="${loading}" ${extraImgAttrs} onerror="this.style.display='none'" />`;
    if (!webp) return imgTag;
    return `<picture>
      <source type="image/webp" srcset="${webp}" sizes="${sizes || '100vw'}">
      ${imgTag}
    </picture>`;
  }

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
      const c = CONFIG.company;
      const line1 = c.addressLine1;
      const line2 = c.city + " " + c.postalCode + ", " + c.country;
      el.innerHTML = line1 + "<br>" + line2;
    });

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
          ${pictureTag({
            src: mainImage(p),
            alt: `${p.name} — chef knife and paring knife by Chef Knife, hand-forged in Sialkot Pakistan`,
            sizes: "(max-width: 860px) 100vw, 1280px",
            loading: "lazy"
          })}
        </div>
        <div class="product-card-body">
          <h3 class="product-card-title">${p.name}</h3>
          <p class="product-card-tagline">${p.tagline}</p>
          <p class="product-card-price">${p.price ? formatPKR(p.price) : '<span class="muted">Price coming soon</span>'}</p>
        </div>
      </a>
    `).join("");
  }

  // ---------- product detail page (static HTML, JS handles interactivity + price + gallery) ----------
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

    // Sync main image with first configured image, then render extras stacked below
    const mainImg = $("[data-main-image]");
    const images = (product.images && product.images.length) ? product.images : [product.image].filter(Boolean);
    if (mainImg && images.length > 0) {
      mainImg.src = images[0];
    }

    // Extra photos: stack additional views below the main image, same column width.
    // When the array has no additional images the container stays empty and is
    // hidden by the CSS `:empty` rule.
    const extras = $("[data-extra-images]");
    if (extras) {
      const additional = images.slice(1);
      extras.innerHTML = additional.map((src, i) => `
        <figure>
          ${pictureTag({
            src,
            alt: `${product.name} — additional view ${i + 2}`,
            sizes: "(max-width: 860px) 100vw, 50vw",
            loading: "lazy"
          })}
        </figure>
      `).join("");
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

    const ep = CONFIG.payment.easypaisa || {};
    const jc = CONFIG.payment.jazzcash || {};

    $$("[data-easypaisa-number]").forEach((el) => (el.textContent = ep.number || ""));
    $$("[data-easypaisa-name]").forEach((el) => (el.textContent = ep.accountName || ""));
    $$("[data-jazzcash-tillid]").forEach((el) => (el.textContent = jc.tillId || ""));
    $$("[data-jazzcash-name]").forEach((el) => (el.textContent = jc.shopName || ""));
    $$("[data-jazzcash-ussd]").forEach((el) => (el.textContent = jc.ussd || ""));

    const epQR = $("[data-easypaisa-qr]");
    const jcQR = $("[data-jazzcash-qr]");
    if (epQR && ep.qr) epQR.src = ep.qr;
    if (jcQR && jc.qr) jcQR.src = jc.qr;

  }

  // ---------- Trustpilot widgets ----------
  // Standard public Trustpilot template IDs (stable, documented).
  const TP_TEMPLATES = {
    "micro-star":  { id: "5419b732fbfb950b10de65e5", height: "24px"  },
    "micro-combo": { id: "5419b6a8b0d04a076446a9ad", height: "24px"  },
    "mini":        { id: "53aa8807dec7e10d38f59f32", height: "150px" },
    "horizontal":  { id: "5406e65db0d04a09e042d5fc", height: "32px"  },
    "carousel":    { id: "53aa8912dec7e10d38f59f36", height: "240px" },
    "hero":        { id: "5717796816f630043868e2e9", height: "350px" }
  };

  function hydrateTrustpilot() {
    const tp = CONFIG.trustpilot || {};
    const slots = $$("[data-tp-template]");
    if (!tp.businessUnitId || slots.length === 0) return;

    slots.forEach((slot) => {
      const key = slot.dataset.tpTemplate;
      const tpl = TP_TEMPLATES[key];
      if (!tpl) return;
      slot.classList.add("trustpilot-widget");
      slot.setAttribute("data-locale", tp.locale || "en-US");
      slot.setAttribute("data-template-id", tpl.id);
      slot.setAttribute("data-businessunit-id", tp.businessUnitId);
      slot.setAttribute("data-style-height", tpl.height);
      slot.setAttribute("data-style-width", "100%");
      slot.setAttribute("data-theme", "light");
      if (tp.reviewUrl && !slot.querySelector("a")) {
        const a = document.createElement("a");
        a.href = tp.reviewUrl;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = "Trustpilot";
        slot.appendChild(a);
      }
      slot.classList.add("is-active");
    });

    // Inject bootstrap script (Trustpilot scans the DOM on load).
    if (!document.querySelector("script[data-tp-bootstrap]")) {
      const s = document.createElement("script");
      s.src = "https://widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js";
      s.async = true;
      s.dataset.tpBootstrap = "1";
      document.body.appendChild(s);
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
    hydrateTrustpilot();
  });
})();
