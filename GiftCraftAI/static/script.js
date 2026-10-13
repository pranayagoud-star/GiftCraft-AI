const productData = Array.from(document.querySelectorAll(".product-card")).map(card => ({
  id: Number(card.dataset.id), name: card.dataset.name, price: Number(card.dataset.price), emoji: card.dataset.emoji
}));
let currentMessage = "";

function selectedProduct() {
  const id = Number(document.getElementById("productSelect").value);
  return productData.find(p => p.id === id) || productData[0];
}
function selectProduct(id) {
  document.getElementById("productSelect").value = String(id);
  updatePreview();
  document.getElementById("studio").scrollIntoView({behavior:"smooth"});
}
function updatePreview() {
  const p = selectedProduct();
  const name = document.getElementById("recipientName").value.trim() || "Your name";
  const message = document.getElementById("giftMessage").value.trim() || "A little note from the heart...";
  const color = document.getElementById("giftColor").value;
  const product = document.getElementById("previewProduct");
  document.getElementById("previewEmoji").textContent = p.emoji;
  document.getElementById("previewName").textContent = name;
  document.getElementById("previewMessage").textContent = message;
  document.getElementById("previewProductName").textContent = p.name;
  document.getElementById("previewPrice").textContent = "₹" + p.price;
  document.getElementById("checkoutEmoji").textContent = p.emoji;
  document.getElementById("checkoutProduct").textContent = p.name;
  document.getElementById("checkoutPrice").textContent = "₹" + p.price;
  document.getElementById("checkoutCustomization").textContent = name === "Your name" ? "Personalized just for you" : "Personalized for " + name;
  document.getElementById("previewName").style.color = color;
  document.getElementById("previewProduct").style.background = p.id === 1 ? "#fff" : color + "24";
  document.getElementById("previewProduct").style.borderBottom = "5px solid " + color;
  document.getElementById("previewProduct").style.borderRadius = p.id === 1 ? "6px 6px 34px 34px" : "12px";
}
let selectedPhotoDataUrl = "";

document.getElementById("customPhoto").addEventListener("change", (event) => {
  const file = event.target.files[0];
  const preview = document.getElementById("uploadedPhotoPreview");
  const feedback = document.getElementById("orderFeedback");
  if (!file) {
    selectedPhotoDataUrl = "";
    preview.hidden = true;
    document.getElementById("removePhotoButton").hidden = true;
    return;
  }
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    event.target.value = "";
    feedback.className = "feedback error";
    feedback.textContent = "Please choose a JPG, PNG, or WEBP image.";
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    event.target.value = "";
    feedback.className = "feedback error";
    feedback.textContent = "Image must be smaller than 5 MB.";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    selectedPhotoDataUrl = reader.result;
    preview.src = selectedPhotoDataUrl;
    preview.hidden = false;
    document.getElementById("removePhotoButton").hidden = false;
    feedback.textContent = "";
    feedback.className = "feedback";
  };
  reader.readAsDataURL(file);
});

function removeCustomPhoto() {
  document.getElementById("customPhoto").value = "";
  document.getElementById("uploadedPhotoPreview").hidden = true;
  document.getElementById("uploadedPhotoPreview").removeAttribute("src");
  document.getElementById("removePhotoButton").hidden = true;
  selectedPhotoDataUrl = "";
}

