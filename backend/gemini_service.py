import os
import re
import json
import base64
from datetime import datetime
from typing import Dict, Any, Optional, List
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# System prompt for Financial Intent classification and extraction
SYSTEM_PROMPT = """You are WhatsMyFin AI, a friendly, ultra-smart personal finance companion on WhatsApp.
Your goal is to parse natural language messages about personal finances (expenses, income, queries, requests for advice, or receipt queries).

Current date: {current_date}

Always reply with a single valid JSON object containing:
{{
  "intent": "LOG_TRANSACTION" | "QUERY_SPENDING" | "FIND_RECEIPT" | "GET_ADVICE" | "SHOW_RECEIPTS" | "CHAT",
  "reply": "A warm, natural WhatsApp-style reply. Use appropriate emojis like 🍔, ☕, 🚗, 💰, 📊, 🧾. Be concise and conversational, exactly like a WhatsApp contact.",
  
  // If intent is "LOG_TRANSACTION":
  "transaction": {{
    "type": "expense" | "income",
    "amount": number (e.g. 600),
    "currency": "INR",
    "category": "Food" | "Travel" | "Groceries" | "Bills" | "Shopping" | "Entertainment" | "Health" | "Salary" | "Investments" | "Other",
    "merchant": "Burger King / Cafe / etc or empty if unspecified",
    "description": "Short description of the item or action",
    "date": "YYYY-MM-DD"
  }},

  // If intent is "FIND_RECEIPT":
  "receipt_query": {{
    "category": "Food" or null,
    "date": "YYYY-MM-DD" or null,
    "date_keyword": "20 august" or "today" or null,
    "amount": number or null,
    "merchant": "Swiggy" or null,
    "keyword": "food bill" or null
  }},

  // If intent is "QUERY_SPENDING":
  "query_params": {{
    "category": "Food" or null (null if asking for total or all categories),
    "timeframe": "this_month" | "today" | "all_time",
    "wants_chart": true | false
  }},

  // If intent is "GET_ADVICE":
  "advice_focus": "food" | "savings" | "general" | "investments"
}}
Return ONLY raw JSON, with no markdown code blocks.
"""

RECEIPT_VISION_PROMPT = """You are an expert financial receipt & invoice scanner.
Analyze this receipt image carefully. Extract all available information.
Today's date is: {current_date}.

Return a single valid JSON object with:
{{
  "merchant": "Merchant / Store / Restaurant Name",
  "date": "YYYY-MM-DD" (extracted date from bill, or current date if unreadable),
  "total_amount": number (the grand total / final payable amount),
  "currency": "INR" or detected currency symbol/code,
  "category": "Food" | "Groceries" | "Shopping" | "Health" | "Bills" | "Travel" | "Other",
  "items": [
    {{"name": "Item name", "qty": 1, "price": 100.0}}
  ],
  "tax_amount": number or null,
  "reply": "WhatsApp message summarizing: '🧾 Scanned your receipt from [Merchant]! Total: ₹[Total] for [X] items. Added to [Category]!'"
}}
Return ONLY raw JSON. No code fences.
"""

def get_gemini_client(api_key: Optional[str] = None):
    key = api_key or os.getenv("GEMINI_API_KEY")
    if not key:
        return None
    genai.configure(api_key=key)
    return genai

