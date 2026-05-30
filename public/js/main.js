/* ==========================================================================
   THREE_HEARTS HANDMADES - Client Engine
   ========================================================================== */

// Global App State
let APP_STATE = {
  products: [],
  selectedProduct: null,
  currentQty: 1,
  activeSlide: 0,
  activeTestimonial: 0,
  whatsAppNum: "917010085235", // Configured from .env (fallback)
  cart: [] // E-commerce Shopping Cart list
};

// DOM Init
document.addEventListener("DOMContentLoaded", () => {
  initLoadingScreen();
  initMouseFollower();
  initWoolParticles();
  initHeroSlider();
  initTestimonialSlider();
  fetchProducts();
  setupEventListeners();
  initRevealAnimations();
  initRippleEffect();
  setupReviewStars();
  setupReviewForm();
  loadCart(); // Load persisted cart
});

// 1. Loading Screen
function initLoadingScreen() {
  const loader = document.getElementById("loading-screen");
  window.addEventListener("load", () => {
    setTimeout(() => {
      loader.style.opacity = "0";
      loader.style.visibility = "hidden";
    }, 600); // Give it a neat smooth entrance
  });

  // Fallback if load event takes too long (e.g. slow network assets)
  setTimeout(() => {
    loader.style.opacity = "0";
    loader.style.visibility = "hidden";
  }, 3000);
}

// 2. Custom Mouse Follower
function initMouseFollower() {
  const follower = document.getElementById("mouse-follower");
  if (!follower) return;

  let mouseX = 0, mouseY = 0;
  let followerX = 0, followerY = 0;
  let isMoving = false;

  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!isMoving) {
      follower.style.opacity = "1";
      isMoving = true;
    }
  });

  document.addEventListener("mouseleave", () => {
    follower.style.opacity = "0";
    isMoving = false;
  });

  // Smooth interpolation (Lag follow)
  function updatePosition() {
    let dx = mouseX - followerX;
    let dy = mouseY - followerY;
    
    followerX += dx * 0.12;
    followerY += dy * 0.12;
    
    follower.style.left = `${followerX}px`;
    follower.style.top = `${followerY}px`;
    
    requestAnimationFrame(updatePosition);
  }
  updatePosition();

  // Hover states
  const interactables = "a, button, .product-card, .dot, .t-dot, .thumb-img, .color-radio-label, .qty-btn";
  document.addEventListener("mouseover", (e) => {
    if (e.target.closest(interactables)) {
      follower.classList.add("active");
    }
  });

  document.addEventListener("mouseout", (e) => {
    if (e.target.closest(interactables)) {
      follower.classList.remove("active");
    }
  });
}

// 3. Floating Wool/Heart Canvas Particles
function initWoolParticles() {
  const canvas = document.getElementById("particles-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener("resize", () => {
    width = (canvas.width = window.innerWidth);
    height = (canvas.height = window.innerHeight);
  });

  const particles = [];
  const particleCount = 20;

  // Pastel colors list matching our tokens
  const colors = [
    "rgba(255, 229, 236, 0.4)", // light pink
    "rgba(242, 231, 245, 0.4)", // light lavender
    "rgba(252, 225, 212, 0.35)", // light peach
    "rgba(253, 248, 245, 0.5)"  // cream
  ];

  class Particle {
    constructor() {
      this.reset();
      this.y = Math.random() * height;
    }

    reset() {
      this.x = Math.random() * width;
      this.y = height + 20;
      this.size = Math.random() * 25 + 15; // 15px to 40px radius
      this.speedY = -(Math.random() * 0.5 + 0.2); // Slow drift upward
      this.speedX = Math.random() * 0.4 - 0.2; // Slight wave
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.type = Math.random() > 0.45 ? "wool" : (Math.random() > 0.4 ? "heart" : "ring");
      this.angle = Math.random() * Math.PI * 2;
      this.spinSpeed = Math.random() * 0.01 - 0.005;
    }

    update() {
      this.y += this.speedY;
      this.x += this.speedX + Math.sin(this.y * 0.01) * 0.2; // Wave animation
      this.angle += this.spinSpeed;

      // Reset when particle goes completely off top screen
      if (this.y < -this.size || this.x < -this.size || this.x > width + this.size) {
        this.reset();
      }
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);

      if (this.type === "wool") {
        // Draw a cozy wool yarn ball with simple spiral overlay
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        // Draw threads / spirals inside the yarn ball
        ctx.strokeStyle = "rgba(142, 96, 112, 0.12)";
        ctx.lineWidth = 1.5;
        
        // Spiral path
        ctx.beginPath();
        for (let i = 0; i < 20; i++) {
          const angle = 0.5 * i;
          const r = (this.size / 20) * i;
          const xVal = r * Math.cos(angle);
          const yVal = r * Math.sin(angle);
          if (i === 0) ctx.moveTo(xVal, yVal);
          else ctx.lineTo(xVal, yVal);
        }
        ctx.stroke();

        // Little hanging thread string
        ctx.beginPath();
        ctx.moveTo(0, this.size);
        ctx.bezierCurveTo(this.size * 0.5, this.size * 1.2, -this.size * 0.5, this.size * 1.5, 0, this.size * 1.8);
        ctx.stroke();
      } else if (this.type === "ring") {
        // Soft loop thread ring
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 0.8, 0, Math.PI * 2);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.stroke();
      } else {
        // Draw small hearts
        ctx.beginPath();
        ctx.moveTo(0, -this.size * 0.3);
        ctx.bezierCurveTo(-this.size * 0.5, -this.size * 0.8, -this.size * 0.9, -this.size * 0.3, 0, this.size * 0.7);
        ctx.bezierCurveTo(this.size * 0.9, -this.size * 0.3, this.size * 0.5, -this.size * 0.8, 0, -this.size * 0.3);
        ctx.fillStyle = this.color;
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // Populate list
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  // Loop
  function animate() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach((p) => {
      p.update();
      p.draw();
    });
    requestAnimationFrame(animate);
  }
  animate();
}

