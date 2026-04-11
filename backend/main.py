import json
import os
import uuid
from datetime import datetime

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from openai import OpenAI
from pydantic import BaseModel

from demo_data import get_demo_messages
import email_providers

load_dotenv()

app = FastAPI(title="Aminogli Safety", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_client: OpenAI | None = None


def get_openai_client() -> OpenAI:
    global _client
    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError(
                "OPENAI_API_KEY is not set. Add it to backend/.env"
            )
        _client = OpenAI(api_key=api_key)
    return _client


# ---------------------------------------------------------------------------
# In-memory store
# ---------------------------------------------------------------------------
messages_store: dict[str, dict] = {}
analysis_cache: dict[str, dict] = {}

for msg in get_demo_messages():
    messages_store[msg["id"]] = msg


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class MessageIn(BaseModel):
    sender: str
    subject: str
    body: str
    type: str = "email"


class AnalyzeRequest(BaseModel):
    message_text: str


class ActionRequest(BaseModel):
    action: str


# ---------------------------------------------------------------------------
# AI analysis
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = (
    "You are a cybersecurity assistant. Analyze the following message and classify it.\n\n"
    "Return JSON with:\n"
    "- risk_score (0-100)\n"
    "- category (phishing, scam, marketing, legit)\n"
    "- severity (safe, suspicious, dangerous)\n"
    "- explanation (clear, simple reason why)\n\n"
    "Return ONLY valid JSON. No markdown, no extra text."
)


def analyze_with_openai(text: str) -> dict:
    try:
        client = get_openai_client()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Message:\n{text}"},
            ],
            temperature=0.1,
            max_tokens=300,
        )
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
        return json.loads(raw)
    except Exception as e:
        return {
            "risk_score": 50,
            "category": "legit",
            "severity": "suspicious",
            "explanation": f"Analysis unavailable — AI service error: {str(e)[:120]}",
        }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/")
def root():
    return {"status": "ok", "service": "Aminogli Safety API"}


@app.get("/messages")
def list_messages():
    msgs = []
    for msg in messages_store.values():
        enriched = {**msg}
        if msg["id"] in analysis_cache:
            enriched["analysis"] = analysis_cache[msg["id"]]
        msgs.append(enriched)
    msgs.sort(key=lambda m: m["timestamp"], reverse=True)
    return msgs