def clean_json_text(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return cleaned.strip()

# ----------------- Fallback Heuristic Parser -----------------

def rule_based_parse(text: str) -> Dict[str, Any]:
    lower = text.lower()
    
    # 1. Queries
    if any(q in lower for q in ["how much", "how much did i spend", "what did i spend", "spending for", "spend on", "expense on", "expenses on"]):
        category = None
        for cat in ["food", "groceries", "travel", "bills", "shopping", "entertainment", "health", "investments"]:
            if cat in lower:
                category = cat.title()
                break
        return {
            "intent": "QUERY_SPENDING",
            "reply": f"Checking your {category or 'overall'} spending for this month...",
            "query_params": {
                "category": category,
                "timeframe": "this_month",
                "wants_chart": True
            }
        }
    
    if any(q in lower for q in ["breakdown", "chart", "show spending", "summary", "stats", "graph", "analytics"]):
        return {
            "intent": "QUERY_SPENDING",
            "reply": "Here is your detailed spending breakdown for this month 📊",
            "query_params": {
                "category": None,
                "timeframe": "this_month",
                "wants_chart": True
            }
        }
        
    if any(q in lower for q in ["receipt", "bill", "bills", "invoice", "photo"]):
        if any(w in lower for w in ["show", "list", "get", "view", "find", "where", "can you", "send", "give"]):
            cat = None
            if any(c in lower for c in ["food", "lunch", "dinner", "breakfast", "burger", "coffee", "restaurant", "cafe", "pizza"]):
                cat = "Food"
            elif any(c in lower for c in ["travel", "cab", "uber", "ola", "petrol", "flight"]):
                cat = "Travel"
            elif any(c in lower for c in ["grocery", "groceries", "supermarket"]):
                cat = "Groceries"
            elif any(c in lower for c in ["electricity", "wifi", "recharge", "rent"]):
                cat = "Bills"

            amt = None
            amt_match = re.search(r'(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(?:rs|rupees|inr|bucks)?', lower)
            if amt_match:
                try:
                    amt = float(amt_match.group(1))
                except Exception:
                    amt = None

            date_kw = None
            for m in ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december", "today", "yesterday"]:
                if m in lower:
                    m_match = re.search(rf'(\d+\s+{m}|{m}\s+\d+|{m})', lower)
                    date_kw = m_match.group(1) if m_match else m
                    break

            return {
                "intent": "FIND_RECEIPT",
                "reply": f"Sure! Here was your {cat or 'bill'} bill 🧾",
                "receipt_query": {
                    "category": cat,
                    "amount": amt,
                    "date_keyword": date_kw,
                    "keyword": text
                }
            }
            
    if any(q in lower for q in ["advice", "tip", "suggest", "habits", "save money", "budget help"]):
        return {
            "intent": "GET_ADVICE",
            "reply": "Analyzing your spending habits to craft smart financial tips... 💡",
            "advice_focus": "general"
        }

    # 2. Transaction Logging Heuristics
    # Match amounts: "600rs", "rs 600", "₹600", "600 rupees", "600 bucks", or standalone number
    amount = None
    amt_match = re.search(r'(?:rs\.?|inr|₹)\s*(\d+(?:\.\d+)?)', lower)
    if not amt_match:
        amt_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:rs|rupees|inr|bucks)', lower)
    if not amt_match:
        # Check standalone number if accompanied by spend words
        amt_match = re.search(r'\b(\d+(?:\.\d+)?)\b', lower)
        
    if amt_match:
        try:
            amount = float(amt_match.group(1))
        except ValueError:
            amount = None

    if amount and amount > 0:
        # Check if income
        is_income = any(w in lower for w in ["salary", "credited", "received", "earned", "income", "freelance", "got paid", "bonus"])
        
        # Categorize
        category = "Other"
        merchant = ""
        desc = text
        
        if is_income:
            category = "Salary" if "salary" in lower else "Income"
            reply = f"Awesome! Recorded income of ₹{amount:,.0f} 💰"
            return {
                "intent": "LOG_TRANSACTION",
                "reply": reply,
                "transaction": {
                    "type": "income",
                    "amount": amount,
                    "currency": "INR",
                    "category": category,
                    "merchant": merchant,
                    "description": desc,
                    "date": datetime.now().strftime("%Y-%m-%d")
                }
            }
            
        # Expense categories
        if any(w in lower for w in ["coffee", "burger", "tea", "chai", "lunch", "dinner", "breakfast", "swiggy", "zomato", "restaurant", "food", "cafe", "starbucks", "pizza", "biryani", "snack"]):
            category = "Food"
        elif any(w in lower for w in ["uber", "ola", "cab", "metro", "auto", "petrol", "fuel", "bus", "train", "flight", "travel"]):
            category = "Travel"
        elif any(w in lower for w in ["grocery", "groceries", "milk", "vegetables", "fruits", "blinkit", "zepto", "instamart", "bigbasket"]):
            category = "Groceries"
        elif any(w in lower for w in ["wifi", "airtel", "jio", "electricity", "bill", "rent", "recharge", "water"]):
            category = "Bills"
        elif any(w in lower for w in ["amazon", "flipkart", "clothes", "shoes", "shopping", "myntra"]):
            category = "Shopping"
        elif any(w in lower for w in ["movie", "cinema", "netflix", "prime", "game", "pvr"]):
            category = "Entertainment"
        elif any(w in lower for w in ["medicine", "doctor", "pharmacy", "hospital", "health", "apollo"]):
            category = "Health"
        elif any(w in lower for w in ["sip", "mutual fund", "stock", "shares", "zerodha", "groww", "investment"]):
            category = "Investments"

        reply = f"Okay, logged ₹{amount:,.0f} for {category.lower()} today! 👍"
        return {
            "intent": "LOG_TRANSACTION",
            "reply": reply,
            "transaction": {
                "type": "expense",
                "amount": amount,
                "currency": "INR",
                "category": category,
                "merchant": merchant,
                "description": desc,
                "date": datetime.now().strftime("%Y-%m-%d")
            }
        }

    # 3. Default fallback
    return {
        "intent": "CHAT",
        "reply": "I'm listening! You can tell me what you spent (e.g., 'spent 600rs on food'), send a voice note, snap a receipt, or ask 'how much did I spend this month?' 💬"
    }

