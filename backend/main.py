import copy
import concurrent.futures
import json
import os
import pathlib
import secrets
import uuid
from datetime import datetime

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from openai import OpenAI
from pydantic import BaseModel

from demo_data import get_demo_messages
import email_providers
import campaigns as campaign_engine
import scoring as score_engine

load_dotenv()

app = FastAPI(title="HaloSafety", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_openai_client: OpenAI | None = None


def get_openai_client() -> OpenAI:
    global _openai_client
    if _openai_client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is not set. Add it to backend/.env")
        _openai_client = OpenAI(api_key=api_key)
    return _openai_client


# ---------------------------------------------------------------------------
# Per-session isolation with file-based persistence
# ---------------------------------------------------------------------------
SESSIONS_DIR = pathlib.Path(__file__).parent / "data" / "sessions"
SESSIONS_DIR.mkdir(parents=True, exist_ok=True)


class Session:
    """Each visitor gets their own isolated data store."""

    def __init__(self, *, skip_demo: bool = False):
        self.messages: dict[str, dict] = {}
        self.analysis: dict[str, dict] = {}
        self.gmail_accounts: dict[str, dict] = {}
        self.outlook_token: dict | None = None
        if not skip_demo:
            for msg in get_demo_messages():
                self.messages[msg["id"]] = copy.deepcopy(msg)

    def to_dict(self) -> dict:
        return {
            "messages": self.messages,
            "analysis": self.analysis,
            "gmail_accounts": self.gmail_accounts,
            "outlook_token": self.outlook_token,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Session":
        s = cls(skip_demo=True)
        s.messages = data.get("messages", {})
        s.analysis = data.get("analysis", {})
        s.gmail_accounts = data.get("gmail_accounts", {})
        s.outlook_token = data.get("outlook_token")
        return s


sessions: dict[str, Session] = {}


def _session_path(sid: str) -> pathlib.Path:
    safe_name = sid.replace("/", "").replace("..", "")
    return SESSIONS_DIR / f"{safe_name}.json"


def save_session(sid: str) -> None:
    """Persist a single session to disk."""
    s = sessions.get(sid)
    if not s:
        return
    try:
        _session_path(sid).write_text(json.dumps(s.to_dict(), default=str), encoding="utf-8")
    except Exception as e:
        print(f"[persist] save error for {sid[:12]}…: {e}")


def load_all_sessions() -> None:
    """Load every saved session from disk at startup."""
    for fp in SESSIONS_DIR.glob("*.json"):
        sid = fp.stem
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
            sessions[sid] = Session.from_dict(data)
        except Exception as e:
            print(f"[persist] skipping corrupt session {sid[:12]}…: {e}")


def _should_purge_stale_external_ai_error(analysis: dict) -> bool:
    """Remove cached results from old Gemini runs or any stuck Google AI Studio quota errors."""
    exp = (analysis.get("explanation") or "").lower()
    markers = (
        "resource_exhausted",
        "ai studio",
        "prepayment credits",
        "google generative",
        "gemini",
        "generativelanguage",
        "depleted",
        "generative language api",
    )
    if any(m in exp for m in markers):
        return True
    if "429" in exp and ("depleted" in exp or "quota" in exp or "resource" in exp):
        return True
    if analysis.get("threat_summary") == "Analysis failed" and ("429" in exp or "resource" in exp):
        return True
    return False


def purge_stale_external_ai_errors_for_session(s: Session) -> int:
    removed = 0
    for mid in list(s.analysis.keys()):
        if _should_purge_stale_external_ai_error(s.analysis[mid]):
            del s.analysis[mid]
            removed += 1
    return removed


def purge_stale_external_ai_errors_all_sessions() -> None:
    for sid, s in list(sessions.items()):
        n = purge_stale_external_ai_errors_for_session(s)
        if n:
            save_session(sid)
            print(f"[persist] removed {n} stale external-AI error analysis(es) for session {sid[:12]}…")


def purge_stale_analyses_on_disk_before_load() -> None:
    """Rewrite session JSON files so bad cached analyses are gone before sessions load."""
    if not SESSIONS_DIR.is_dir():
        return
    for fp in SESSIONS_DIR.glob("*.json"):
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
            analysis = data.get("analysis") or {}
            new_analysis = {
                k: v for k, v in analysis.items() if not _should_purge_stale_external_ai_error(v)
            }
            if len(new_analysis) != len(analysis):
                data["analysis"] = new_analysis
                fp.write_text(json.dumps(data, default=str), encoding="utf-8")
                print(f"[persist] disk-purged stale AI errors in {fp.name}")
        except Exception as e:
            print(f"[persist] disk purge skip {fp.name}: {e}")


purge_stale_analyses_on_disk_before_load()
load_all_sessions()
purge_stale_external_ai_errors_all_sessions()


def get_session(request: Request) -> Session:
    sid = request.headers.get("x-session-id", "")
    if sid and sid in sessions:
        return sessions[sid]
    raise HTTPException(status_code=401, detail="Invalid session")


def get_session_id(request: Request) -> str:
    return request.headers.get("x-session-id", "")


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
SYSTEM_PROMPT = """You are an elite cybersecurity threat analyst working for a Security Operations Center. Analyze the following email or SMS message with forensic precision.

Return a JSON object with these exact fields:
- risk_score: integer 0-100
- category: one of "phishing", "scam", "marketing", "legit"
- severity: one of "safe", "suspicious", "dangerous"
- explanation: clear 1-2 sentence explanation in simple language
- confidence: float 0.0-1.0 representing your confidence
- attack_type: a specific classification from this list: "credential_harvesting", "ceo_fraud", "fake_invoice", "payroll_diversion", "delivery_scam", "gift_card_scam", "account_takeover", "tech_support_scam", "tax_scam", "subscription_phishing", "oauth_consent_phishing", "marketing_spam", "legitimate". Pick the single best match.
- evidence: array of specific forensic red flags found, chosen from: ["Urgency language", "Reply-to mismatch", "New sender domain", "Suspicious link", "Identity impersonation", "Display name spoofing", "Credential request", "Payment request", "Lookalike domain", "Threatening consequences", "Too good to be true", "Grammar errors", "Generic greeting", "Mismatched branding", "Request for secrecy", "Unusual sender address", "Embedded tracking", "Authority impersonation"]. Return only the flags that actually apply. Empty array if none.
- attack_techniques: array of detected techniques from this list: ["urgency", "spoofing", "fake_login", "financial_fraud", "social_engineering", "lookalike_domain", "suspicious_attachment", "reward_scam", "impersonation", "authority_abuse"]. Empty array if none.
- impersonated_brand: string name of the brand being impersonated, or null if none
- suspicious_urls: array of suspicious URLs found in the message. Empty array if none.
- recommended_action: one of "no_action", "review", "block_sender", "delete_and_block", "quarantine"
- threat_summary: short 5-10 word summary of the threat, or "No threat detected" if safe
- sender_domain_verdict: one of "legitimate", "suspicious", "spoofed" — your assessment of whether the sending domain is real
- link_verdict: one of "safe", "suspicious", "malicious", "none" — your assessment of links in the message

Return ONLY valid JSON. No markdown, no extra text."""


def analyze_with_openai(text: str) -> dict:
    try:
        client = get_openai_client()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": text},
            ],
            temperature=0.1,
            max_tokens=800,
        )
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
        result = json.loads(raw)
        for field, default in [
            ("confidence", 0.5),
            ("attack_type", "legitimate"),
            ("evidence", []),
            ("attack_techniques", []),
            ("impersonated_brand", None),
            ("suspicious_urls", []),
            ("recommended_action", "review"),
            ("threat_summary", "Analysis complete"),
            ("sender_domain_verdict", "suspicious"),
            ("link_verdict", "none"),
        ]:
            if field not in result:
                result[field] = default
        return result
    except Exception as e:
        return {
            "risk_score": 50,
            "category": "legit",
            "severity": "suspicious",
            "explanation": f"Analysis unavailable — AI service error: {str(e)[:120]}",
            "confidence": 0.0,
            "attack_type": "legitimate",
            "evidence": [],
            "attack_techniques": [],
            "impersonated_brand": None,
            "suspicious_urls": [],
            "recommended_action": "review",
            "threat_summary": "Analysis failed",
            "sender_domain_verdict": "suspicious",
            "link_verdict": "none",
            "_failed": True,
        }