// 4. Hero Banner Slideshow
function initHeroSlider() {
  const slider = document.getElementById("hero-slider");
  const dots = document.querySelectorAll("#slider-dots .dot");
  if (!slider || dots.length === 0) return;

  const slides = slider.children;
  const slideCount = slides.length;

  function setSlide(index) {
    APP_STATE.activeSlide = index;
    slider.style.transform = `translateX(-${index * 100}%)`;
    
    // Manage active classes
    Array.from(slides).forEach((s, idx) => {
      if (idx === index) s.classList.add("active");
      else s.classList.remove("active");
    });

    dots.forEach((dot, idx) => {
      if (idx === index) dot.classList.add("active");
      else dot.classList.remove("active");
    });
  }

  // Auto transition
  let slideInterval = setInterval(() => {
    let nextIndex = (APP_STATE.activeSlide + 1) % slideCount;
    setSlide(nextIndex);
  }, 6000);

  // Manual dot clicks
  dots.forEach((dot, idx) => {
    dot.addEventListener("click", () => {
      clearInterval(slideInterval);
      setSlide(idx);
    });
  });
}

// 5. Testimonial Crossfade Slider
function initTestimonialSlider() {
  const slides = document.querySelectorAll(".testimonial-slide");
  const dots = document.querySelectorAll("#testimonial-dots .t-dot");
  if (slides.length === 0) return;

  function setTestimonial(index) {
    APP_STATE.activeTestimonial = index;
    slides.forEach((slide, idx) => {
      if (idx === index) slide.classList.add("active");
      else slide.classList.remove("active");
    });

    dots.forEach((dot, idx) => {
      if (idx === index) dot.classList.add("active");
      else dot.classList.remove("active");
    });
  }

  // Auto slide
  let tInterval = setInterval(() => {
    let nextIdx = (APP_STATE.activeTestimonial + 1) % slides.length;
    setTestimonial(nextIdx);
  }, 7000);

  // Clicks
  dots.forEach((dot, idx) => {
    dot.addEventListener("click", () => {
      clearInterval(tInterval);
      setTestimonial(idx);
    });
  });
}

// 6. Fetch products from local backend JSON
async function fetchProducts() {
  const grid = document.getElementById("product-grid");
  if (!grid) return;

  try {
    const res = await fetch("/api/products");
    const data = await res.json();
    APP_STATE.products = data;
    renderProducts(data);
  } catch (error) {
    console.error("Error fetching products:", error);
    grid.innerHTML = `<p style="grid-column: 1/-1; color: var(--text-muted);">Failed to load our beautiful products. Please try refreshing again soon! 💖</p>`;
  }
}

