import os
import re
import shutil
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import database as db
import gemini_service

# Initialize DB
db.init_db()
# Ensure uploads directories exist
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
AUDIO_DIR = os.path.join(UPLOAD_DIR, "audio")
RECEIPT_DIR = os.path.join(UPLOAD_DIR, "receipts")
os.makedirs(AUDIO_DIR, exist_ok=True)
os.makedirs(RECEIPT_DIR, exist_ok=True)

# Ensure clean welcome message exists without seeding dummy transactions
db.ensure_welcome_message()

app = FastAPI(title="WhatsMyFin AI - Personal Finance API", version="1.0.0")

# Enable CORS for React frontend (Vite dev server runs on 5173/3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads static directory
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

class MessageRequest(BaseModel):
    message: str

class ApproveTransactionRequest(BaseModel):
    message_id: Optional[int] = None
    type: str = "expense"
    amount: float
    category: str = "Other"
    merchant: Optional[str] = ""
    description: Optional[str] = ""
    date: Optional[str] = None
    currency: str = "INR"
    payment_mode: str = "UPI"
    receipt_url: Optional[str] = None
    receipt_items: Optional[List[Dict[str, Any]]] = None

class RejectTransactionRequest(BaseModel):
    message_id: Optional[int] = None

class SettingsRequest(BaseModel):
    gemini_api_key: Optional[str] = None
    currency: Optional[str] = "INR"

def get_current_api_key() -> Optional[str]:
    saved = db.get_setting("gemini_api_key")
    if saved and saved.strip():
        return saved.strip()
    return os.getenv("GEMINI_API_KEY")

# ----------------- Voice Speech Generation Helper -----------------

def generate_voice_reply(text: str) -> Optional[str]:
    """Generates an MP3 speech voice reply for the AI using gTTS."""
    try:
        from gtts import gTTS
        # Clean text for natural speech synthesis
        clean = re.sub(r'[\*#_`~•]', '', text)
        clean = re.sub(r'[\U00010000-\U0010ffff]', '', clean)
        clean = clean.replace("₹", " rupees ")
        clean = clean.replace("&", " and ")
        clean = clean.strip()
        if not clean:
            clean = "Understood!"
            
        speech_id = str(uuid.uuid4())
        filename = f"ai_reply_{speech_id}.mp3"
        filepath = os.path.join(AUDIO_DIR, filename)
        
        tts = gTTS(text=clean, lang="en", tld="co.in")
        tts.save(filepath)
        return f"/uploads/audio/{filename}"
    except Exception as e:
        print(f"[TTS] Speech generation notice: {e}")
        return None

# ----------------- Helper Functions -----------------

def handle_parsed_intent(parsed: Dict[str, Any], api_key: Optional[str]) -> Dict[str, Any]:
    intent = parsed.get("intent", "CHAT")
    reply_text = parsed.get("reply", "Understood!")
    msg_type = "text"
    metadata = {}

    if intent == "LOG_TRANSACTION":
        t_data = parsed.get("transaction", {})
        amount = float(t_data.get("amount", 0))
        if amount > 0:
            proposed_trans = {
                "type": t_data.get("type", "expense"),
                "amount": amount,
                "category": t_data.get("category", "Other"),
                "merchant": t_data.get("merchant", ""),
                "description": t_data.get("description", ""),
                "date": t_data.get("date") or datetime.now().strftime("%Y-%m-%d"),
                "currency": t_data.get("currency", "INR"),
                "payment_mode": t_data.get("payment_mode", "UPI") or "UPI",
                "status": "pending"
            }
            msg_type = "transaction_card"
            metadata = {
                "transaction": proposed_trans,
                "status": "pending",
                "reply": reply_text
            }

    elif intent == "QUERY_SPENDING":
        q_params = parsed.get("query_params", {})
        category = q_params.get("category")
        current_month = datetime.now().strftime("%Y-%m")
        
        if category:
            cat_data = db.get_category_spend(category, current_month)
            total = cat_data["total_spent"]
            count = cat_data["count"]
            reply_text = f"📊 You have spent **₹{total:,.0f}** on **{category}** across {count} transactions this month."
            msg_type = "chart_card"
            metadata = {
                "type": "category_detail",
                "category": category,
                "total": total,
                "count": count,
                "items": cat_data["transactions"][:5],
                "reply": reply_text
            }
        else:
            summary = db.get_spending_summary(current_month)
            total_exp = summary["total_expense"]
            total_inc = summary["total_income"]
            reply_text = f"📊 Here is your financial overview for this month:\n• **Expenses**: ₹{total_exp:,.0f}\n• **Income**: ₹{total_inc:,.0f}\n• **Net Savings**: ₹{(total_inc - total_exp):,.0f}"
            msg_type = "chart_card"
            metadata = {
                "type": "month_overview",
                "summary": summary,
                "reply": reply_text
            }

    elif intent == "FIND_RECEIPT":
        rq = parsed.get("receipt_query", {})
        category = rq.get("category")
        date_str = rq.get("date")
        date_kw = rq.get("date_keyword")
        amount = rq.get("amount")
        keyword = rq.get("keyword") or rq.get("merchant") or date_kw
        
        receipt = db.find_receipt(
            category=category,
            date_str=date_str or date_kw,
            keyword=keyword,
            amount=amount
        )
        
        if receipt and receipt.get("receipt_url"):
            rec_url = receipt["receipt_url"]
            cat = receipt.get("category") or "bill"
            amt = float(receipt.get("amount") or 0)
            date_val = receipt.get("date") or "recently"
            
            if amt > 0:
                reply_text = f"Sure! Here was your {cat} bill for ₹{amt:,.0f} from {date_val} 🧾"
            else:
                reply_text = f"Sure! Here was your {cat} bill from {date_val} 🧾"
                
            msg_type = "receipt_image"
            metadata = {
                "receipt": receipt,
                "transaction": receipt,
                "media_url": rec_url,
                "reply": reply_text
            }
        else:
            reply_text = "I searched your records but couldn't locate a matching bill. You can check all your saved receipts in your Bill Vault! 🧾"
            msg_type = "text"
            metadata = {}

    elif intent == "GET_ADVICE":
        summary = db.get_spending_summary(datetime.now().strftime("%Y-%m"))
        advice_data = gemini_service.generate_financial_advice(summary, api_key)
        msg_type = "advice_card"
        metadata = {
            "advice": advice_data
        }
        reply_text = f"💡 **{advice_data.get('title', 'Financial Advice')}**\n{advice_data.get('summary', '')}"

    elif intent == "SHOW_RECEIPTS":
        receipts = db.get_receipt_transactions(limit=10)
        msg_type = "receipts_list"
        metadata = {
            "receipts": receipts
        }
        if receipts:
            reply_text = f"🧾 Found {len(receipts)} saved receipt(s) in your Bill Vault!"
        else:
            reply_text = "🧾 You don't have any receipts saved yet. Try uploading a receipt photo using the attachment 📎 button!"

    return {
        "reply": reply_text,
        "message_type": msg_type,
        "metadata": metadata
    }