# ---------------------------------------------------------------------------
# Routes — session
# ---------------------------------------------------------------------------
@app.get("/")
def root():
    return {"status": "ok", "service": "HaloSafety API"}


@app.post("/session/create")
def create_session():
    sid = secrets.token_hex(24)
    sessions[sid] = Session()
    save_session(sid)
    return {"session_id": sid}


@app.get("/session/check")
def check_session(request: Request):
    sid = request.headers.get("x-session-id", "")
    return {"valid": sid in sessions}


@app.post("/session/purge-stale-analyses")
def purge_stale_analyses_for_client(request: Request):
    """Drop cached analyses that came from Gemini / Google AI Studio errors so OpenAI can re-scan."""
    s = get_session(request)
    sid = get_session_id(request)
    removed = purge_stale_external_ai_errors_for_session(s)
    save_session(sid)
    return {"status": "ok", "removed": removed}


# ---------------------------------------------------------------------------
# Routes — messages
# ---------------------------------------------------------------------------
@app.get("/messages")
def list_messages(request: Request):
    s = get_session(request)
    msgs = []
    for msg in s.messages.values():
        enriched = {**msg}
        if msg["id"] in s.analysis:
            enriched["analysis"] = s.analysis[msg["id"]]
        msgs.append(enriched)
    msgs.sort(key=lambda m: m["timestamp"], reverse=True)
    return msgs