function renderProducts(products) {
  const grid = document.getElementById("product-grid");
  if (!grid) return;

  if (products.length === 0) {
    grid.innerHTML = `<p style="grid-column: 1/-1; color: var(--text-muted);">Our family is currently knitting new batches. Stay tuned! 🧶</p>`;
    return;
  }

  grid.innerHTML = "";

  products.forEach((product) => {
    // Generate color radio pill buttons HTML
    let colorsHtml = "";
    const defaultColor = product.colors && product.colors.length > 0 ? product.colors[0] : "Pastel Pink";
    
    if (product.colors && product.colors.length > 0) {
      product.colors.forEach((col, idx) => {
        let dotColor = '#8E6070'; // fallback
        const lCol = col.toLowerCase();
        if (lCol.includes('pink')) dotColor = '#FFE5EC';
        else if (lCol.includes('cream') || lCol.includes('white')) dotColor = '#FFFDF9';
        else if (lCol.includes('lavender') || lCol.includes('purple')) dotColor = '#E8E7F5';
        else if (lCol.includes('peach') || lCol.includes('orange')) dotColor = '#FCE1D4';
        else if (lCol.includes('yellow')) dotColor = '#FEF3C7';

        colorsHtml += `<button class="card-color-option-btn ${idx === 0 ? 'active' : ''}" 
                               style="background-color: ${dotColor};" 
                               title="${col}" 
                               data-color="${col}"
                               onclick="selectCardColor(this)"></button>`;
      });
    }

    const card = document.createElement("div");
    card.className = "product-card";
    
    // Set two images if available, else placeholders
    const img1 = product.images[0] || "/assets/placeholder.png";
    const img2 = product.images[1] || product.images[0] || "/assets/placeholder.png";

    // Set custom card state attributes
    card.setAttribute("data-selected-color", defaultColor);
    card.setAttribute("data-quantity", "1");

    card.innerHTML = `
      <div class="product-image-wrapper" onclick="openProductPopup('${product.id}')">
        <img class="product-img-primary" src="${img1}" alt="${product.name}" loading="lazy">
        <img class="product-img-secondary" src="${img2}" alt="${product.name}" loading="lazy">
        <div class="product-badge">Hand-knitted</div>
      </div>
      <div class="product-details">
        <h3 class="product-title" onclick="openProductPopup('${product.id}')" style="cursor: pointer;">${product.name}</h3>
        <div class="product-colors-display" style="display: flex; gap: 8px; margin-bottom: 12px; align-items: center;">
          ${colorsHtml}
        </div>
        <p class="product-description-snippet">${product.description}</p>
        <div class="product-footer" style="display:flex; flex-direction:column; align-items:stretch; gap:10px; margin-top:auto; padding-top:15px; border-top:1px solid rgba(255, 229, 236, 0.5);">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div class="product-price">₹${product.price}</div>
            <!-- Dynamic Qty Selector inline on card -->
            <div class="card-qty-selector">
              <button class="card-qty-btn" type="button" onclick="adjustCardQty(this, -1)">&minus;</button>
              <span class="card-qty-val">1</span>
              <button class="card-qty-btn" type="button" onclick="adjustCardQty(this, 1)">&plus;</button>
            </div>
          </div>
          <button class="btn-card-add-cart ripple-btn" onclick="addCardItemToCart(this, '${product.id}')">Add to Cart 🛒</button>
        </div>
      </div>
    `;

    grid.appendChild(card);
    
    // Refresh animations to include newly created elements
    setTimeout(() => {
      observer.observe(card);
    }, 50);
  });
}

// Inline card selection action helper: selects card active color
function selectCardColor(element) {
  const card = element.closest(".product-card");
  if (!card) return;

  const chosenColor = element.getAttribute("data-color");
  card.setAttribute("data-selected-color", chosenColor);

  // Toggle active rings
  const colorBtns = card.querySelectorAll(".card-color-option-btn");
  colorBtns.forEach(btn => btn.classList.remove("active"));
  element.classList.add("active");
}

// Inline card selection action helper: adjusts card ordering quantity
function adjustCardQty(element, val) {
  const card = element.closest(".product-card");
  if (!card) return;

  const valDisplay = card.querySelector(".card-qty-val");
  let currentQty = parseInt(card.getAttribute("data-quantity")) || 1;
  currentQty += val;
  if (currentQty < 1) currentQty = 1;

  card.setAttribute("data-quantity", currentQty.toString());
  valDisplay.innerText = currentQty;
}

// Inline card action callback: adds configured card config to e-commerce cart
function addCardItemToCart(element, productId) {
  const card = element.closest(".product-card");
  if (!card) return;

  const color = card.getAttribute("data-selected-color") || "Pastel Pink";
  const qty = parseInt(card.getAttribute("data-quantity")) || 1;

  addToCart(productId, color, qty);

  // Reset card quantity view to 1
  card.setAttribute("data-quantity", "1");
  const qtyDisplay = card.querySelector(".card-qty-val");
  if (qtyDisplay) qtyDisplay.innerText = "1";
}

// 7. Modals management (Details and Orders)
function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add("active");
  document.body.style.overflow = "hidden"; // disable body scrolling
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove("active");
  document.body.style.overflow = ""; // enable scrolling
}