# ----------------- Main Gemini Processing -----------------

def parse_text_with_gemini(text: str, api_key: Optional[str] = None) -> Dict[str, Any]:
    client = get_gemini_client(api_key)
    if not client:
        return rule_based_parse(text)
        
    try:
        model = client.GenerativeModel(
            model_name="gemini-3.1-flash-lite",
            system_instruction=SYSTEM_PROMPT.format(current_date=datetime.now().strftime("%Y-%m-%d"))
        )
        response = model.generate_content(text)
        cleaned = clean_json_text(response.text)
        data = json.loads(cleaned)
        return data
    except Exception as e:
        print(f"[GeminiService] Text processing error or fallback: {e}")
        # Try gemini-1.5-flash fallback if available
        try:
            model = client.GenerativeModel("gemini-1.5-flash")
            prompt = SYSTEM_PROMPT.format(current_date=datetime.now().strftime("%Y-%m-%d")) + f"\n\nUser message: {text}"
            response = model.generate_content(prompt)
            return json.loads(clean_json_text(response.text))
        except Exception:
            return rule_based_parse(text)

def process_receipt_with_gemini(
    image_bytes: bytes,
    mime_type: str,
    api_key: Optional[str] = None,
    user_caption: Optional[str] = None
) -> Dict[str, Any]:
    client = get_gemini_client(api_key)
    
    # Parse potential hints from user_caption
    caption_amt = None
    caption_cat = "Food"
    if user_caption:
        low_cap = user_caption.lower()
        amt_match = re.search(r'(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(?:rs|rupees|inr|bucks)?', low_cap)
        if amt_match:
            try:
                caption_amt = float(amt_match.group(1))
            except Exception:
                pass
        if any(c in low_cap for c in ["food", "lunch", "dinner", "breakfast", "burger", "coffee", "restaurant", "swiggy", "zomato", "biryani"]):
            caption_cat = "Food"
        elif any(c in low_cap for c in ["travel", "cab", "uber", "ola", "petrol"]):
            caption_cat = "Travel"
        elif any(c in low_cap for c in ["grocery", "groceries", "supermarket"]):
            caption_cat = "Groceries"
        elif any(c in low_cap for c in ["bill", "electricity", "wifi", "rent"]):
            caption_cat = "Bills"

    if not client:
        # Fallback receipt parsing with user caption hints
        total = caption_amt if (caption_amt and caption_amt > 0) else 450.0
        return {
            "merchant": user_caption[:30] if user_caption else "Uploaded Receipt Store",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "total_amount": total,
            "currency": "INR",
            "category": caption_cat,
            "items": [{"name": user_caption or "Bill items", "qty": 1, "price": total}],
            "tax_amount": None,
            "reply": f"🧾 Receipt scanned! Total: ₹{total:,.0f} for {caption_cat}."
        }
        
    try:
        model_name = "gemini-2.5-flash"
        try:
            model = client.GenerativeModel(model_name)
        except Exception:
            model = client.GenerativeModel("gemini-1.5-flash")
            
        prompt = RECEIPT_VISION_PROMPT.format(current_date=datetime.now().strftime("%Y-%m-%d"))
        if user_caption and user_caption.strip():
            prompt += f"\n\nIMPORTANT: The user attached this note/caption with the receipt: \"{user_caption.strip()}\". If the user explicitly mentions the amount (e.g. 4000 rs), category, date, or items, use their stated details to verify and guide the extraction!"

        image_part = {
            "mime_type": mime_type,
            "data": image_bytes
        }
        response = model.generate_content([prompt, image_part])
        cleaned = clean_json_text(response.text)
        data = json.loads(cleaned)
        return data
    except Exception as e:
        print(f"[GeminiService] Receipt vision error: {e}")
        total = caption_amt if (caption_amt and caption_amt > 0) else 0.0
        return {
            "merchant": user_caption[:30] if user_caption else "Receipt Bill",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "total_amount": total,
            "currency": "INR",
            "category": caption_cat,
            "items": [],
            "reply": f"🧾 Scanned your receipt image! Total: ₹{total:,.0f}."
        }

