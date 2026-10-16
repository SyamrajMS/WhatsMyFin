import sqlite3
import json
import os
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "finance.db")

def get_connection():
    needs_init = not os.path.exists(DB_PATH)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    
    if needs_init:
        _create_tables(conn)
    return conn

def _create_tables(conn):
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL CHECK(type IN ('expense', 'income')),
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'INR',
            category TEXT NOT NULL,
            merchant TEXT,
            description TEXT,
            raw_text TEXT,
            date TEXT NOT NULL,
            payment_mode TEXT DEFAULT 'UPI',
            receipt_url TEXT,
            receipt_items_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender TEXT NOT NULL CHECK(sender IN ('user', 'assistant')),
            message_type TEXT NOT NULL DEFAULT 'text',
            content TEXT NOT NULL,
            media_url TEXT,
            metadata_json TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS budgets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT UNIQUE NOT NULL,
            monthly_limit REAL NOT NULL,
            alert_threshold REAL DEFAULT 0.85
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)
    conn.commit()

def init_db():
    conn = get_connection()
    _create_tables(conn)
    conn.close()

# ----------------- Transaction Functions -----------------

def add_transaction(
    trans_type: str,
    amount: float,
    category: str,
    merchant: str = "",
    description: str = "",
    raw_text: str = "",
    date_str: Optional[str] = None,
    currency: str = "INR",
    payment_mode: str = "UPI",
    receipt_url: Optional[str] = None,
    receipt_items: Optional[List[Dict]] = None
) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    
    if not date_str:
        date_str = datetime.now().strftime("%Y-%m-%d")
        
    items_json = json.dumps(receipt_items) if receipt_items else None
    
    cursor.execute("""
        INSERT INTO transactions (
            type, amount, currency, category, merchant, description,
            raw_text, date, payment_mode, receipt_url, receipt_items_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        trans_type.lower(),
        float(amount),
        currency,
        category.title(),
        merchant or "",
        description or raw_text or "",
        raw_text or "",
        date_str,
        payment_mode,
        receipt_url,
        items_json
    ))
    
    trans_id = cursor.lastrowid
    conn.commit()
    
    cursor.execute("SELECT * FROM transactions WHERE id = ?", (trans_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row)

def get_transactions(limit: int = 50, category: Optional[str] = None, month_str: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM transactions WHERE 1=1"
    params = []
    
    if category:
        query += " AND LOWER(category) = LOWER(?)"
        params.append(category)
        
    if month_str:
        query += " AND date LIKE ?"
        params.append(f"{month_str}%")
        
    query += " ORDER BY date DESC, id DESC LIMIT ?"
    params.append(limit)
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_spending_summary(month_str: Optional[str] = None) -> Dict[str, Any]:
    if not month_str:
        month_str = datetime.now().strftime("%Y-%m")
        
    conn = get_connection()
    cursor = conn.cursor()
    
    # Total expense & income for the month
    cursor.execute("""
        SELECT 
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
            COUNT(*) as total_transactions
        FROM transactions
        WHERE date LIKE ?
    """, (f"{month_str}%",))
    totals = dict(cursor.fetchone())
    
    # Breakdown by category
    cursor.execute("""
        SELECT category, SUM(amount) as total, COUNT(*) as count
        FROM transactions
        WHERE type = 'expense' AND date LIKE ?
        GROUP BY category
        ORDER BY total DESC
    """, (f"{month_str}%",))
    category_rows = [dict(r) for r in cursor.fetchall()]
    
    # Daily spending trend for the month
    cursor.execute("""
        SELECT date, SUM(amount) as daily_total
        FROM transactions
        WHERE type = 'expense' AND date LIKE ?
        GROUP BY date
        ORDER BY date ASC
    """, (f"{month_str}%",))
    daily_rows = [dict(r) for r in cursor.fetchall()]
    
    conn.close()
    
    return {
        "month": month_str,
        "total_expense": totals["total_expense"],
        "total_income": totals["total_income"],
        "net_savings": totals["total_income"] - totals["total_expense"],
        "transaction_count": totals["total_transactions"],
        "by_category": category_rows,
        "daily_trend": daily_rows
    }

def get_category_spend(category: str, month_str: Optional[str] = None) -> Dict[str, Any]:
    if not month_str:
        month_str = datetime.now().strftime("%Y-%m")
        
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT 
            COALESCE(SUM(amount), 0) as total_spent,
            COUNT(*) as count
        FROM transactions
        WHERE type = 'expense' AND LOWER(category) = LOWER(?) AND date LIKE ?
    """, (category, f"{month_str}%"))
    summary = dict(cursor.fetchone())
    
    cursor.execute("""
        SELECT * FROM transactions
        WHERE type = 'expense' AND LOWER(category) = LOWER(?) AND date LIKE ?
        ORDER BY date DESC, id DESC
    """, (category, f"{month_str}%"))
    items = [dict(r) for r in cursor.fetchall()]
    conn.close()
    
    return {
        "category": category,
        "month": month_str,
        "total_spent": summary["total_spent"],
        "count": summary["count"],
        "transactions": items
    }