// Product Details Popup Manager
function openProductPopup(id) {
  const product = APP_STATE.products.find(p => p.id === id);
  if (!product) return;

  APP_STATE.selectedProduct = product;
  APP_STATE.currentQty = 1;
  document.getElementById("popup-qty").value = 1;

  // Set Details
  document.getElementById("popup-title").innerText = product.name;
  document.getElementById("popup-description").innerText = product.description;

  // Insert Stock Status Badge
  let stockBadge = document.getElementById("popup-stock-badge");
  if (!stockBadge) {
    stockBadge = document.createElement("div");
    stockBadge.id = "popup-stock-badge";
    document.getElementById("popup-title").after(stockBadge);
  }
  
  // Custom organic Stock Status logic
  if (product.id === "9" || product.id === "10") {
    stockBadge.className = "stock-status-badge low";
    stockBadge.innerHTML = "🟡 Low Stock (Knitted to Order)";
  } else {
    stockBadge.className = "stock-status-badge";
    stockBadge.innerHTML = "🟢 In Stock (Ready to Ship)";
  }

  // Reset Review Form hidden product field
  document.getElementById("review-product-name").value = product.name;

  // Reset Star Selector UI to 5 stars default
  const stars = document.querySelectorAll("#star-selector .star");
  stars.forEach(s => s.classList.add("selected"));
  document.getElementById("r-rating").value = "5";

  // Set Main Image
  const mainImg = document.getElementById("popup-main-image");
  mainImg.src = product.images[0] || "/assets/placeholder.png";

  // High-End Premium Cursor-Following Zoom effect on Main Image Popup
  const mainImgWrapper = document.querySelector(".popup-main-img-wrapper");
  if (mainImgWrapper && mainImg) {
    // Clear old listeners if any by cloning or replacing
    const newWrapper = mainImgWrapper.cloneNode(true);
    mainImgWrapper.parentNode.replaceChild(newWrapper, mainImgWrapper);

    const activeWrapper = document.querySelector(".popup-main-img-wrapper");
    const activeImg = document.getElementById("popup-main-image");

    activeWrapper.addEventListener("mousemove", (e) => {
      const rect = activeWrapper.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const xPercent = (x / rect.width) * 100;
      const yPercent = (y / rect.height) * 100;
      
      activeImg.style.transformOrigin = `${xPercent}% ${yPercent}%`;
      activeImg.style.transform = "scale(2.2)";
    });

    activeWrapper.addEventListener("mouseleave", () => {
      activeImg.style.transform = "scale(1)";
      activeImg.style.transformOrigin = "center";
    });
  }

  // Thumbnails Grid
  const thumbContainer = document.getElementById("popup-thumbnails-container");
  thumbContainer.innerHTML = "";

  product.images.forEach((img, idx) => {
    const thumb = document.createElement("div");
    thumb.className = `thumb-img ${idx === 0 ? 'active' : ''}`;
    thumb.innerHTML = `<img src="${img}" alt="${product.name} thumb ${idx+1}">`;
    thumb.addEventListener("click", () => {
      const activeImg = document.getElementById("popup-main-image");
      activeImg.src = img;
      // Manage active
      document.querySelectorAll(".thumb-img").forEach(t => t.classList.remove("active"));
      thumb.classList.add("active");
    });
    thumbContainer.appendChild(thumb);
  });

  // Colors radio group
  const colorContainer = document.getElementById("popup-colors-container");
  colorContainer.innerHTML = "";

  product.colors.forEach((col, idx) => {
    const labelBtn = document.createElement("label");
    labelBtn.className = "color-radio-btn";
    labelBtn.innerHTML = `
      <input type="radio" name="popup-selected-color" value="${col}" ${idx === 0 ? 'checked' : ''}>
      <span class="color-radio-label">${col}</span>
    `;
    colorContainer.appendChild(labelBtn);
  });

  // Initialize Price Breakdown
  updatePopupPricing();

  // Load reviews live
  fetchAndRenderReviews(product.name);

  // Setup Add to Cart action inside modal
  const orderBtn = document.getElementById("popup-order-btn");
  orderBtn.innerText = "Add to Cart 💖";
  orderBtn.onclick = () => {
    const chosenColor = document.querySelector('input[name="popup-selected-color"]:checked')?.value || product.colors[0];
    const qty = parseInt(document.getElementById("popup-qty").value) || 1;
    
    closeModal("product-detail-modal");
    addToCart(product.id, chosenColor, qty);
  };

  openModal("product-detail-modal");
}

// Recalculate and update the detail popup price cards
function updatePopupPricing() {
  if (!APP_STATE.selectedProduct) return;
  const qty = parseInt(document.getElementById("popup-qty").value) || 1;
  const price = APP_STATE.selectedProduct.price;
  const subtotal = price * qty;
  const delivery = calculateDeliveryCharge(subtotal);
  const total = subtotal + delivery;

  animateNumberText("popup-subtotal", `₹${subtotal}`);
  animateNumberText("popup-delivery", `₹${delivery}`);
  animateNumberText("popup-total", `₹${total}`);
}

