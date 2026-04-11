"""
Campaign detection engine.
Groups similar threats by sender domain, impersonated brand, and attack techniques.
"""

from difflib import SequenceMatcher
from collections import defaultdict

campaigns_store: dict[str, dict] = {}


def _sender_domain(sender: str) -> str:
    if "@" in sender:
        return sender.split("@")[-1].strip().lower().rstrip(">")
    return sender.strip().lower()


def _similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def assign_campaign(
    msg_id: str,
    msg: dict,
    analysis: dict,
    messages_store: dict,
    analysis_cache: dict,
):
    """Try to assign a message to an existing campaign or create a new one."""
    if analysis.get("severity") == "safe":
        return

    msg_domain = _sender_domain(msg.get("sender", ""))
    msg_brand = analysis.get("impersonated_brand")
    msg_techniques = set(analysis.get("attack_techniques", []))

    best_campaign = None
    best_score = 0

    for cid, campaign in campaigns_store.items():
        score = 0
        if campaign["domain"] == msg_domain and msg_domain:
            score += 0.5
        if msg_brand and campaign.get("impersonated_brand") == msg_brand:
            score += 0.4
        if msg_techniques & set(campaign.get("attack_techniques", [])):
            score += 0.2
        for existing_subject in campaign.get("subjects", []):
            if _similarity(msg.get("subject", ""), existing_subject) > 0.6:
                score += 0.3
                break
        if score > best_score and score >= 0.5:
            best_score = score
            best_campaign = cid

    if best_campaign:
        campaigns_store[best_campaign]["message_ids"].add(msg_id)
        campaigns_store[best_campaign]["subjects"].add(msg.get("subject", ""))
        campaigns_store[best_campaign]["last_seen"] = msg.get("timestamp", "")
        techniques = set(campaigns_store[best_campaign].get("attack_techniques", []))
        techniques.update(msg_techniques)
        campaigns_store[best_campaign]["attack_techniques"] = list(techniques)
        severity = analysis.get("severity", "suspicious")
        if severity == "dangerous":
            campaigns_store[best_campaign]["severity"] = "dangerous"
        analysis["campaign_id"] = best_campaign
    else:
        if analysis.get("severity") in ("suspicious", "dangerous"):
            cid = f"camp-{msg_domain[:10]}-{len(campaigns_store) + 1}"
            brand = msg_brand or msg_domain
            campaigns_store[cid] = {
                "id": cid,
                "name": f"{brand} {analysis.get('category', 'threat')} campaign",
                "domain": msg_domain,
                "impersonated_brand": msg_brand,
                "severity": analysis.get("severity", "suspicious"),
                "attack_techniques": list(msg_techniques),
                "message_ids": {msg_id},
                "subjects": {msg.get("subject", "")},
                "first_seen": msg.get("timestamp", ""),
                "last_seen": msg.get("timestamp", ""),
            }
            analysis["campaign_id"] = cid


def detect_all_campaigns(messages_store: dict, analysis_cache: dict):
    """Re-detect campaigns across all analyzed messages."""
    campaigns_store.clear()
    for msg_id, analysis in analysis_cache.items():
        msg = messages_store.get(msg_id, {})
        if msg:
            assign_campaign(msg_id, msg, analysis, messages_store, analysis_cache)


def get_campaigns(messages_store: dict, analysis_cache: dict) -> list[dict]:
    """Return campaigns with serializable data."""
    result = []
    for cid, c in campaigns_store.items():
        result.append({
            "id": c["id"],
            "name": c["name"],
            "severity": c["severity"],
            "message_count": len(c["message_ids"]),
            "impersonated_brand": c.get("impersonated_brand"),
            "attack_techniques": c.get("attack_techniques", []),
            "first_seen": c.get("first_seen", ""),
            "last_seen": c.get("last_seen", ""),
        })
    result.sort(key=lambda x: x["message_count"], reverse=True)
    return result