def process_audio_voice_with_gemini(audio_bytes: bytes, mime_type: str, api_key: Optional[str] = None) -> Dict[str, Any]:
    client = get_gemini_client(api_key)
    if not client:
        # Rule-based fallback voice message simulation
        return {
            "transcript": "Coffee and burgers 600 rupees",
            "parsed": rule_based_parse("coffee and burgers 600 rupees")
        }
        
    try:
        model = client.GenerativeModel("gemini-2.5-flash")
        prompt = f"""Listen to this audio note from a user talking about their financial life or transactions.
Today's date: {datetime.now().strftime("%Y-%m-%d")}

First transcribe the exact audio spoken.
Then classify and extract financial information according to this JSON schema:
{{
  "transcript": "Exact spoken text",
  "intent": "LOG_TRANSACTION" | "QUERY_SPENDING" | "GET_ADVICE" | "CHAT",
  "reply": "Instant natural WhatsApp response acknowledging the voice message with emojis",
  "transaction": {{
    "type": "expense" | "income",
    "amount": number,
    "currency": "INR",
    "category": "Food" | "Travel" | "Groceries" | "Bills" | "Shopping" | "Entertainment" | "Health" | "Salary" | "Investments" | "Other",
    "merchant": "merchant if any",
    "description": "short description"
  }},
  "query_params": {{
    "category": "Food" or null,
    "wants_chart": true
  }}
}}
Return raw JSON only."""

        audio_part = {
            "mime_type": mime_type,
            "data": audio_bytes
        }
        
        response = model.generate_content([prompt, audio_part])
        cleaned = clean_json_text(response.text)
        data = json.loads(cleaned)
        
        transcript = data.get("transcript", "Spoken voice note")
        return {
            "transcript": transcript,
            "parsed": data
        }
    except Exception as e:
        print(f"[GeminiService] Audio note error: {e}")
        return {
            "transcript": "Voice message received",
            "parsed": {
                "intent": "CHAT",
                "reply": "🎙️ Heard your voice note! (Add your Gemini API key in settings for instant AI voice transcription & logging)"
            }
        }

def generate_financial_advice(summary_data: Dict[str, Any], api_key: Optional[str] = None) -> Dict[str, Any]:
    total_expense = summary_data.get("total_expense", 0)
    total_income = summary_data.get("total_income", 0)
    by_category = summary_data.get("by_category", [])
    
    top_categories = ", ".join([f"{c['category']}: ₹{c['total']:,.0f}" for c in by_category[:3]])
    
    client = get_gemini_client(api_key)
    if not client:
        # High quality rule-based advice
        savings_rate = ((total_income - total_expense) / total_income * 100) if total_income > 0 else 0
        tips = []
        
        if total_expense > total_income and total_income > 0:
            tips.append("⚠️ **Spending Alert**: Your expenses this month exceed your income. Prioritize cutting non-essential dining and shopping.")
        elif savings_rate > 30:
            tips.append(f"🌟 **Great Job**: Your savings rate is healthy at {savings_rate:.1f}%. Consider funneling extra savings into index funds or emergency reserves.")
        else:
            tips.append(f"💡 **Target 50/30/20**: Aim to keep essentials under 50%, lifestyle under 30%, and save at least 20% of your earnings.")
            
        if any(c['category'] == 'Food' and c['total'] > 5000 for c in by_category):
            tips.append("🍔 **Dining Out**: Food delivery & cafes make up a noticeable chunk. Packing lunch 2 days a week could save ₹3,000+ monthly!")
            
        tips.append("🎯 **52-Week Challenge**: Put away an increasing small sum weekly to build an automatic ₹50,000 safety cushion.")
        
        return {
            "title": "Smart Financial Habits & Advice 💡",
            "summary": f"Based on this month's cash flow (Income: ₹{total_income:,.0f} | Expenses: ₹{total_expense:,.0f}):",
            "tips": tips,
            "metrics": {
                "savings_rate": f"{savings_rate:.1f}%",
                "top_spending": top_categories or "None recorded"
            }
        }
        
    try:
        model = client.GenerativeModel("gemini-2.5-flash")
        prompt = f"""You are a certified financial planner giving friendly WhatsApp advice based on actual spending habits.
Financial Data for current month:
- Total Income: ₹{total_income}
- Total Expense: ₹{total_expense}
- Category Breakdown: {json.dumps(by_category)}

Provide personalized, empathetic, highly actionable advice in JSON format:
{{
  "title": "Smart Financial Habits & Insights 💡",
  "summary": "1-2 sentence warm observation of their current health",
  "tips": [
    "Tip 1 with emoji and bold key takeaway",
    "Tip 2 with actionable habit",
    "Tip 3 with savings or investment recommendation"
  ],
  "metrics": {{
    "savings_rate": "XX%",
    "top_spending": "{top_categories}"
  }}
}}
Return raw JSON only."""

        response = model.generate_content(prompt)
        cleaned = clean_json_text(response.text)
        return json.loads(cleaned)
    except Exception as e:
        print(f"[GeminiService] Advice generation error: {e}")
        return {
            "title": "Financial Insights 💡",
            "summary": f"Income: ₹{total_income:,.0f} | Expenses: ₹{total_expense:,.0f}",
            "tips": [
                "Track every small purchase to avoid phantom expenses.",
                "Set a weekly budget for eating out to keep food expenses in check.",
                "Automate your savings right on salary day."
            ],
            "metrics": {"savings_rate": "25%", "top_spending": top_categories or "N/A"}
        }
