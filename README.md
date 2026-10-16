# 💬 WhatsMyFin AI — WhatsApp for Personal Finance

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-Multimodal%20AI-4285F4.svg?logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![SQLite](https://img.shields.io/badge/SQLite3-Local%20Database-003B57.svg?logo=sqlite&logoColor=white)](https://sqlite.org)

**WhatsMyFin AI** is an innovative, mobile-first personal finance companion that transforms personal wealth and expense management into a natural **WhatsApp** conversation. Instead of struggling with complex budget spreadsheets or rigid tracking apps, you simply chat, send voice notes, or snap bill photos to track expenses, manage budgets, and receive instant financial advice.

---

## ✨ Key Features

### 1. 💬 Conversational Expense & Income Logging
- Natural language parsing powered by **Google Gemini**.
- Understands colloquial inputs: *"Spent 450rs on Starbucks coffee"*, *"Got 65000 salary from TechCorp"*, or *"Invested 5000 in Zerodha mutual fund SIP"*.
- Automatic category classification (`Food`, `Travel`, `Groceries`, `Bills`, `Shopping`, `Health`, `Investments`, `Salary`).

### 2. 🎙️ WhatsApp-Style Voice Notes with Spoken AI Replies
- Seamless, one-tap voice message recording with real-time waveform visualization.
- Audio voice notes are processed by Gemini's multimodal audio engine.
- The assistant speaks back with realistic Indian English voice notes (`.mp3` speech synthesis) with play/pause and auto-listen.

### 3. 🧾 Multimodal Receipt Scanner with Caption Support
- **WhatsApp Photo Preview Modal**: Attach any bill photo and type a custom caption before sending (e.g., *"this is the food bill I had today it cost 4000 rs"*).
- Gemini Vision OCR extracts the merchant, total amount, line items, and date.
- **Conversational Bill Retrieval**: Ask *"Can you show me the food bill on 20 august?"* or *"Where is that 4000 bill?"*, and WhatsMyFin AI retrieves and **sends the exact bill photo back into the chat**.

### 4. ⚖️ Human-in-the-Loop Confirmation (Approve / Reject)
- Extracted transactions are not immediately written to the database; they appear as a **Pending Approval** card.
- **Payment Mode Selector**: Seamlessly toggle between `⚡ UPI` (default) and `💵 Cash` with touch-friendly pills.
- **Approve / Reject Buttons**:
  - `✓ Approve`: Commits the transaction to SQLite and instantly increments the live top navbar counter.
  - `✕ Reject`: Discards the proposed entry without altering database records.

### 5. 📊 Real-Time Analytics & Top Navbar Counter
- Pinned top header with live `IN +₹... | OUT -₹...` financial tracker that updates in real time.
- Interactive category breakdown and spending charts.
- Pre-seeded with 1 month of realistic transactions and a rich 33-message conversational chat history with WhatsApp-style date separators (`OCT 1`, `OCT 10`, `YESTERDAY`, `TODAY`).

### 6. 📱 Mobile-First Responsive Design
- Optimized for mobile viewports using `100dvh` to prevent mobile browser URL bar clipping.
- Off-canvas sidebar drawer for chat list and quick analytics.
- Crisp black text (`#000000`) inside WhatsApp incoming/outgoing chat bubbles.
- Dynamic LAN host detection: run on laptop and access directly from your smartphone over Wi-Fi (`http://<LAN_IP>:5173`).

---

## 🏗️ Architecture & Project Structure

```
WhatsMyFin/
├── backend/
│   ├── database.py           # SQLite schema, transaction ledger, chat history
│   ├── gemini_service.py     # Gemini 2.5/1.5 text, audio, and vision OCR
│   ├── main.py               # FastAPI server, REST endpoints, static file server
│   ├── requirements.txt      # Python dependencies (FastAPI, gTTS, Google GenAI)
│   ├── .env.example          # Sample environment variables
│   └── uploads/              # Stored voice clips & receipt photos
│       ├── audio/
│       └── receipts/
├── frontend/
│   ├── src/
│   │   ├── components/       # ChatHeader, MessageBubble, TransactionCard,
│   │   │                     # VoiceRecorder, QuickChips, ReceiptModal, SettingsModal
│   │   ├── services/
│   │   │   └── api.js        # Dynamic LAN API client
│   │   ├── App.jsx           # Main chat container & caption modal
│   │   ├── index.css         # WhatsApp design tokens & responsive CSS
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
├── .gitignore                # Production ignore rules (secrets, venvs, DBs)
└── README.md
```

---

## 🚀 Quickstart & Installation

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & `npm`
- *(Optional)* [Google Gemini API Key](https://aistudio.google.com/) for cloud multimodal AI (offline rule-based fallbacks are built-in).

---

### Step 1: Backend Setup (FastAPI)

1. Open a terminal in the `backend/` directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. *(Optional)* Configure your Gemini API Key:
   ```bash
   cp .env.example .env
   # Add your key to .env, or configure it via the in-app Settings UI (⚙️)
   ```

5. Start the backend server:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   *The backend will be running at `http://localhost:8000` (and `http://<YOUR_LAN_IP>:8000`).*

---

### Step 2: Frontend Setup (React + Vite)

1. Open a second terminal in the `frontend/` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server with `--host` enabled:
   ```bash
   npm run dev -- --host
   ```
   *The frontend will run at `http://localhost:5173`.*

---

### Step 3: Accessing from Your Mobile Phone

1. Ensure your phone and laptop are on the same Wi-Fi network.
2. Find your laptop's Wi-Fi IP address:
   ```bash
   # Windows
   ipconfig
   # Linux / macOS
   ifconfig
   ```
3. Open your mobile browser (Safari, Chrome) and navigate to:
   ```
   http://<YOUR_LAPTOP_IP>:5173
   ```
   *The frontend automatically connects to the backend on port `8000` using dynamic LAN hostname resolution.*

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check endpoint returning app identity. |
| `GET` | `/api/chat/history` | Fetches complete conversation message history. |
| `POST` | `/api/chat/message` | Parses natural text message and returns proposed transaction. |
| `POST` | `/api/chat/voice` | Uploads audio note, transcribes with Gemini, and generates AI speech. |
| `POST` | `/api/chat/receipt` | Uploads receipt photo with optional user caption for multimodal OCR. |
| `POST` | `/api/transactions/approve` | Commits pending transaction to SQLite with selected payment mode. |
| `POST` | `/api/transactions/reject` | Rejects/discards pending proposed transaction. |
| `GET` | `/api/analytics/summary` | Returns monthly income, expenses, net savings, and category breakdowns. |
| `GET` | `/api/transactions` | Lists transactions filtered by month or category. |
| `GET` | `/api/settings` | Retrieves current currency and API key status. |
| `POST` | `/api/settings` | Updates in-app settings (Gemini API key, currency). |
| `POST` | `/api/reset` | Resets data cleanly. |

---

## 🛠️ CLI Utilities

You can manage the SQLite database directly from the CLI:

```bash
cd backend

# Initialize database schema without seeding
python database.py

# Seed full 1-month realistic financial data & 33-message chat history
python database.py --seed

# Wipe all data and start completely fresh (0 totals)
python database.py --clear
```

---

## 🛡️ Privacy & Security

- **Local-First SQLite Database**: All financial ledgers and chat logs are stored strictly on your local device in `finance.db`.
- **Zero Sensitive Data in Git**: `.env` and SQLite database files are excluded via `.gitignore`.
- **API Key Management**: Gemini API keys can be provided via environment variables or securely stored in local SQLite settings without exposing them to client bundles.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