function focusCheckout() {
  updatePreview();
  document.getElementById("orders").scrollIntoView({behavior:"smooth"});
  document.getElementById("customerName").focus({preventScroll:true});
}
async function getRecommendations() {
  const results = document.getElementById("recommendResults");
  results.innerHTML = '<div class="empty-recommend"><span>✦</span><h3>Finding thoughtful ideas...</h3></div>';
  const payload = {
    recipient: document.getElementById("recipientType").value,
    occasion: document.getElementById("occasionType").value,
    budget: Number(document.getElementById("budgetRange").value)
  };
  try {
    const response = await fetch("/api/recommend", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload)});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not get recommendations.");
    results.innerHTML = `<p class="microcopy">${escapeHtml(data.note)}</p><div class="rec-grid">${data.recommendations.map(p => `
      <article class="rec-card"><div class="rec-emoji">${p.emoji}</div><div><h4>${escapeHtml(p.name)}</h4><p>${escapeHtml(p.description)}</p><strong>₹${p.price}</strong><button onclick="selectProduct(${p.id})">Customize this ↗</button></div></article>`).join("")}</div>`;
  } catch (err) {
    results.innerHTML = `<p class="feedback error">${escapeHtml(err.message)}</p>`;
  }
}
async function generateMessage() {
  const name = document.getElementById("messageRecipient").value.trim() || "you";
  const occasion = document.getElementById("giftOccasion").value;
  const tone = document.getElementById("messageTone").value;
  const box = document.getElementById("generatedMessage");
  box.textContent = "Creating your message...";
  try {
    const response = await fetch("/api/message", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({recipient_name:name, occasion, tone})});
    const data = await response.json();
    currentMessage = data.message;
    box.textContent = currentMessage;
  } catch {
    box.textContent = "Couldn't create a message right now. Please try again.";
  }
}
function useMessage() {
  if (!currentMessage) {
    document.getElementById("giftMessage").value = document.getElementById("generatedMessage").textContent.includes("will show") ? "" : document.getElementById("generatedMessage").textContent;
  } else {
    document.getElementById("giftMessage").value = currentMessage;
  }
  updatePreview();
  document.getElementById("studio").scrollIntoView({behavior:"smooth"});
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
document.getElementById("orderForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const p = selectedProduct();
  const feedback = document.getElementById("orderFeedback");
  feedback.className = "feedback";
  feedback.textContent = "Saving your demo order...";
  const payload = new FormData();
  payload.append("customer_name", document.getElementById("customerName").value.trim());
  payload.append("email", document.getElementById("customerEmail").value.trim());
  payload.append("address", document.getElementById("deliveryAddress").value.trim());
  payload.append("product_id", String(p.id));
  payload.append("payment_method", document.getElementById("paymentMethod").value);
  payload.append("recipient_name", document.getElementById("recipientName").value.trim());
  payload.append("custom_message", document.getElementById("giftMessage").value.trim());
  payload.append("customization", JSON.stringify({color: document.getElementById("giftColor").value, occasion: document.getElementById("giftOccasion").value}));
  const photoFile = document.getElementById("customPhoto").files[0];
  if (photoFile) payload.append("custom_photo", photoFile);
  try {
    const response = await fetch("/api/order", {method:"POST", body:payload});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Order could not be placed.");
    feedback.className = "feedback success";
    feedback.textContent = `Success! Demo order #${data.order_id} saved. Status: ${data.status}. Payment: ${document.getElementById("paymentMethod").value}. ${data.photo_url ? "Your photo was uploaded." : "No photo attached."} No real payment was taken.`;
    document.getElementById("trackingOrderId").value = data.order_id;
    document.getElementById("orderForm").reset();
    removeCustomPhoto();
    updatePreview();
    await loadOrders();
    await trackOrder();
  } catch (err) {
    feedback.className = "feedback error";
    feedback.textContent = err.message;
  }
});
async function loadOrders() {
  const list = document.getElementById("ordersList");
  try {
    const response = await fetch("/api/orders");
    const data = await response.json();
    if (!data.orders.length) {
      list.innerHTML = '<p class="muted">No orders yet. Your first demo order will appear here.</p>';
      return;
    }
    list.innerHTML = data.orders.map(o => `<div class="order-row"><span class="order-number">#${o.id}</span><div class="order-info"><strong>${escapeHtml(o.product_name)}</strong><small>${escapeHtml(o.customer_name)} · ${escapeHtml(o.created_at)} · ${escapeHtml(o.payment_method || "Cash on Delivery")}</small></div><span class="status-pill">${escapeHtml(o.status)}</span><span class="order-price">₹${o.price}</span><button class="track-inline" onclick="trackOrder(${o.id})">Track</button></div>`).join("");
  } catch {
    list.innerHTML = '<p class="muted">Orders could not be loaded. Check that the Flask server is running.</p>';
  }
}
async function trackOrder(id) {
  const input = document.getElementById("trackingOrderId");
  if (id) input.value = id;
  const orderId = Number(input.value);
  const result = document.getElementById("trackingResult");
  if (!orderId || orderId < 1) {
    result.innerHTML = '<p class="feedback error">Enter a valid order number first.</p>';
    return;
  }
  result.innerHTML = '<p class="muted">Looking up your order...</p>';
  try {
    const response = await fetch(`/api/order/${orderId}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not find that order.");
    const o = data.order;
    result.innerHTML = `<div class="tracking-card"><div class="tracking-card-head"><div><small>ORDER #${o.id}</small><h4>${escapeHtml(o.product_name)}</h4></div><span class="status-pill">${escapeHtml(o.status)}</span></div><p class="tracking-meta">Placed ${escapeHtml(o.created_at)} · ₹${o.price} · ${escapeHtml(o.payment_method || "Cash on Delivery")}</p><p class="tracking-meta">Payment status: ${escapeHtml(o.payment_status || "Demo")}</p><div class="tracking-timeline">${o.tracking_stages.map((stage, index) => `<div class="tracking-step ${stage.complete ? "complete" : ""}"><span class="tracking-dot">${stage.complete ? "✓" : index + 1}</span><div><strong>${escapeHtml(stage.name)}</strong><small>${stage.complete ? "Completed" : "Waiting for previous step"}</small></div></div>`).join("")}</div><p class="tracking-disclaimer">Prototype tracking: the order is currently saved as “${escapeHtml(o.status)}”. Delivery stages are illustrative until connected to a real fulfilment or admin update system.</p></div>`;
  } catch (err) {
    result.innerHTML = `<p class="feedback error">${escapeHtml(err.message)}</p>`;
  }
}
document.addEventListener("DOMContentLoaded", () => { updatePreview(); loadOrders(); });