def get_receipt_transactions(limit: int = 20) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM transactions 
        WHERE receipt_url IS NOT NULL AND receipt_url != ''
        ORDER BY id DESC LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def find_receipt(
    category: Optional[str] = None,
    date_str: Optional[str] = None,
    keyword: Optional[str] = None,
    amount: Optional[float] = None
) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Search transactions with receipt_url
    cursor.execute("""
        SELECT * FROM transactions 
        WHERE receipt_url IS NOT NULL AND receipt_url != ''
        ORDER BY id DESC
    """)
    trans_rows = [dict(r) for r in cursor.fetchall()]
    
    best_match = None
    best_score = -1
    
    clean_cat = (category or "").strip().lower()
    clean_kw = (keyword or "").strip().lower()
    
    for row in trans_rows:
        score = 0
        r_cat = (row.get("category") or "").lower()
        r_desc = (row.get("description") or "").lower()
        r_merch = (row.get("merchant") or "").lower()
        r_date = (row.get("date") or "").lower()
        r_raw = (row.get("raw_text") or "").lower()
        r_amt = float(row.get("amount") or 0)
        
        # Category matching
        if clean_cat:
            if clean_cat in r_cat or r_cat in clean_cat or clean_cat in r_desc:
                score += 6
        
        # Amount matching
        if amount and amount > 0:
            if abs(r_amt - amount) < 1.0:
                score += 10
            elif abs(r_amt - amount) / max(amount, 1.0) < 0.15:
                score += 5
                
        # Date matching
        if date_str:
            if date_str in r_date or date_str in r_desc:
                score += 7
                
        # Keyword matching
        if clean_kw:
            for token in clean_kw.split():
                if len(token) > 2:
                    if token in r_desc or token in r_merch or token in r_cat or token in r_date or token in r_raw:
                        score += 4

        if score > best_score:
            best_score = score
            best_match = row

    if best_match and best_score > 0:
        conn.close()
        return best_match
        
    if trans_rows:
        conn.close()
        return trans_rows[0]

    # 2. Check chat_history for uploaded receipt images
    cursor.execute("""
        SELECT * FROM chat_history 
        WHERE media_url IS NOT NULL AND media_url != '' 
          AND (message_type = 'receipt' OR media_url LIKE '%.jpg' OR media_url LIKE '%.jpeg' OR media_url LIKE '%.png' OR media_url LIKE '%.webp')
        ORDER BY id DESC
    """)
    chat_rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    
    for c_row in chat_rows:
        c_content = (c_row.get("content") or "").lower()
        return {
            "receipt_url": c_row.get("media_url"),
            "category": "Food" if "food" in c_content else "Receipt",
            "merchant": "Uploaded Receipt",
            "description": c_row.get("content") or "Receipt Bill",
            "amount": amount or 0,
            "date": datetime.now().strftime("%Y-%m-%d")
        }

    return None