# ----------------- API Endpoints -----------------

@app.get("/api/health")
def health():
    return {"status": "ok", "app": "WhatsMyFin AI", "timestamp": datetime.now().isoformat()}

@app.get("/api/chat/history")
def get_chat_history():
    history = db.get_chat_history(limit=100)
    return {"history": history}

@app.post("/api/chat/message")
def send_text_message(req: MessageRequest):
    user_text = req.message.strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
        
    api_key = get_current_api_key()
    
    # 1. Save user message to chat history
    db.add_chat_message(sender="user", content=user_text, message_type="text")
    
    # 2. Parse with Gemini AI
    parsed = gemini_service.parse_text_with_gemini(user_text, api_key)
    
    # 3. Handle intent (log, query, advice, receipt)
    result = handle_parsed_intent(parsed, api_key)
    
    # 4. Save assistant reply to chat history
    assistant_msg = db.add_chat_message(
        sender="assistant",
        content=result["reply"],
        message_type=result["message_type"],
        media_url=result.get("metadata", {}).get("media_url"),
        metadata=result["metadata"]
    )
    
    return {
        "reply": assistant_msg,
        "parsed": parsed
    }

@app.post("/api/chat/voice")
async def send_voice_message(
    audio: UploadFile = File(...),
    transcript: Optional[str] = Form(None)
):
    api_key = get_current_api_key()
    
    # Save audio file
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(audio.filename or "")[1] or ".webm"
    filename = f"voice_{file_id}{ext}"
    filepath = os.path.join(AUDIO_DIR, filename)
    
    content = await audio.read()
    with open(filepath, "wb") as f:
        f.write(content)
        
    media_url = f"/uploads/audio/{filename}"
    mime_type = audio.content_type or "audio/webm"
    
    # Check if client provided real-time transcribed speech, or let Gemini analyze audio
    if transcript and transcript.strip():
        final_transcript = transcript.strip()
        parsed = gemini_service.parse_text_with_gemini(final_transcript, api_key)
    else:
        audio_result = gemini_service.process_audio_voice_with_gemini(content, mime_type, api_key)
        final_transcript = audio_result.get("transcript", "Voice note")
        parsed = audio_result.get("parsed", {})
        if not parsed or parsed.get("intent") == "CHAT" and final_transcript != "Voice note":
            # Reparse with text engine
            parsed = gemini_service.parse_text_with_gemini(final_transcript, api_key)
    
    # 1. Save user voice message to chat history
    db.add_chat_message(
        sender="user",
        content=final_transcript,
        message_type="voice",
        media_url=media_url,
        metadata={"transcript": final_transcript}
    )
    
    # 2. Handle intent (log expense, query, advice, etc.)
    result = handle_parsed_intent(parsed, api_key)
    
    # 3. Generate spoken audio voice note for AI reply!
    speech_reply_url = generate_voice_reply(result["reply"])
    if speech_reply_url:
        result["metadata"]["voice_reply_url"] = speech_reply_url
    
    # 4. Save assistant reply
    assistant_msg = db.add_chat_message(
        sender="assistant",
        content=result["reply"],
        message_type=result["message_type"],
        media_url=speech_reply_url,
        metadata=result["metadata"]
    )
    
    return {
        "transcript": final_transcript,
        "reply": assistant_msg,
        "voice_reply_url": speech_reply_url,
        "parsed": parsed
    }

