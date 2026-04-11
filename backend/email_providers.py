"""
OAuth2 integration for Gmail (Google) and Outlook (Microsoft Graph).
Supports multiple Gmail accounts simultaneously.
"""

import base64
import os
import re
import uuid
from datetime import datetime
from urllib.parse import urlencode

import httpx

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# ---------------------------------------------------------------------------
# In-memory token store
# gmail_accounts: dict of account_id -> {access_token, email, ...}
# outlook: single token dict (or None)
# ---------------------------------------------------------------------------
gmail_accounts: dict[str, dict] = {}
outlook_token: dict | None = None


# ============================= GMAIL =======================================

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
GOOGLE_GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me"
GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI", "http://localhost:8000/oauth/gmail/callback"
)
GOOGLE_SCOPES = "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email"


def google_authorize_url(state: str = "") -> str:
    client_id = os.getenv("GOOGLE_CLIENT_ID", "")
    if not client_id:
        raise RuntimeError("GOOGLE_CLIENT_ID not set in .env")
    params = {
        "client_id": client_id,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": GOOGLE_SCOPES,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


async def google_exchange_code(code: str) -> dict:
    """Exchange auth code for token, fetch user email, store as new account."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": os.getenv("GOOGLE_CLIENT_ID", ""),
                "client_secret": os.getenv("GOOGLE_CLIENT_SECRET", ""),
                "redirect_uri": GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        resp.raise_for_status()
        token_data = resp.json()

        info_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )
        email = "unknown"
        if info_resp.status_code == 200:
            email = info_resp.json().get("email", "unknown")

        account_id = email.replace("@", "_at_").replace(".", "_")
        token_data["email"] = email
        token_data["account_id"] = account_id
        gmail_accounts[account_id] = token_data

        return token_data


async def gmail_fetch_emails(account_id: str, max_results: int = 15) -> list[dict]:
    """Fetch recent emails from a specific Gmail account."""
    account = gmail_accounts.get(account_id)
    if not account:
        raise RuntimeError(f"Gmail account {account_id} not connected")

    access_token = account["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    async with httpx.AsyncClient() as client:
        list_resp = await client.get(
            f"{GOOGLE_GMAIL_API}/messages",
            headers=headers,
            params={"maxResults": max_results},
        )
        list_resp.raise_for_status()
        message_ids = [m["id"] for m in list_resp.json().get("messages", [])]

        results = []
        for mid in message_ids:
            msg_resp = await client.get(
                f"{GOOGLE_GMAIL_API}/messages/{mid}",
                headers=headers,
                params={"format": "full"},
            )
            if msg_resp.status_code != 200:
                continue
            results.append(_parse_gmail_message(msg_resp.json(), account_id))

    return results


async def gmail_fetch_all_accounts(max_results: int = 15) -> list[dict]:
    """Fetch emails from all connected Gmail accounts."""
    all_emails = []
    for account_id in list(gmail_accounts.keys()):
        try:
            emails = await gmail_fetch_emails(account_id, max_results)
            all_emails.extend(emails)
        except Exception as e:
            print(f"Failed to fetch from {account_id}: {e}")
    return all_emails


async def gmail_fetch_emails_with_token(token_data: dict, max_results: int = 15) -> list[dict]:
    """Fetch emails using a token dict directly (for per-session isolation)."""
    access_token = token_data["access_token"]
    account_id = token_data.get("account_id", "unknown")
    headers = {"Authorization": f"Bearer {access_token}"}

    async with httpx.AsyncClient() as client:
        list_resp = await client.get(
            f"{GOOGLE_GMAIL_API}/messages",
            headers=headers,
            params={"maxResults": max_results},
        )
        list_resp.raise_for_status()
        message_ids = [m["id"] for m in list_resp.json().get("messages", [])]

        results = []
        for mid in message_ids:
            msg_resp = await client.get(
                f"{GOOGLE_GMAIL_API}/messages/{mid}",
                headers=headers,
                params={"format": "full"},
            )
            if msg_resp.status_code != 200:
                continue
            results.append(_parse_gmail_message(msg_resp.json(), account_id))

    return results


def _parse_gmail_message(raw: dict, account_id: str) -> dict:
    headers = {h["name"].lower(): h["value"] for h in raw.get("payload", {}).get("headers", [])}
    body_plain, body_html = _extract_gmail_body(raw.get("payload", {}))
    ts = int(raw.get("internalDate", "0")) / 1000
    auth = _parse_auth_results(headers.get("authentication-results", ""))
    msg = {
        "id": f"gmail-{account_id}-{raw['id']}",
        "sender": headers.get("from", "Unknown"),
        "subject": headers.get("subject", "(no subject)"),
        "body": body_plain,
        "timestamp": datetime.fromtimestamp(ts).isoformat() if ts else datetime.now().isoformat(),
        "type": "email",
        "source": "gmail",
        "account_id": account_id,
        "auth": auth,
    }
    if body_html:
        msg["body_html"] = body_html
    return msg


def _parse_auth_results(header_value: str) -> dict:
    """Extract SPF, DKIM, and DMARC pass/fail/none from Authentication-Results header."""
    result = {"spf": "unknown", "dkim": "unknown", "dmarc": "unknown"}
    if not header_value:
        return result
    val = header_value.lower()
    for check in ("spf", "dkim", "dmarc"):
        if f"{check}=pass" in val:
            result[check] = "pass"
        elif f"{check}=fail" in val or f"{check}=softfail" in val:
            result[check] = "fail"
        elif f"{check}=none" in val or f"{check}=neutral" in val:
            result[check] = "none"
    return result


def _strip_html(html: str) -> str:
    """Convert HTML email to readable plain text."""
    text = re.sub(r"<style[^>]*>.*?</style>", "", html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<script[^>]*>.*?</script>", "", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<!--.*?-->", "", text, flags=re.DOTALL)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</(p|div|tr|li|h[1-6])>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"&nbsp;", " ", text)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"&lt;", "<", text)
    text = re.sub(r"&gt;", ">", text)
    text = re.sub(r"&quot;", '"', text)
    text = re.sub(r"&#?\w+;", "", text)
    lines = [line.strip() for line in text.splitlines()]
    text = "\n".join(line for line in lines if line)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()[:5000]


def _extract_gmail_body(payload: dict) -> tuple[str, str | None]:
    """Extract both plain text and original HTML from Gmail payload.
    Returns (plain_text, html_or_none)."""
    plain = _extract_by_mime(payload, "text/plain")
    html = _extract_by_mime(payload, "text/html")

    if plain and html:
        return plain, html
    if plain:
        return plain, None
    if html:
        return _strip_html(html), html

    if payload.get("body", {}).get("data"):
        raw = base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8", errors="replace")
        if "<html" in raw.lower() or "<body" in raw.lower():
            return _strip_html(raw), raw
        return raw, None

    return "(unable to extract message body)", None


def _extract_by_mime(payload: dict, mime_type: str) -> str | None:
    """Recursively find a part matching the given MIME type."""
    if payload.get("mimeType") == mime_type and payload.get("body", {}).get("data"):
        return base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8", errors="replace")
    for part in payload.get("parts", []):
        result = _extract_by_mime(part, mime_type)
        if result:
            return result
    return None


# ============================= OUTLOOK =====================================

MS_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
MS_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
MS_GRAPH_API = "https://graph.microsoft.com/v1.0"
MS_REDIRECT_URI = os.getenv(
    "MICROSOFT_REDIRECT_URI", "http://localhost:8000/oauth/outlook/callback"
)
MS_SCOPES = "openid email Mail.Read"


def microsoft_authorize_url(state: str = "") -> str:
    client_id = os.getenv("MICROSOFT_CLIENT_ID", "")
    if not client_id:
        raise RuntimeError("MICROSOFT_CLIENT_ID not set in .env")
    params = {
        "client_id": client_id,
        "redirect_uri": MS_REDIRECT_URI,
        "response_type": "code",
        "scope": MS_SCOPES,
        "response_mode": "query",
        "state": state,
    }
    return f"{MS_AUTH_URL}?{urlencode(params)}"


async def microsoft_exchange_code(code: str) -> dict:
    global outlook_token
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            MS_TOKEN_URL,
            data={
                "code": code,
                "client_id": os.getenv("MICROSOFT_CLIENT_ID", ""),
                "client_secret": os.getenv("MICROSOFT_CLIENT_SECRET", ""),
                "redirect_uri": MS_REDIRECT_URI,
                "grant_type": "authorization_code",
                "scope": MS_SCOPES,
            },
        )
        resp.raise_for_status()
        token_data = resp.json()
        outlook_token = token_data
        return token_data


async def outlook_fetch_emails(max_results: int = 15) -> list[dict]:
    """Fetch recent emails from Microsoft Graph."""
    if not outlook_token:
        raise RuntimeError("Outlook not connected")

    access_token = outlook_token["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{MS_GRAPH_API}/me/messages",
            headers=headers,
            params={
                "$top": max_results,
                "$orderby": "receivedDateTime desc",
                "$select": "id,subject,from,body,receivedDateTime",
            },
        )
        resp.raise_for_status()
        raw_messages = resp.json().get("value", [])

    return [_parse_outlook_message(m) for m in raw_messages]


def _parse_outlook_message(raw: dict) -> dict:
    sender = raw.get("from", {}).get("emailAddress", {})
    sender_str = sender.get("address", "Unknown")
    if sender.get("name"):
        sender_str = f"{sender['name']} <{sender_str}>"

    raw_body = raw.get("body", {}).get("content", "")
    is_html = raw.get("body", {}).get("contentType") == "html"
    body_plain = _strip_html(raw_body) if is_html else raw_body

    ts = raw.get("receivedDateTime", datetime.now().isoformat())

    msg = {
        "id": f"outlook-{raw['id'][:16]}",
        "sender": sender_str,
        "subject": raw.get("subject", "(no subject)"),
        "body": body_plain or "(empty message)",
        "timestamp": ts,
        "type": "email",
        "source": "outlook",
    }
    if is_html and raw_body:
        msg["body_html"] = raw_body
    return msg


async def outlook_fetch_emails_with_token(token_data: dict, max_results: int = 15) -> list[dict]:
    """Fetch emails using a token dict directly (for per-session isolation)."""
    access_token = token_data["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{MS_GRAPH_API}/me/messages",
            headers=headers,
            params={
                "$top": max_results,
                "$orderby": "receivedDateTime desc",
                "$select": "id,subject,from,body,receivedDateTime",
            },
        )
        resp.raise_for_status()
        raw_messages = resp.json().get("value", [])

    return [_parse_outlook_message(m) for m in raw_messages]
