/* ==========================================================================
   THREE_HEARTS HANDMADES - Admin Control Panel Logic
   ========================================================================== */

let adminProducts = [];
let isEditMode = false;
let imagesToKeep = [];

document.addEventListener("DOMContentLoaded", () => {
  fetchInventory();
  setupFormHandlers();
  fetchReviews();
});

// 1. Fetch products from backend
async function fetchInventory() {
  try {
    const res = await fetch("/api/products");
    const data = await res.json();
    adminProducts = data;
    renderInventoryTable(data);
  } catch (error) {
    console.error("Error loading inventory:", error);
    alert("Could not load inventory list. Make sure backend node server is running.");
  }
}

// 2. Render table of products
function renderInventoryTable(products) {
  const tbody = document.getElementById("inventory-tbody");
  if (!tbody) return;

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No products found in database. Add one to get started!</td></tr>`;
    return;
  }

  tbody.innerHTML = "";

  products.forEach(p => {
    const tr = document.createElement("tr");

    // Colors list tags
    let colorsTags = "";
    if (p.colors && p.colors.length > 0) {
      p.colors.forEach(col => {
        colorsTags += `<span class="color-tag">${col}</span>`;
      });
    }

    const imgUrl = p.images[0] || "/assets/placeholder.png";

    tr.innerHTML = `
      <td><img class="table-img" src="${imgUrl}" alt="${p.name}"></td>
      <td style="font-weight: 600;">${p.name}</td>
      <td>₹${p.price}</td>
      <td><div class="colors-list">${colorsTags}</div></td>
      <td>
        <div class="actions-cell">
          <button class="btn-edit" onclick="startEditProduct('${p.id}')">Edit</button>
          <button class="btn-delete" onclick="deleteProduct('${p.id}')">Delete</button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// 3. Form Setup (Add / Edit Submit)
function setupFormHandlers() {
  const form = document.getElementById("product-form");
  const cancelBtn = document.getElementById("cancel-btn");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = document.getElementById("product-id").value;
    const name = document.getElementById("p-name").value;
    const price = document.getElementById("p-price").value;
    const description = document.getElementById("p-description").value;
    const colorsVal = document.getElementById("p-colors").value;
    const imagesInput = document.getElementById("p-images");

    // Construct FormData (multipart image support)
    const formData = new FormData();
    formData.append("name", name);
    formData.append("price", price);
    formData.append("description", description);
    formData.append("colors", colorsVal);

    // Append files
    if (imagesInput.files && imagesInput.files.length > 0) {
      for (let i = 0; i < imagesInput.files.length; i++) {
        formData.append("images", imagesInput.files[i]);
      }
    }

    let url = "/api/products";
    let method = "POST";

    if (isEditMode) {
      url = `/api/products/${id}`;
      method = "PUT";

      // Tell backend which existing images we are keeping
      imagesToKeep.forEach(img => {
        formData.append("existingImages", img);
      });
    }

    try {
      const res = await fetch(url, {
        method: method,
        body: formData // Fetch sets correct multipart headers when passing FormData
      });

      if (res.ok) {
        const result = await res.json();
        alert(isEditMode ? "Product updated successfully!" : "Product added successfully!");
        resetFormState();
        fetchInventory();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || 'Server error occurred'}`);
      }
    } catch (error) {
      console.error("Form submit error:", error);
      alert("Failed to submit product data. Check connection.");
    }
  });

  // Cancel Edit button action
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      resetFormState();
    });
  }
}

// 4. Start Edit Product prefill flow
window.startEditProduct = function(id) {
  const p = adminProducts.find(prod => prod.id === id);
  if (!p) return;

  isEditMode = true;
  imagesToKeep = [...p.images];

  // Configure Form UI
  document.getElementById("form-title").innerText = `Edit Product: ${p.name}`;
  document.getElementById("submit-btn").innerText = "Update Product details 🧶";
  document.getElementById("cancel-btn").style.display = "inline-block";

  // Fill Values
  document.getElementById("product-id").value = p.id;
  document.getElementById("p-name").value = p.name;
  document.getElementById("p-price").value = p.price;
  document.getElementById("p-description").value = p.description;
  document.getElementById("p-colors").value = p.colors.join(", ");

  // Handle image previews
  renderSavedImagePreviews();

  // Scroll smoothly to form
  window.scrollTo({
    top: document.getElementById("product-form").getBoundingClientRect().top + window.scrollY - 100,
    behavior: "smooth"
  });
};

// Render thumbnail previews of currently saved images on Edit
function renderSavedImagePreviews() {
  const previewContainer = document.getElementById("edit-images-preview");
  const list = document.getElementById("preview-list");

  if (!previewContainer || !list) return;

  if (imagesToKeep.length === 0) {
    previewContainer.style.display = "none";
    return;
  }

  previewContainer.style.display = "block";
  list.innerHTML = "";

  imagesToKeep.forEach((img, idx) => {
    const item = document.createElement("div");
    item.className = "preview-item";
    item.innerHTML = `
      <img src="${img}" alt="Preview ${idx+1}">
      <button type="button" class="remove-preview-img" onclick="removeImageFromEdit(${idx})">&times;</button>
    `;
    list.appendChild(item);
  });
}

// Remove image from edit array
window.removeImageFromEdit = function(index) {
  imagesToKeep.splice(index, 1);
  renderSavedImagePreviews();
};

// 5. Delete product flow
window.deleteProduct = async function(id) {
  const p = adminProducts.find(prod => prod.id === id);
  if (!p) return;

  const confirmDelete = confirm(`Are you sure you want to permanently delete product "${p.name}"?`);
  if (!confirmDelete) return;

  try {
    const res = await fetch(`/api/products/${id}`, {
      method: "DELETE"
    });

    if (res.ok) {
      alert("Product deleted successfully.");
      if (isEditMode && document.getElementById("product-id").value === id) {
        resetFormState();
      }
      fetchInventory();
    } else {
      const err = await res.json();
      alert(`Error deleting product: ${err.error || 'Server error'}`);
    }
  } catch (error) {
    console.error("Delete product error:", error);
    alert("Connection error deleting product.");
  }
};

// Reset form to Add state
function resetFormState() {
  isEditMode = false;
  imagesToKeep = [];

  document.getElementById("form-title").innerText = "Add New Product";
  document.getElementById("submit-btn").innerText = "Publish Product 🧶";
  document.getElementById("cancel-btn").style.display = "none";

  document.getElementById("product-id").value = "";
  document.getElementById("product-form").reset();
  
  const previewContainer = document.getElementById("edit-images-preview");
  if (previewContainer) previewContainer.style.display = "none";
}

// ==========================================================================
// ADDED: Review Moderation Dashboard Operations
// ==========================================================================

// 6. Fetch all reviews (both approved and pending) from backend
async function fetchReviews() {
  const tbody = document.getElementById("reviews-tbody");
  if (!tbody) return;

  try {
    const res = await fetch("/api/reviews");
    const data = await res.json();
    adminReviews = data;
    renderReviewsTable(data);
  } catch (error) {
    console.error("Error loading reviews:", error);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Failed to load reviews. Make sure backend is running.</td></tr>`;
  }
}

// 7. Render table of reviews in moderation panel
function renderReviewsTable(reviews) {
  const tbody = document.getElementById("reviews-tbody");
  if (!tbody) return;

  if (reviews.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No reviews submitted yet by customers.</td></tr>`;
    return;
  }

  // Sort: pending reviews first, then approved, then rejected (sorted newest to oldest)
  reviews.sort((a, b) => {
    const statusA = a.approved ? 'approved' : (a.rejected ? 'rejected' : 'pending');
    const statusB = b.approved ? 'approved' : (b.rejected ? 'rejected' : 'pending');
    
    if (statusA === 'pending' && statusB !== 'pending') return -1;
    if (statusA !== 'pending' && statusB === 'pending') return 1;
    
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  tbody.innerHTML = "";

  reviews.forEach(r => {
    const tr = document.createElement("tr");

    // Star rating rendering
    const starsText = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
    
    // Status Badge
    let statusClass = "pending";
    let statusText = "Pending";
    if (r.approved) {
      statusClass = "approved";
      statusText = "Approved";
    } else if (r.rejected) {
      statusClass = "rejected";
      statusText = "Rejected";
    }

    const dateStr = new Date(r.createdAt).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    // Action buttons display
    let actionsHtml = "";
    if (statusText === "Pending") {
      actionsHtml = `
        <button class="btn-approve" onclick="approveReview('${r.id}')" title="Approve Review">Approve ✅</button>
        <button class="btn-reject" onclick="rejectReview('${r.id}')" title="Reject Review" style="margin-left: 5px;">Reject ❌</button>
        <button class="btn-delete" onclick="deleteReview('${r.id}')" title="Delete Review" style="margin-left: 5px;">🗑️</button>
      `;
    } else if (statusText === "Approved") {
      actionsHtml = `
        <button class="btn-reject" onclick="rejectReview('${r.id}')" title="Revoke Approval / Hide Review">Reject ❌</button>
        <button class="btn-delete" onclick="deleteReview('${r.id}')" title="Delete Review" style="margin-left: 5px;">🗑️</button>
      `;
    } else {
      // Rejected
      actionsHtml = `
        <button class="btn-approve" onclick="approveReview('${r.id}')" title="Approve and Publish Review">Approve ✅</button>
        <button class="btn-delete" onclick="deleteReview('${r.id}')" title="Delete Review" style="margin-left: 5px;">🗑️</button>
      `;
    }

    tr.innerHTML = `
      <td><span class="review-stars-list">${starsText}</span></td>
      <td style="font-weight: 600;">${r.customerName}</td>
      <td style="font-size: 0.85rem; color: var(--primary-plum-dark); font-weight: 500;">${r.productName}</td>
      <td><div class="review-text-cell">${r.review}</div></td>
      <td><span class="status-badge ${statusClass}">${statusText}</span></td>
      <td style="font-size: 0.8rem; color: var(--text-muted);">${dateStr}</td>
      <td><div class="actions-cell">${actionsHtml}</div></td>
    `;

    tbody.appendChild(tr);
  });
}

// 8. Admin Moderation Action Helpers

window.approveReview = async function(id) {
  try {
    const res = await fetch(`/api/reviews/${id}/approve`, {
      method: "PUT"
    });
    if (res.ok) {
      fetchReviews();
    } else {
      const err = await res.json();
      alert(`Error approving review: ${err.error || 'Server error'}`);
    }
  } catch (error) {
    console.error("Approve review fail:", error);
    alert("Connection error.");
  }
};

window.rejectReview = async function(id) {
  try {
    const res = await fetch(`/api/reviews/${id}/reject`, {
      method: "PUT"
    });
    if (res.ok) {
      fetchReviews();
    } else {
      const err = await res.json();
      alert(`Error rejecting review: ${err.error || 'Server error'}`);
    }
  } catch (error) {
    console.error("Reject review fail:", error);
    alert("Connection error.");
  }
};

window.deleteReview = async function(id) {
  const confirmDel = confirm("Are you sure you want to permanently delete this customer review?");
  if (!confirmDel) return;

  try {
    const res = await fetch(`/api/reviews/${id}`, {
      method: "DELETE"
    });
    if (res.ok) {
      fetchReviews();
    } else {
      const err = await res.json();
      alert(`Error deleting review: ${err.error || 'Server error'}`);
    }
  } catch (error) {
    console.error("Delete review fail:", error);
    alert("Connection error.");
  }
}