// Adjust quantity
function adjustQty(val) {
  const input = document.getElementById("popup-qty");
  let currentVal = parseInt(input.value) || 1;
  currentVal += val;
  if (currentVal < 1) currentVal = 1;
  input.value = currentVal;
  APP_STATE.currentQty = currentVal;
  
  updatePopupPricing(); // Recalculate in real time
}

// Quick Order opens cart drawer sidebar instantly
function openQuickOrder(id) {
  const product = APP_STATE.products.find(p => p.id === id);
  if (!product) return;
  
  const defaultColor = product.colors[0] || "Pastel Pink";
  addToCart(product.id, defaultColor, 1);
  toggleCartDrawer(true);
}

// 8. Order Placement Submission
async function setupEventListeners() {
  // Global Header Scrolled effect
  window.addEventListener("scroll", () => {
    const header = document.getElementById("header");
    if (window.scrollY > 50) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  });

  // Close modals when clicking overlay background
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeModal(overlay.id);
      }
    });
  });

  // Header Shop Button triggers scroll to grid
  document.getElementById("header-shop-btn").addEventListener("click", () => {
    scrollToSection("shop");
  });

  // Order Submission Form Upgraded E-Commerce Handler
  const orderForm = document.getElementById("order-submit-form");
  if (orderForm) {
    orderForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      if (APP_STATE.cart.length === 0) {
        alert("Your cart is empty! Add products before checking out.");
        closeModal("order-form-modal");
        return;
      }

      const name = document.getElementById("o-name").value;
      const phone = document.getElementById("o-phone").value;
      const address = document.getElementById("o-address").value;

      // Compile products list array
      const products = APP_STATE.cart.map(item => {
        const product = APP_STATE.products.find(p => p.id === item.productId);
        return {
          id: item.productId,
          name: product ? product.name : "Handmade Woolen Band",
          color: item.color,
          quantity: item.quantity,
          price: product ? product.price : 0
        };
      });

      let subtotal = 0;
      products.forEach(p => {
        subtotal += p.price * p.quantity;
      });

      const deliveryCharge = calculateDeliveryCharge(subtotal);
      const grandTotal = subtotal + deliveryCharge;

      const orderData = {
        name,
        phone,
        address,
        products,
        subtotal,
        deliveryCharge,
        grandTotal
      };

      try {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(orderData)
        });

        if (res.ok) {
          closeModal("order-form-modal");
          orderForm.reset();

          // Clear cart state
          APP_STATE.cart = [];
          saveCart();
          
          // Construct pre-filled WhatsApp e-commerce checkout confirmation summary
          const productsSummaryStr = products
            .map(p => `- *${p.name}* x${p.quantity}` + (p.color ? ` (${p.color})` : '') + ` - ₹${p.price * p.quantity}`)
            .join("\n");

          const messageText = `💖 *New Order - Three_Hearts Handmades* 💖\n\n` +
            `Hi! I have placed an order on your boutique website. Here are my checkout details:\n\n` +
            `*Customer Name:* ${name}\n` +
            `*Phone:* ${phone}\n` +
            `*Delivery Address:* ${address}\n\n` +
            `*Order Details:*\n` +
            `${productsSummaryStr}\n\n` +
            `*Subtotal:* ₹${subtotal}\n` +
            `*Delivery Charge:* ₹${deliveryCharge}\n` +
            `*Grand Total:* ₹${grandTotal}\n\n` +
            `Please confirm my order. Thank you!`;

          const encodedMsg = encodeURIComponent(messageText);
          const whatsappUrl = `https://wa.me/${APP_STATE.whatsAppNum}?text=${encodedMsg}`;
          
          // Open WhatsApp in new tab
          window.open(whatsappUrl, "_blank");
          
          showToast("Order submitted! Redirecting to WhatsApp... 💬");
          alert("Order submitted successfully! We are redirecting you to WhatsApp to chat directly with our family boutique. 💖");
        } else {
          const errRes = await res.json();
          alert(`Error placing order: ${errRes.error || 'Server error'}`);
        }
      } catch (err) {
        console.error("Order submission fail:", err);
        alert("Failed to submit order. Please check your internet connection.");
      }
    });
  }

  // Quick Message Contact Form -> Prefills WhatsApp msg directly
  const contactForm = document.getElementById("contact-message-form");
  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("c-name").value;
      const msg = document.getElementById("c-msg").value;
      
      const whatsappText = `🌸 *Inquiry from ${name} (Three_Hearts Website)* 🌸\n\n` +
        `Hello Three_Hearts Handmades! My name is ${name}. I wanted to ask:\n\n` +
        `"${msg}"`;
        
      const encodedMsg = encodeURIComponent(whatsappText);
      window.open(`https://wa.me/${APP_STATE.whatsAppNum}?text=${encodedMsg}`, "_blank");
      
      contactForm.reset();
    });
  }
}