@app.get("/messages/{message_id}")
def get_message(message_id: str):
    msg = messages_store.get(message_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    enriched = {**msg}
    if message_id in analysis_cache:
        enriched["analysis"] = analysis_cache[message_id]
    return enriched


@app.post("/messages")
def add_message(payload: MessageIn):
    msg_id = f"msg-{uuid.uuid4().hex[:8]}"
    msg = {
        "id": msg_id,
        "sender": payload.sender,
        "subject": payload.subject,
        "body": payload.body,
        "type": payload.type,
        "timestamp": datetime.now().isoformat(),
    }
    messages_store[msg_id] = msg
    return msg


@app.post("/analyze-message")
def analyze_message(payload: AnalyzeRequest):
    return analyze_with_openai(payload.message_text)


@app.post("/messages/{message_id}/analyze")
def analyze_stored_message(message_id: str):
    msg = messages_store.get(message_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    text = f"From: {msg['sender']}\nSubject: {msg['subject']}\n\n{msg['body']}"
    result = analyze_with_openai(text)
    analysis_cache[message_id] = result
    return result


@app.post("/analyze-all")
def analyze_all_messages():
    results = {}
    for msg_id, msg in messages_store.items():
        if msg_id in analysis_cache:
            results[msg_id] = analysis_cache[msg_id]
            continue
        text = f"From: {msg['sender']}\nSubject: {msg['subject']}\n\n{msg['body']}"
        result = analyze_with_openai(text)
        analysis_cache[msg_id] = result
        results[msg_id] = result
    return results


@app.post("/messages/{message_id}/action")
def message_action(message_id: str, payload: ActionRequest):
    msg = messages_store.get(message_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    if payload.action == "mark_safe":
        analysis_cache[message_id] = {
            "risk_score": 0,
            "category": "legit",
            "severity": "safe",
            "explanation": "Manually marked as safe by user.",
        }
    elif payload.action == "block_sender":
        msg["blocked"] = True
    elif payload.action == "move_spam":
        msg["spam"] = True
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
    return {"status": "ok", "action": payload.action, "message_id": message_id}


# ---------------------------------------------------------------------------
# OAuth — Gmail (supports multiple accounts)
# ---------------------------------------------------------------------------
@app.get("/oauth/gmail/authorize")
def gmail_authorize():
    try:
        url = email_providers.google_authorize_url()
        return RedirectResponse(url)
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/oauth/gmail/callback")
async def gmail_callback(code: str | None = None, error: str | None = None):
    frontend = os.getenv("FRONTEND_URL", "http://localhost:3000")
    if error or not code:
        return RedirectResponse(f"{frontend}?oauth_error=gmail")
    try:
        token_data = await email_providers.google_exchange_code(code)
        account_id = token_data["account_id"]
        email_addr = token_data["email"]
        emails = await email_providers.gmail_fetch_emails(account_id, max_results=15)
        for em in emails:
            messages_store[em["id"]] = em
        return RedirectResponse(
            f"{frontend}?connected=gmail&imported={len(emails)}&account={email_addr}"
        )
    except Exception as e:
        print(f"Gmail OAuth error: {e}")
        return RedirectResponse(f"{frontend}?oauth_error=gmail")


# ---------------------------------------------------------------------------
# OAuth — Outlook
# ---------------------------------------------------------------------------
@app.get("/oauth/outlook/authorize")
def outlook_authorize():
    try:
        url = email_providers.microsoft_authorize_url()
        return RedirectResponse(url)
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/oauth/outlook/callback")
async def outlook_callback(code: str | None = None, error: str | None = None):
    frontend = os.getenv("FRONTEND_URL", "http://localhost:3000")
    if error or not code:
        return RedirectResponse(f"{frontend}?oauth_error=outlook")
    try:
        await email_providers.microsoft_exchange_code(code)
        emails = await email_providers.outlook_fetch_emails(max_results=15)
        for em in emails:
            messages_store[em["id"]] = em
        return RedirectResponse(f"{frontend}?connected=outlook&imported={len(emails)}")
    except Exception as e:
        print(f"Outlook OAuth error: {e}")
        return RedirectResponse(f"{frontend}?oauth_error=outlook")


# ---------------------------------------------------------------------------
# Connection status + manual re-fetch
# ---------------------------------------------------------------------------
@app.get("/connections")
def get_connections():
    """Return connected providers and their accounts."""
    gmail_list = [
        {"account_id": aid, "email": data.get("email", aid)}
        for aid, data in email_providers.gmail_accounts.items()
    ]
    return {
        "gmail_accounts": gmail_list,
        "outlook": email_providers.outlook_token is not None,
    }


@app.post("/fetch-emails/{provider}")
async def fetch_emails(provider: str):
    """Re-fetch latest emails from a connected provider."""
    if provider == "gmail":
        emails = await email_providers.gmail_fetch_all_accounts(max_results=15)
    elif provider.startswith("gmail:"):
        account_id = provider.split(":", 1)[1]
        if account_id not in email_providers.gmail_accounts:
            raise HTTPException(status_code=400, detail="Gmail account not connected")
        emails = await email_providers.gmail_fetch_emails(account_id, max_results=15)
    elif provider == "outlook":
        if not email_providers.outlook_token:
            raise HTTPException(status_code=400, detail="Outlook not connected")
        emails = await email_providers.outlook_fetch_emails(max_results=15)
    else:
        raise HTTPException(status_code=400, detail="Unknown provider")

    for em in emails:
        messages_store[em["id"]] = em

    return {"imported": len(emails), "provider": provider}


@app.post("/disconnect/{provider}")
def disconnect_provider(provider: str):
    """Disconnect a provider/account."""
    if provider.startswith("gmail:"):
        account_id = provider.split(":", 1)[1]
        email_providers.gmail_accounts.pop(account_id, None)
        to_remove = [k for k, v in messages_store.items() if v.get("account_id") == account_id]
        for k in to_remove:
            messages_store.pop(k, None)
            analysis_cache.pop(k, None)
    elif provider == "gmail":
        for aid in list(email_providers.gmail_accounts.keys()):
            to_remove = [k for k, v in messages_store.items() if v.get("account_id") == aid]
            for k in to_remove:
                messages_store.pop(k, None)
                analysis_cache.pop(k, None)
        email_providers.gmail_accounts.clear()
    elif provider == "outlook":
        email_providers.outlook_token = None
        to_remove = [k for k, v in messages_store.items() if v.get("source") == "outlook"]
        for k in to_remove:
            messages_store.pop(k, None)
            analysis_cache.pop(k, None)
    return {"status": "ok", "provider": provider}