# ----------------- Chat History Functions -----------------

def add_chat_message(
    sender: str,
    content: str,
    message_type: str = "text",
    media_url: Optional[str] = None,
    metadata: Optional[Dict] = None
) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    
    meta_json = json.dumps(metadata) if metadata else None
    
    cursor.execute("""
        INSERT INTO chat_history (sender, message_type, content, media_url, metadata_json)
        VALUES (?, ?, ?, ?, ?)
    """, (sender, message_type, content, media_url, meta_json))
    
    msg_id = cursor.lastrowid
    conn.commit()
    
    cursor.execute("SELECT * FROM chat_history WHERE id = ?", (msg_id,))
    row = cursor.fetchone()
    conn.close()
    
    res = dict(row)
    if res.get("metadata_json"):
        res["metadata"] = json.loads(res["metadata_json"])
    return res

def get_chat_history(limit: int = 100) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM chat_history ORDER BY id ASC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    
    results = []
    for r in rows:
        item = dict(r)
        if item.get("metadata_json"):
            try:
                item["metadata"] = json.loads(item["metadata_json"])
            except Exception:
                item["metadata"] = {}
        item["timestamp"] = item.get("created_at")
        results.append(item)
    return results

def update_chat_message_metadata(message_id: int, metadata: Dict[str, Any]) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT metadata_json FROM chat_history WHERE id = ?
    """, (message_id,))
    row = cursor.fetchone()
    current_meta = {}
    if row and row["metadata_json"]:
        try:
            current_meta = json.loads(row["metadata_json"])
        except Exception:
            current_meta = {}
    current_meta.update(metadata)
    cursor.execute("""
        UPDATE chat_history SET metadata_json = ? WHERE id = ?
    """, (json.dumps(current_meta), message_id))
    conn.commit()
    conn.close()
    return True

def clear_chat_and_data():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM transactions")
    cursor.execute("DELETE FROM chat_history")
    cursor.execute("DELETE FROM sqlite_sequence WHERE name IN ('transactions', 'chat_history')")
    conn.commit()
    conn.close()
    ensure_welcome_message()

def ensure_welcome_message():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as count FROM chat_history")
    count = cursor.fetchone()["count"]
    if count == 0:
        cursor.execute("""
            INSERT INTO chat_history (sender, message_type, content)
            VALUES ('assistant', 'text', '👋 Welcome to WhatsMyFin AI! I am your personal financial assistant.\n\nYou can:\n• 💬 Text: "Spent 600rs on coffee and burgers" or "Got 65000 salary"\n• 🎙️ Send a voice message anytime\n• 🧾 Upload a receipt/bill photo\n• 📊 Ask: "How much did I spend on food this month?"\n• 💡 Ask: "Give me financial advice based on my spending"')
        """)
        conn.commit()
    conn.close()

# ----------------- Settings Functions -----------------

def get_setting(key: str, default: Optional[str] = None) -> Optional[str]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    return row["value"] if row else default

def set_setting(key: str, value: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, value))
    conn.commit()
    conn.close()

# ----------------- Seed Sample Data -----------------

def seed_sample_data(clear_first: bool = True):
    conn = get_connection()
    cursor = conn.cursor()
    
    if clear_first:
        cursor.execute("DELETE FROM transactions")
        cursor.execute("DELETE FROM chat_history")
        cursor.execute("DELETE FROM sqlite_sequence WHERE name IN ('transactions', 'chat_history')")
        conn.commit()
    else:
        cursor.execute("SELECT COUNT(*) as count FROM transactions")
        if cursor.fetchone()["count"] > 0:
            conn.close()
            return {"status": "already_seeded"}

    today = datetime.now()
    
    # 1. Welcome Message (Day -30)
    d_welcome = (today - timedelta(days=30, hours=5)).strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
        INSERT INTO chat_history (sender, message_type, content, timestamp)
        VALUES ('assistant', 'text', '👋 Welcome to WhatsMyFin AI! I am your personal financial assistant.\n\nYou can:\n• 💬 Text: "Spent 600rs on coffee and burgers" or "Got 65000 salary"\n• 🎙️ Send a voice message anytime\n• 🧾 Upload a receipt/bill photo\n• 📊 Ask: "How much did I spend on food this month?"\n• 💡 Ask: "Give me financial advice based on my spending"', ?)
    """, (d_welcome,))

    conversations = [
        # (days_ago, hour, min, user_text, trans_type, amount, category, merchant, description, payment_mode, assistant_reply)
        (15, 10, 15, "Received 65000 salary from TechCorp", "income", 65000, "Salary", "TechCorp Pvt Ltd", "Monthly Tech Salary", "UPI",
         "Woohoo! Recorded your monthly salary of ₹65,000 under Salary. Great start to the month! 💰"),
        
        (14, 11, 30, "Invested 5000 in Zerodha Nifty 50 Index Mutual Fund SIP", "expense", 5000, "Investments", "Zerodha", "Nifty 50 Mutual Fund SIP", "UPI",
         "Smart move! Logged ₹5,000 for Investments in Zerodha Nifty 50. Keep investing regularly! 📈"),
        
        (13, 14, 20, "Got 4500 freelance payment for logo design from Design Studio", "income", 4500, "Freelance", "Design Studio", "Website logo design freelance", "UPI",
         "Awesome! Added ₹4,500 freelance income from Design Studio 💵"),

        (12, 16, 20, "Paid 1499 for Airtel broadband fiber bill", "expense", 1499, "Bills", "Airtel Fiber", "Monthly high-speed home broadband", "UPI",
         "Got it! Recorded ₹1,499 under Bills for Airtel Fiber ⚡"),
        
        (10, 15, 15, "Bought multivitamins and first aid from Apollo Pharmacy 900", "expense", 900, "Health", "Apollo Pharmacy", "Multivitamins & first aid refills", "Cash",
         "Recorded ₹900 under Health for Apollo Pharmacy 💊"),
         
        (8, 14, 0, "Ordered ergonomic keyboard and mouse pad from Amazon 3200", "expense", 3200, "Shopping", "Amazon", "Ergonomic keyboard wrist rest & mouse", "UPI",
         "Logged ₹3,200 under Shopping for Amazon 🛍️"),
         
        (6, 9, 40, "Recharged Metro smartcard for 720", "expense", 720, "Travel", "Metro Card", "Smartcard monthly recharge", "UPI",
         "Logged ₹720 under Travel for Metro Card recharge 🚗"),
         
        (5, 17, 30, "Chai Point tea and snacks with team 550", "expense", 550, "Food", "Chai Point", "Team snacks & samosas", "UPI",
         "Recorded ₹550 under Food for Chai Point snacks ☕"),
         
        (4, 19, 15, "Movie tickets and popcorn at PVR Cinemas 850rs", "expense", 850, "Entertainment", "PVR Cinemas", "Movie tickets and popcorn", "UPI",
         "Recorded ₹850 under Entertainment for PVR Cinemas 🎬"),
         
        (3, 11, 20, "Weekly grocery delivery Blinkit 2400rs", "expense", 2400, "Groceries", "Blinkit", "Weekly fruits, milk, veggies, eggs", "UPI",
         "Added ₹2,400 under Groceries for Blinkit weekly fruits & essentials 🥦"),
         
        (2, 13, 10, "Burger King burgers & fries with college friends 600", "expense", 600, "Food", "Burger King", "Burgers & fries with college friends", "UPI",
         "Recorded ₹600 under Food for Burger King 🍔"),
         
        (2, 20, 45, "Weekend dinner with family at Zomato 1800", "expense", 1800, "Food", "Zomato", "Weekend family dinner", "UPI",
         "Yum! Logged ₹1,800 under Food for Zomato dinner 🍔"),
         
        (1, 20, 30, "Dinner order from Swiggy 1250rs", "expense", 1250, "Food", "Swiggy", "Dinner order - Biryani & Desserts", "UPI",
         "Logged ₹1,250 under Food for Swiggy Biryani & desserts 🍔"),
         
        (0, 9, 15, "Cab ride to office Uber 320", "expense", 320, "Travel", "Uber", "Cab ride to office", "UPI",
         "Recorded ₹320 under Travel for Uber ride 🚗"),
         
        (0, 11, 45, "Starbucks caramel macchiato 450rs", "expense", 450, "Food", "Starbucks", "Morning Caramel Macchiato & Croissant", "UPI",
         "Logged ₹450 under Food for Starbucks coffee ☕")
    ]

    for item in conversations:
        days_ago, hour, minute, u_text, t_type, amt, cat, merch, desc, p_mode, a_reply = item
        
        # Calculate timestamps
        dt_base = today - timedelta(days=days_ago)
        msg_date_str = dt_base.strftime("%Y-%m-%d")
        user_time_str = dt_base.replace(hour=hour, minute=minute, second=0).strftime("%Y-%m-%d %H:%M:%S")
        asst_time_str = (dt_base.replace(hour=hour, minute=minute, second=0) + timedelta(seconds=14)).strftime("%Y-%m-%d %H:%M:%S")
        
        # 1. Insert into transactions table
        cursor.execute("""
            INSERT INTO transactions (type, amount, currency, category, merchant, description, raw_text, date, payment_mode, created_at)
            VALUES (?, ?, 'INR', ?, ?, ?, ?, ?, ?, ?)
        """, (t_type, float(amt), cat, merch, desc, u_text, msg_date_str, p_mode, user_time_str))
        trans_id = cursor.lastrowid
        
        cursor.execute("SELECT * FROM transactions WHERE id = ?", (trans_id,))
        saved_trans = dict(cursor.fetchone())
        saved_trans["status"] = "approved"
        
        # 2. Insert User message into chat_history
        cursor.execute("""
            INSERT INTO chat_history (sender, message_type, content, timestamp)
            VALUES ('user', 'text', ?, ?)
        """, (u_text, user_time_str))
        
        # 3. Insert Assistant message with approved transaction card into chat_history
        meta = {
            "transaction": saved_trans,
            "status": "approved",
            "reply": a_reply
        }
        cursor.execute("""
            INSERT INTO chat_history (sender, message_type, content, metadata_json, timestamp)
            VALUES ('assistant', 'transaction_card', ?, ?, ?)
        """, (a_reply, json.dumps(meta), asst_time_str))

    # Add a query spending exchange for today afternoon
    q_user_time = (today.replace(hour=12, minute=5, second=0)).strftime("%Y-%m-%d %H:%M:%S")
    q_asst_time = (today.replace(hour=12, minute=5, second=15)).strftime("%Y-%m-%d %H:%M:%S")
    
    cursor.execute("""
        INSERT INTO chat_history (sender, message_type, content, timestamp)
        VALUES ('user', 'text', 'How much have I spent on food this month?', ?)
    """, (q_user_time,))
    
    chart_meta = {
        "type": "category_detail",
        "category": "Food",
        "total": 6900.0,
        "count": 5,
        "reply": "📊 You have spent **₹6,900** on **Food** across 5 transactions this month."
    }
    cursor.execute("""
        INSERT INTO chat_history (sender, message_type, content, metadata_json, timestamp)
        VALUES ('assistant', 'chart_card', '📊 You have spent **₹6,900** on **Food** across 5 transactions this month.', ?, ?)
    """, (json.dumps(chart_meta), q_asst_time))

    conn.commit()
    conn.close()
    return {"status": "seeded", "count": len(conversations)}

if __name__ == "__main__":
    import sys
    init_db()
    if "--seed" in sys.argv:
        res = seed_sample_data()
        print(f"Database initialized and seeded ({res.get('count', 0)} entries)!")
    elif "--clear" in sys.argv or "--empty" in sys.argv:
        clear_chat_and_data()
        print("Database initialized! All previous entries removed (clean & empty).")
    else:
        print("Database initialized successfully! All tables and schema are created.")