// 9. Intersection Observer (Reveal animations on scroll)
let observer;
function initRevealAnimations() {
  const options = {
    root: null,
    threshold: 0.1,
    rootMargin: "0px"
  };

  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed");
        observer.unobserve(entry.target); // trigger animation only once
      }
    });
  }, options);

  // Observe existing reveal elements
  document.querySelectorAll(".reveal-on-scroll").forEach(el => {
    observer.observe(el);
  });
}

// 10. Click Button Ripple effects
function initRippleEffect() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".ripple-btn");
    if (!btn) return;

    const circle = document.createElement("span");
    const diameter = Math.max(btn.clientWidth, btn.clientHeight);
    const radius = diameter / 2;

    const rect = btn.getBoundingClientRect();
    
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - rect.left - radius}px`;
    circle.style.top = `${e.clientY - rect.top - radius}px`;
    circle.classList.add("ripple");

    // Remove existing ripple
    const existingRipple = btn.querySelector(".ripple");
    if (existingRipple) {
      existingRipple.remove();
    }

    btn.appendChild(circle);
  });
}

// 11. Helper navigation scroll
function scrollToSection(id) {
  const section = document.getElementById(id);
  if (!section) return;

  const headerOffset = 90;
  const elementPosition = section.getBoundingClientRect().top + window.scrollY;
  const offsetPosition = elementPosition - headerOffset;

  window.scrollTo({
    top: offsetPosition,
    behavior: "smooth"
  });
}

// 12. ADDED: Reviews & Delivery Systems Helper Operations

// Calculate Delivery Fee based on subtotal threshold
function calculateDeliveryCharge(subtotal) {
  return subtotal < 75 ? 50 : 25;
}

// Smooth numeric updates
function animateNumberText(elementId, text) {
  const el = document.getElementById(elementId);
  if (!el) return;
  if (el.innerText === text) return;
  
  el.style.opacity = 0.3;
  el.style.transform = "scale(0.95)";
  el.style.transition = "all 0.15s ease";
  
  setTimeout(() => {
    el.innerText = text;
    el.style.opacity = 1;
    el.style.transform = "scale(1)";
  }, 150);
}

// Interactive Star Selection Selector
function setupReviewStars() {
  const starSelector = document.getElementById("star-selector");
  if (!starSelector) return;
  const stars = starSelector.querySelectorAll(".star");
  const ratingInput = document.getElementById("r-rating");

  stars.forEach(star => {
    // Hovering
    star.addEventListener("mouseover", () => {
      const val = parseInt(star.getAttribute("data-value"));
      stars.forEach((s, idx) => {
        if (idx < val) s.classList.add("hovered");
        else s.classList.remove("hovered");
      });
    });

    // Hover out
    star.addEventListener("mouseout", () => {
      stars.forEach(s => s.classList.remove("hovered"));
    });

    // Clicking
    star.addEventListener("click", () => {
      const val = parseInt(star.getAttribute("data-value"));
      ratingInput.value = val;
      stars.forEach((s, idx) => {
        if (idx < val) s.classList.add("selected");
        else s.classList.remove("selected");
      });
    });
  });
}

// Submit review post form
function setupReviewForm() {
  const form = document.getElementById("submit-review-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const customerName = document.getElementById("r-name").value;
    const productName = document.getElementById("review-product-name").value;
    const rating = document.getElementById("r-rating").value;
    const review = document.getElementById("r-text").value;

    const reviewData = { customerName, productName, rating, review };

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(reviewData)
      });

      if (res.ok) {
        alert("Review submitted successfully! It will appear publicly after approval by our team. Thank you! 💖");
        form.reset();
        
        // Reset stars selector UI to 5 stars default selected
        const stars = document.querySelectorAll("#star-selector .star");
        stars.forEach(s => s.classList.remove("selected"));
        document.getElementById("r-rating").value = "5";
        stars.forEach(s => s.classList.add("selected"));

        // Reload reviews feed live
        fetchAndRenderReviews(productName);
      } else {
        const err = await res.json();
        alert(`Failed to submit review: ${err.error || 'Server error'}`);
      }
    } catch (error) {
      console.error("Review submit error:", error);
      alert("Connection error submitting your review.");
    }
  });
}

// Fetch and render approved reviews for the current product
async function fetchAndRenderReviews(productName) {
  const list = document.getElementById("popup-reviews-list");
  if (!list) return;

  try {
    const res = await fetch(`/api/reviews?approved=true`);
    const allReviews = await res.json();
    const productReviews = allReviews.filter(r => r.productName === productName);

    // Reset reviews list
    list.innerHTML = "";

    if (productReviews.length === 0) {
      list.innerHTML = `<p class="no-reviews-msg">No reviews yet. Be the first to share your love! ❤️</p>`;
      document.getElementById("popup-avg-rating").innerText = "0.0";
      document.getElementById("popup-avg-stars").style.width = "0%";
      document.getElementById("popup-reviews-count").innerText = "(0 reviews)";
      return;
    }

    // Calculate rating details
    const totalRating = productReviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = (totalRating / productReviews.length).toFixed(1);
    const starWidthPercent = (avgRating / 5) * 100;

    document.getElementById("popup-avg-rating").innerText = avgRating;
    document.getElementById("popup-avg-stars").style.width = `${starWidthPercent}%`;
    document.getElementById("popup-reviews-count").innerText = `(${productReviews.length} review${productReviews.length > 1 ? 's' : ''})`;

    // Inject reviews HTML cards
    productReviews.forEach(r => {
      const card = document.createElement("div");
      card.className = "review-item-card";
      
      const starsText = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
      const dateStr = new Date(r.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
      });

      card.innerHTML = `
        <div class="review-card-top">
          <div class="review-card-name">${r.customerName}</div>
          <div class="review-card-stars">${starsText}</div>
        </div>
        <div class="review-card-date">${dateStr}</div>
        <div class="review-card-text">${r.review}</div>
      `;
      list.appendChild(card);
    });
  } catch (error) {
    console.error("Error loading reviews:", error);
    list.innerHTML = `<p style="color: var(--text-muted); font-size: 0.88rem; text-align: center; padding: 20px 0;">Failed to load reviews. 💖</p>`;
  }
}

// ==========================================================================
// UPGRADED E-COMMERCE CART ENGINE & PERSISTENCE METHODS
// ==========================================================================

// Save cart to sessionStorage
function saveCart() {
  sessionStorage.setItem("three_hearts_cart", JSON.stringify(APP_STATE.cart));
  updateCartBadge();
}

// Load cart from sessionStorage
function loadCart() {
  const saved = sessionStorage.getItem("three_hearts_cart");
  if (saved) {
    try {
      APP_STATE.cart = JSON.parse(saved);
    } catch (e) {
      APP_STATE.cart = [];
    }
  } else {
    APP_STATE.cart = [];
  }
  updateCartBadge();
}

// Update navbar cart badge counter dynamically
function updateCartBadge() {
  const badge = document.getElementById("cart-badge-count");
  if (!badge) return;

  const totalQty = APP_STATE.cart.reduce((sum, item) => sum + item.quantity, 0);
  badge.innerText = totalQty;

  // Add micro bounce animation
  badge.classList.remove("bounce");
  void badge.offsetWidth; // Trigger reflow
  badge.classList.add("bounce");
}

// Open/Close sliding Cart Panel Drawer
function toggleCartDrawer(isOpen) {
  const drawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("cart-overlay");
  if (!drawer || !overlay) return;

  if (isOpen) {
    renderCart();
    drawer.classList.add("active");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden"; // disable background scrolling
  } else {
    drawer.classList.remove("active");
    overlay.classList.remove("active");
    document.body.style.overflow = ""; // enable background scrolling
  }
}

// Add an item to the shopping cart
function addToCart(productId, color, qty) {
  const product = APP_STATE.products.find(p => p.id === productId);
  if (!product) return;

  const existingItemIndex = APP_STATE.cart.findIndex(
    item => item.productId === productId && item.color === color
  );

  if (existingItemIndex > -1) {
    APP_STATE.cart[existingItemIndex].quantity += qty;
  } else {
    APP_STATE.cart.push({
      productId,
      color,
      quantity: qty
    });
  }

  saveCart();
  showToast(`${product.name} added to cart ❤️`);
  
  // Dynamic update if drawer is currently open
  const drawer = document.getElementById("cart-drawer");
  if (drawer && drawer.classList.contains("active")) {
    renderCart();
  }
}

// Remove an item from the cart
function removeFromCart(productId, color) {
  const product = APP_STATE.products.find(p => p.id === productId);
  APP_STATE.cart = APP_STATE.cart.filter(
    item => !(item.productId === productId && item.color === color)
  );
  saveCart();
  showToast(product ? `${product.name} removed from cart 💔` : "Product removed from cart 💔");
  renderCart();
}

// Adjust cart item quantity inside drawer
function changeCartItemQty(productId, color, change) {
  const itemIndex = APP_STATE.cart.findIndex(
    item => item.productId === productId && item.color === color
  );
  if (itemIndex === -1) return;

  APP_STATE.cart[itemIndex].quantity += change;
  if (APP_STATE.cart[itemIndex].quantity < 1) {
    removeFromCart(productId, color);
    return;
  }

  saveCart();
  renderCart();
}

// Render dynamic cart drawer listing
function renderCart() {
  const container = document.getElementById("cart-items-container");
  const footer = document.getElementById("cart-drawer-footer");
  if (!container || !footer) return;

  if (APP_STATE.cart.length === 0) {
    container.innerHTML = `
      <div class="empty-cart-message">
        <div class="empty-cart-heart">🧶</div>
        <p style="font-weight: 600; color: var(--text-dark);">Your cart is empty & cold...</p>
        <p style="font-size: 0.85rem; color: var(--text-muted);">Explore our boutique and add some handmade warmth! 💖</p>
        <button class="btn-card-order ripple-btn" onclick="toggleCartDrawer(false); scrollToSection('shop')" style="margin-top: 15px; padding: 10px 24px;">Go Shop 🌸</button>
      </div>
    `;
    footer.style.display = "none";
    return;
  }

  footer.style.display = "flex";
  container.innerHTML = "";

  let subtotal = 0;

  APP_STATE.cart.forEach(item => {
    const product = APP_STATE.products.find(p => p.id === item.productId);
    if (!product) return;

    const itemTotal = product.price * item.quantity;
    subtotal += itemTotal;

    const card = document.createElement("div");
    card.className = "cart-item-card";
    card.innerHTML = `
      <img class="cart-item-img" src="${product.images[0]}" alt="${product.name}">
      <div class="cart-item-details">
        <div>
          <h4 class="cart-item-title">${product.name}</h4>
          <p class="cart-item-meta">Color: ${item.color} | Price: ₹${product.price}</p>
        </div>
        <div class="cart-item-footer">
          <div class="cart-qty-controls">
            <button class="cart-qty-btn" onclick="changeCartItemQty('${product.id}', '${item.color}', -1)">&minus;</button>
            <span class="cart-qty-val">${item.quantity}</span>
            <button class="cart-qty-btn" onclick="changeCartItemQty('${product.id}', '${item.color}', 1)">&plus;</button>
          </div>
          <div style="display:flex; align-items:center; gap: 8px;">
            <span class="cart-item-price">₹${itemTotal}</span>
            <button class="cart-remove-btn" onclick="removeFromCart('${product.id}', '${item.color}')" title="Remove Item">
              <!-- Trash SVG -->
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
          </div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  const deliveryCharge = calculateDeliveryCharge(subtotal);
  const grandTotal = subtotal + deliveryCharge;

  document.getElementById("cart-subtotal").innerText = `₹${subtotal}`;
  document.getElementById("cart-delivery").innerText = `₹${deliveryCharge}`;
  document.getElementById("cart-grand-total").innerText = `₹${grandTotal}`;
}