@app.post("/api/chat/receipt")
async def send_receipt_image(
    image: UploadFile = File(...),
    caption: Optional[str] = Form(None)
):
    api_key = get_current_api_key()
    
    # Save image
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(image.filename or "")[1] or ".jpg"
    filename = f"receipt_{file_id}{ext}"
    filepath = os.path.join(RECEIPT_DIR, filename)
    
    content = await image.read()
    with open(filepath, "wb") as f:
        f.write(content)
        
    media_url = f"/uploads/receipts/{filename}"
    mime_type = image.content_type or "image/jpeg"
    
    user_caption = (caption or "").strip()
    user_content = user_caption if user_caption else "Uploaded receipt photo 🧾"
    
    # 1. Save user image message with caption
    user_msg = db.add_chat_message(
        sender="user",
        content=user_content,
        message_type="receipt",
        media_url=media_url
    )
    
    # 2. Extract with Gemini Vision + Caption context
    parsed = gemini_service.process_receipt_with_gemini(content, mime_type, api_key, user_caption=user_caption)
    
    total = float(parsed.get("total_amount", 0))
    merchant = parsed.get("merchant", "Receipt Merchant")
    category = parsed.get("category", "Food")
    date_str = parsed.get("date") or datetime.now().strftime("%Y-%m-%d")
    items = parsed.get("items", [])
    reply_text = parsed.get("reply", f"🧾 Scanned receipt from {merchant}! Total: ₹{total:,.0f} added to {category}.")
    
    # Propose transaction (pending user approval)
    proposed_trans = None
    if total > 0:
        proposed_trans = {
            "type": "expense",
            "amount": total,
            "category": category,
            "merchant": merchant,
            "description": user_caption or f"Receipt from {merchant}",
            "date": date_str,
            "currency": "INR",
            "payment_mode": "UPI",
            "receipt_url": media_url,
            "receipt_items": items,
            "status": "pending"
        }
        
    metadata = {
        "merchant": merchant,
        "total": total,
        "category": category,
        "date": date_str,
        "items": items,
        "receipt_url": media_url,
        "transaction": proposed_trans,
        "status": "pending" if total > 0 else "none"
    }
    
    # 3. Save assistant reply
    assistant_msg = db.add_chat_message(
        sender="assistant",
        content=reply_text,
        message_type="receipt_card",
        media_url=media_url,
        metadata=metadata
    )
    
    return {
        "user_message": user_msg,
        "reply": assistant_msg,
        "extracted": metadata
    }

@app.get("/api/transactions")
def get_transactions(limit: int = 50, category: Optional[str] = None):
    return {"transactions": db.get_transactions(limit=limit, category=category)}

@app.post("/api/transactions/approve")
def approve_transaction(req: ApproveTransactionRequest):
    saved_trans = db.add_transaction(
        trans_type=req.type,
        amount=req.amount,
        category=req.category,
        merchant=req.merchant or "",
        description=req.description or "",
        date_str=req.date,
        currency=req.currency,
        payment_mode=req.payment_mode or "UPI",
        receipt_url=req.receipt_url,
        receipt_items=req.receipt_items
    )
    
    if req.message_id:
        db.update_chat_message_metadata(
            message_id=req.message_id,
            metadata={
                "status": "approved",
                "payment_mode": req.payment_mode or "UPI",
                "transaction": saved_trans
            }
        )
        
    summary = db.get_spending_summary()
    summary["last_type"] = req.type
    return {
        "status": "approved",
        "transaction": saved_trans,
        "summary": summary
    }

@app.post("/api/transactions/reject")
def reject_transaction(req: RejectTransactionRequest):
    if req.message_id:
        db.update_chat_message_metadata(
            message_id=req.message_id,
            metadata={
                "status": "rejected"
            }
        )
    return {"status": "rejected"}

@app.get("/api/analytics/summary")
def get_analytics(month: Optional[str] = None):
    return db.get_spending_summary(month)

@app.post("/api/seed")
def seed():
    res = db.seed_sample_data()
    return res

@app.post("/api/reset")
def reset():
    db.clear_chat_and_data()
    return {"status": "reset_successful"}

@app.get("/api/settings")
def get_settings():
    saved_key = db.get_setting("gemini_api_key", "")
    masked_key = (saved_key[:4] + "..." + saved_key[-4:]) if len(saved_key) > 8 else ("Configured" if saved_key else "Not Set")
    return {
        "has_api_key": bool(saved_key or os.getenv("GEMINI_API_KEY")),
        "masked_key": masked_key,
        "currency": db.get_setting("currency", "INR")
    }

@app.post("/api/settings")
def update_settings(req: SettingsRequest):
    if req.gemini_api_key is not None:
        db.set_setting("gemini_api_key", req.gemini_api_key.strip())
    if req.currency is not None:
        db.set_setting("currency", req.currency.strip())
    return {"status": "saved"}