@app.get("/messages/{message_id}")
def get_message(message_id: str, request: Request):
    s = get_session(request)
    msg = s.messages.get(message_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    enriched = {**msg}
    if message_id in s.analysis:
        enriched["analysis"] = s.analysis[message_id]
    return enriched


@app.post("/messages")
def add_message(payload: MessageIn, request: Request):
    s = get_session(request)
    msg_id = f"msg-{uuid.uuid4().hex[:8]}"
    msg = {
        "id": msg_id,
        "sender": payload.sender,
        "subject": payload.subject,
        "body": payload.body,
        "type": payload.type,
        "timestamp": datetime.now().isoformat(),
    }
    s.messages[msg_id] = msg
    save_session(get_session_id(request))
    return msg


# ---------------------------------------------------------------------------
# Routes — analysis
# ---------------------------------------------------------------------------
@app.post("/analyze-message")
def analyze_message(payload: AnalyzeRequest):
    return analyze_with_openai(payload.message_text)


@app.post("/messages/{message_id}/analyze")
def analyze_stored_message(message_id: str, request: Request):
    s = get_session(request)
    msg = s.messages.get(message_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    text = f"From: {msg['sender']}\nSubject: {msg['subject']}\n\n{msg['body']}"
    result = analyze_with_openai(text)
    s.analysis[message_id] = result
    campaign_engine.assign_campaign(message_id, msg, result, s.messages, s.analysis)
    save_session(get_session_id(request))
    return result


@app.post("/analyze-all")
def analyze_all_messages(request: Request):
    s = get_session(request)
    results = {}
    to_analyze: list[tuple[str, str]] = []

    for msg_id, msg in s.messages.items():
        existing = s.analysis.get(msg_id)
        if existing and not existing.get("_failed"):
            results[msg_id] = existing
            continue
        text = f"From: {msg['sender']}\nSubject: {msg['subject']}\n\n{msg['body']}"
        to_analyze.append((msg_id, text))

    if to_analyze:
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            futures = {pool.submit(analyze_with_openai, text): mid for mid, text in to_analyze}
            for future in concurrent.futures.as_completed(futures):
                mid = futures[future]
                result = future.result()
                s.analysis[mid] = result
                results[mid] = result

    campaign_engine.detect_all_campaigns(s.messages, s.analysis)
    save_session(get_session_id(request))
    return results


@app.post("/messages/{message_id}/action")
def message_action(message_id: str, payload: ActionRequest, request: Request):
    s = get_session(request)
    msg = s.messages.get(message_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    if payload.action == "mark_safe":
        s.analysis[message_id] = {
            "risk_score": 0, "category": "legit", "severity": "safe",
            "explanation": "Manually marked as safe by user.",
            "confidence": 1.0, "attack_type": "legitimate", "evidence": [],
            "attack_techniques": [], "impersonated_brand": None,
            "suspicious_urls": [], "recommended_action": "no_action",
            "threat_summary": "Marked safe by user",
            "sender_domain_verdict": "legitimate", "link_verdict": "safe",
        }
    elif payload.action == "block_sender":
        msg["blocked"] = True
    elif payload.action == "move_spam":
        msg["spam"] = True
    elif payload.action == "quarantine":
        msg["quarantined"] = True
    elif payload.action == "report_phishing":
        msg["reported"] = True
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
    save_session(get_session_id(request))
    return {"status": "ok", "action": payload.action, "message_id": message_id}


# ---------------------------------------------------------------------------
# Routes — intelligence
# ---------------------------------------------------------------------------
@app.get("/campaigns")
def list_campaigns(request: Request):
    s = get_session(request)
    return campaign_engine.get_campaigns(s.messages, s.analysis)


@app.get("/security-score")
def security_score(request: Request):
    s = get_session(request)
    return score_engine.calculate_score(s.messages, s.analysis)


@app.get("/stats/summary")
def stats_summary(request: Request):
    s = get_session(request)
    return score_engine.get_summary(s.messages, s.analysis)


# ---------------------------------------------------------------------------
# OAuth — Gmail
# ---------------------------------------------------------------------------
@app.get("/oauth/gmail/authorize")
def gmail_authorize(request: Request):
    sid = request.query_params.get("sid", "")
    try:
        url = email_providers.google_authorize_url(state=sid)
        return RedirectResponse(url)
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/oauth/gmail/callback")
async def gmail_callback(code: str | None = None, error: str | None = None, state: str | None = None):
    frontend = os.getenv("FRONTEND_URL", "http://localhost:3000")
    if error or not code:
        return RedirectResponse(f"{frontend}?oauth_error=gmail")
    try:
        token_data = await email_providers.google_exchange_code(code)
        account_id = token_data["account_id"]
        email_addr = token_data["email"]

        sid = state or ""
        s = sessions.get(sid)
        if s:
            s.gmail_accounts[account_id] = token_data
            emails = await email_providers.gmail_fetch_emails_with_token(token_data, max_results=15)
            for em in emails:
                s.messages[em["id"]] = em
            save_session(sid)
            return RedirectResponse(
                f"{frontend}?connected=gmail&imported={len(emails)}&account={email_addr}"
            )
        else:
            return RedirectResponse(
                f"{frontend}?connected=gmail&imported=0&account={email_addr}"
            )
    except Exception as e:
        print(f"Gmail OAuth error: {e}")
        return RedirectResponse(f"{frontend}?oauth_error=gmail")


# ---------------------------------------------------------------------------
# OAuth — Outlook
# ---------------------------------------------------------------------------
@app.get("/oauth/outlook/authorize")
def outlook_authorize(request: Request):
    sid = request.query_params.get("sid", "")
    try:
        url = email_providers.microsoft_authorize_url(state=sid)
        return RedirectResponse(url)
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/oauth/outlook/callback")
async def outlook_callback(code: str | None = None, error: str | None = None, state: str | None = None):
    frontend = os.getenv("FRONTEND_URL", "http://localhost:3000")
    if error or not code:
        return RedirectResponse(f"{frontend}?oauth_error=outlook")
    try:
        token_data = await email_providers.microsoft_exchange_code(code)

        sid = state or ""
        s = sessions.get(sid)
        if s:
            s.outlook_token = token_data
            emails = await email_providers.outlook_fetch_emails_with_token(token_data, max_results=15)
            for em in emails:
                s.messages[em["id"]] = em
            save_session(sid)
            return RedirectResponse(f"{frontend}?connected=outlook&imported={len(emails)}")
        else:
            return RedirectResponse(f"{frontend}?connected=outlook&imported=0")
    except Exception as e:
        print(f"Outlook OAuth error: {e}")
        return RedirectResponse(f"{frontend}?oauth_error=outlook")


# ---------------------------------------------------------------------------
# Connections (per-session)
# ---------------------------------------------------------------------------
@app.get("/connections")
def get_connections(request: Request):
    s = get_session(request)
    gmail_list = [
        {"account_id": aid, "email": data.get("email", aid)}
        for aid, data in s.gmail_accounts.items()
    ]
    return {"gmail_accounts": gmail_list, "outlook": s.outlook_token is not None}


@app.post("/fetch-emails/{provider}")
async def fetch_emails(provider: str, request: Request):
    s = get_session(request)
    if provider == "gmail":
        emails = []
        for acc_data in s.gmail_accounts.values():
            emails.extend(await email_providers.gmail_fetch_emails_with_token(acc_data, max_results=15))
    elif provider.startswith("gmail:"):
        account_id = provider.split(":", 1)[1]
        acc_data = s.gmail_accounts.get(account_id)
        if not acc_data:
            raise HTTPException(status_code=400, detail="Gmail account not connected")
        emails = await email_providers.gmail_fetch_emails_with_token(acc_data, max_results=15)
    elif provider == "outlook":
        if not s.outlook_token:
            raise HTTPException(status_code=400, detail="Outlook not connected")
        emails = await email_providers.outlook_fetch_emails_with_token(s.outlook_token, max_results=15)
    else:
        raise HTTPException(status_code=400, detail="Unknown provider")
    for em in emails:
        s.messages[em["id"]] = em
    save_session(get_session_id(request))
    return {"imported": len(emails), "provider": provider}


@app.post("/disconnect/{provider}")
def disconnect_provider(provider: str, request: Request):
    s = get_session(request)
    sid = get_session_id(request)
    if provider.startswith("gmail:"):
        account_id = provider.split(":", 1)[1]
        s.gmail_accounts.pop(account_id, None)
        to_remove = [k for k, v in s.messages.items() if v.get("account_id") == account_id]
        for k in to_remove:
            s.messages.pop(k, None)
            s.analysis.pop(k, None)
    elif provider == "gmail":
        for aid in list(s.gmail_accounts.keys()):
            to_remove = [k for k, v in s.messages.items() if v.get("account_id") == aid]
            for k in to_remove:
                s.messages.pop(k, None)
                s.analysis.pop(k, None)
        s.gmail_accounts.clear()
    elif provider == "outlook":
        s.outlook_token = None
        to_remove = [k for k, v in s.messages.items() if v.get("source") == "outlook"]
        for k in to_remove:
            s.messages.pop(k, None)
            s.analysis.pop(k, None)
    save_session(sid)
    return {"status": "ok", "provider": provider}