// Show premium toast popup alerts
function showToast(message) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const card = document.createElement("div");
  card.className = "toast-card";
  card.innerHTML = `<span>❤️</span> ${message}`;

  container.appendChild(card);

  // Auto clean up after 3.2 seconds
  setTimeout(() => {
    card.classList.add("slide-out");
    setTimeout(() => {
      card.remove();
    }, 300);
  }, 3200);
}

// Open Checkout Address Details Form Modal populated with e-commerce pricing summaries
function openCheckoutModal() {
  if (APP_STATE.cart.length === 0) {
    showToast("Please add items to your cart first!");
    return;
  }

  // Close Cart Drawer Sidebar
  toggleCartDrawer(false);

  // Render dynamic product summary inside Checkout Modal
  const checkoutList = document.getElementById("checkout-items-list");
  if (!checkoutList) return;

  checkoutList.innerHTML = "";
  let subtotal = 0;

  APP_STATE.cart.forEach(item => {
    const product = APP_STATE.products.find(p => p.id === item.productId);
    if (!product) return;

    const itemTotal = product.price * item.quantity;
    subtotal += itemTotal;

    const summaryRow = document.createElement("div");
    summaryRow.className = "checkout-item-summary";
    summaryRow.innerHTML = `
      <div>
        <span class="checkout-item-title-meta">${product.name}</span>
        ${item.color ? `<span class="checkout-item-qty-meta">(${item.color})</span>` : ''}
        <span class="checkout-item-qty-meta">x${item.quantity}</span>
      </div>
      <span class="checkout-item-price-meta">₹${itemTotal}</span>
    `;
    checkoutList.appendChild(summaryRow);
  });

  const deliveryCharge = calculateDeliveryCharge(subtotal);
  const grandTotal = subtotal + deliveryCharge;

  document.getElementById("summary-subtotal").innerText = `₹${subtotal}`;
  document.getElementById("summary-delivery").innerText = `₹${deliveryCharge}`;
  document.getElementById("summary-total-price").innerText = `₹${grandTotal}`;

  openModal("order-form-modal");
}
