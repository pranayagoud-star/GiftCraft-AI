# GiftCraft AI — Custom Gift Ordering Platform

A hackathon-ready Flask + SQLite prototype featuring:
- Gift gallery and product selection
- Live gift preview (name, message, accent color)
- Budget/occasion/recipient-based gift recommendations
- Personalized message generator (template-based demo)
- Demo order checkout saved to SQLite
- Recent order list and basic status tracking

## Requirements
- Python 3.10 or newer
- VS Code (recommended)
- Internet for Google Fonts only; the app itself runs locally

## Run in VS Code (Windows)
1. Extract `GiftCraftAI.zip`.
2. Open the `GiftCraftAI` folder in VS Code.
3. Open Terminal → New Terminal.
4. Create a virtual environment:
   ```powershell
   py -m venv .venv
   ```
5. Activate it:
   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```
   If PowerShell blocks activation, use Command Prompt terminal and run:
   ```bat
   .venv\Scripts\activate.bat
   ```
6. Install Flask:
   ```powershell
   python -m pip install -r requirements.txt
   ```
7. Start the website:
   ```powershell
   python app.py
   ```
8. Open `http://127.0.0.1:5000` in your browser.

If `python` is not recognized, try `py app.py`. If neither command works, install Python from python.org and tick **Add Python to PATH** during setup.

## Database
On first start, the app creates `giftcraft.db` automatically. Orders are saved there. Do not delete this file if you want to keep demo orders.

## Important demo notes
- Checkout does not collect payment.
- Recommendations use a transparent rule-based scoring engine, not a live AI model.
- Message generation uses templates, not an external AI service.
- Order status is currently `Order Placed`; real shipping updates require a provider/admin workflow.
- This prototype is intended for hackathon demonstration. Before real deployment, add authentication, CSRF protection, stronger validation, secure image uploads, privacy controls, and a real payment provider.

## Project structure
```text
GiftCraftAI/
├── app.py
├── requirements.txt
├── README.md
├── giftcraft.db          # created automatically when app starts
├── templates/
│   └── index.html
└── static/
    ├── style.css
    └── script.js
```

## Useful demo flow
1. Click **Customize** on a product.
2. Enter a recipient name and message; observe the live preview.
3. Use **AI Ideas** to request suggestions by recipient, occasion, and budget.
4. Generate a greeting message and send it to the Gift Studio.
5. Place a demo order and show it appearing in Recent demo orders.


## Custom photo upload (added)
- In the Gift Studio, choose **Upload your photo** to preview a JPG, PNG, or WEBP image.
- The image must be 5 MB or smaller. You can remove it before ordering.
- When you place a demo order, the photo is uploaded to `static/uploads/` and its relative path is saved in SQLite in the `photo_path` column.
- This is a local hackathon demo. Use only photos you have permission to upload; production deployment should add authentication, private storage, and a retention/deletion policy.
