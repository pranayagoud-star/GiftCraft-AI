from flask import Flask, render_template, request, jsonify
import sqlite3
from pathlib import Path
from datetime import datetime
import json
import uuid
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024  # 5 MB upload limit
UPLOAD_DIR = Path(__file__).parent / "static" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
DB_PATH = Path(__file__).with_name("giftcraft.db")

PRODUCTS = [
    {"id": 1, "name": "Personalized Photo Mug", "category": "Mugs", "price": 299, "emoji": "☕", "description": "A mug printed with a favorite photo and name.", "tags": ["friend", "birthday", "budget", "photo"]},
    {"id": 2, "name": "Custom Photo Frame", "category": "Photo Gifts", "price": 449, "emoji": "🖼️", "description": "A memory frame with a custom message.", "tags": ["family", "anniversary", "photo", "romantic"]},
    {"id": 3, "name": "Mini Celebration Hamper", "category": "Gift Hampers", "price": 699, "emoji": "🎁", "description": "A small hamper with treats and a greeting card.", "tags": ["birthday", "friend", "celebration"]},
    {"id": 4, "name": "Name Keychain", "category": "Accessories", "price": 199, "emoji": "🔑", "description": "A lightweight keychain personalized with a name.", "tags": ["friend", "budget", "name"]},
    {"id": 5, "name": "Custom Cushion", "category": "Home Gifts", "price": 599, "emoji": "🛋️", "description": "A soft cushion with your photo or text.", "tags": ["family", "anniversary", "photo", "home"]},
    {"id": 6, "name": "Premium Memory Box", "category": "Gift Hampers", "price": 999, "emoji": "💝", "description": "A keepsake box for photos, notes, and little surprises.", "tags": ["anniversary", "romantic", "premium", "family"]},
    {"id": 7, "name": "Personalized Notebook", "category": "Stationery", "price": 349, "emoji": "📔", "description": "A notebook with a custom cover and name.", "tags": ["student", "friend", "name", "budget"]},
    {"id": 8, "name": "Floral Greeting Card", "category": "Cards", "price": 99, "emoji": "💌", "description": "A card with a message written just for them.", "tags": ["birthday", "anniversary", "budget", "message"]}
]

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_name TEXT NOT NULL,
                email TEXT NOT NULL,
                address TEXT NOT NULL,
                product_id INTEGER NOT NULL,
                product_name TEXT NOT NULL,
                price INTEGER NOT NULL,
                recipient_name TEXT,
                custom_message TEXT,
                customization_json TEXT,
                photo_path TEXT,
                payment_method TEXT NOT NULL DEFAULT 'Cash on Delivery',
                payment_status TEXT NOT NULL DEFAULT 'Pending (Demo)',
                status TEXT NOT NULL DEFAULT 'Order Placed',
                created_at TEXT NOT NULL
            )
        """)
        # Add columns for databases created by earlier versions of the project.
        columns = {row[1] for row in conn.execute("PRAGMA table_info(orders)").fetchall()}
        if "photo_path" not in columns:
            conn.execute("ALTER TABLE orders ADD COLUMN photo_path TEXT")
        if "payment_method" not in columns:
            conn.execute("ALTER TABLE orders ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'Cash on Delivery'")
        if "payment_status" not in columns:
            conn.execute("ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'Pending (Demo)'")

@app.route("/")
def home():
    return render_template("index.html", products=PRODUCTS)

@app.route("/api/recommend", methods=["POST"])
def recommend():
    data = request.get_json(silent=True) or {}
    occasion = (data.get("occasion") or "birthday").lower()
    recipient = (data.get("recipient") or "friend").lower()
    budget = int(data.get("budget") or 500)
    style = (data.get("style") or "").lower()

    scored = []
    for p in PRODUCTS:
        score = 0
        if p["price"] <= budget:
            score += 3
        else:
            score -= 2
        tags = " ".join(p["tags"]).lower()
        if occasion in tags:
            score += 3
        if recipient in tags:
            score += 2
        if style and style in tags:
            score += 1
        if p["price"] <= budget * 0.75:
            score += 1
        scored.append((score, p))
    scored.sort(key=lambda x: (x[0], -x[1]["price"]), reverse=True)
    return jsonify({"recommendations": [p for _, p in scored[:4]], "note": "Suggestions are ranked using occasion, recipient, style, and budget. This demo uses a transparent rule-based recommender."})

@app.route("/api/message", methods=["POST"])
def message():
    data = request.get_json(silent=True) or {}
    recipient = (data.get("recipient_name") or "you").strip()
    occasion = (data.get("occasion") or "special day").lower()
    tone = (data.get("tone") or "heartfelt").lower()
    templates = {
        "funny": f"Happy {occasion}, {recipient}! You deserve a day full of laughs, treats, and zero responsibilities. Keep being wonderfully you!",
        "short": f"Happy {occasion}, {recipient}! Sending you lots of love and happy memories.",
        "heartfelt": f"Dear {recipient}, wishing you a beautiful {occasion} filled with love, laughter, and moments worth remembering. You make life brighter just by being you."
    }
    return jsonify({"message": templates.get(tone, templates["heartfelt"])})

@app.route("/api/order", methods=["POST"])
def place_order():
    # Multipart form data allows the customer to upload a photo with the order.
    data = request.form
    required = ["customer_name", "email", "address", "product_id", "payment_method"]
    if any(not str(data.get(k, "")).strip() for k in required):
        return jsonify({"error": "Please complete your name, email, address, and product selection."}), 400

    try:
        product_id = int(data["product_id"])
    except (ValueError, TypeError):
        return jsonify({"error": "Please choose a valid product."}), 400
    product = next((p for p in PRODUCTS if p["id"] == product_id), None)
    if not product:
        return jsonify({"error": "That product could not be found."}), 404

    payment_method = str(data.get("payment_method", ""))
    allowed_payments = {"UPI (Demo)", "Debit/Credit Card (Demo)", "Net Banking (Demo)", "Cash on Delivery"}
    if payment_method not in allowed_payments:
        return jsonify({"error": "Please choose a valid payment method."}), 400
    payment_status = "Pay on delivery" if payment_method == "Cash on Delivery" else "Demo only — not paid"

    photo_path = None
    photo = request.files.get("custom_photo")
    if photo and photo.filename:
        safe_name = secure_filename(photo.filename)
        extension = safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else ""
        if extension not in ALLOWED_IMAGE_EXTENSIONS:
            return jsonify({"error": "Upload a JPG, JPEG, PNG, or WEBP image."}), 400
        stored_name = f"{uuid.uuid4().hex}.{extension}"
        photo.save(UPLOAD_DIR / stored_name)
        photo_path = f"uploads/{stored_name}"

    try:
        customization = json.loads(data.get("customization", "{}"))
    except (ValueError, TypeError):
        customization = {}

    with get_db() as conn:
        cur = conn.execute("""
            INSERT INTO orders
            (customer_name, email, address, product_id, product_name, price, recipient_name,
             custom_message, customization_json, photo_path, payment_method, payment_status, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data["customer_name"].strip(), data["email"].strip(), data["address"].strip(),
            product["id"], product["name"], product["price"],
            (data.get("recipient_name") or "").strip(),
            (data.get("custom_message") or "").strip(),
            json.dumps(customization), photo_path,
            payment_method, payment_status,
            "Order Placed", datetime.now().strftime("%Y-%m-%d %H:%M")
        ))
        order_id = cur.lastrowid
    return jsonify({"success": True, "order_id": order_id, "status": "Order Placed",
                    "photo_url": f"/static/{photo_path}" if photo_path else None,
                    "message": "Your demo order has been saved."})

@app.route("/api/orders")
def orders():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM orders ORDER BY id DESC LIMIT 50").fetchall()
    return jsonify({"orders": [dict(r) for r in rows]})

@app.route("/api/order/<int:order_id>")
def track_order(order_id):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
    if not row:
        return jsonify({"error": "Order not found. Check the order number and try again."}), 404
    order = dict(row)
    stages = ["Order Placed", "Preparing Gift", "Ready to Ship", "Shipped", "Delivered"]
    current = order.get("status", "Order Placed")
    order["tracking_stages"] = [{"name": stage, "complete": stages.index(stage) <= stages.index(current) if current in stages else stage == "Order Placed"} for stage in stages]
    return jsonify({"order": order})

@app.route("/health")
def health():
    return jsonify({"status": "ok", "app": "GiftCraft AI"})

if __name__ == "__main__":
    init_db()
    app.run(debug=True)


@app.errorhandler(413)
def upload_too_large(error):
    return jsonify({"error": "Image is too large. Please upload an image smaller than 5 MB."}), 413
