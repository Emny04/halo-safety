"""
Security score engine.
Calculates an inbox security score and generates summary statistics.
"""

from collections import Counter
import campaigns as campaign_engine


def calculate_score(messages_store: dict, analysis_cache: dict) -> dict:
    total = len(messages_store)
    analyzed = len(analysis_cache)
    if total == 0:
        return {"score": 100, "grade": "A", "breakdown": {
            "threat_ratio": 0, "campaigns_active": 0,
            "actions_taken": 0, "repeat_offenders": 0,
        }}

    dangerous = sum(1 for a in analysis_cache.values() if a.get("severity") == "dangerous")
    suspicious = sum(1 for a in analysis_cache.values() if a.get("severity") == "suspicious")
    safe = sum(1 for a in analysis_cache.values() if a.get("severity") == "safe")

    actions_taken = sum(
        1 for m in messages_store.values()
        if m.get("blocked") or m.get("spam") or m.get("quarantined") or m.get("reported")
    )

    campaigns_active = len(campaign_engine.campaigns_store)

    sender_counts = Counter()
    for mid, a in analysis_cache.items():
        if a.get("severity") in ("dangerous", "suspicious"):
            msg = messages_store.get(mid, {})
            sender = msg.get("sender", "")
            if "@" in sender:
                domain = sender.split("@")[-1].strip().lower().rstrip(">")
                sender_counts[domain] += 1
    repeat_offenders = sum(1 for c in sender_counts.values() if c >= 2)

    threat_ratio = (dangerous * 3 + suspicious) / max(total, 1)
    campaign_penalty = min(campaigns_active * 5, 20)
    repeat_penalty = min(repeat_offenders * 5, 15)
    action_bonus = min(actions_taken * 3, 15)
    unanalyzed_penalty = max(0, (total - analyzed)) / max(total, 1) * 10

    score = max(0, min(100, int(
        100 - threat_ratio * 15 - campaign_penalty - repeat_penalty
        + action_bonus - unanalyzed_penalty
    )))

    if score >= 90:
        grade = "A"
    elif score >= 75:
        grade = "B"
    elif score >= 60:
        grade = "C"
    elif score >= 40:
        grade = "D"
    else:
        grade = "F"

    return {
        "score": score,
        "grade": grade,
        "breakdown": {
            "threat_ratio": round(threat_ratio, 2),
            "campaigns_active": campaigns_active,
            "actions_taken": actions_taken,
            "repeat_offenders": repeat_offenders,
        },
        "counts": {
            "total": total,
            "analyzed": analyzed,
            "dangerous": dangerous,
            "suspicious": suspicious,
            "safe": safe,
        },
    }


def get_summary(messages_store: dict, analysis_cache: dict) -> dict:
    """Generate summary stats for the intelligence dashboard."""
    categories = Counter()
    techniques = Counter()
    brands = Counter()
    severity_dist = Counter()

    for a in analysis_cache.values():
        categories[a.get("category", "unknown")] += 1
        severity_dist[a.get("severity", "unknown")] += 1
        for t in a.get("attack_techniques", []):
            techniques[t] += 1
        brand = a.get("impersonated_brand")
        if brand:
            brands[brand] += 1

    total_threats = sum(
        1 for a in analysis_cache.values()
        if a.get("severity") in ("dangerous", "suspicious")
    )
    total_blocked = sum(
        1 for m in messages_store.values()
        if m.get("blocked") or m.get("spam") or m.get("quarantined")
    )

    return {
        "threats_detected": total_threats,
        "threats_blocked": total_blocked,
        "messages_scanned": len(analysis_cache),
        "categories": dict(categories),
        "severity_distribution": dict(severity_dist),
        "top_techniques": dict(techniques.most_common(10)),
        "top_impersonated_brands": dict(brands.most_common(5)),
        "campaigns_active": len(campaign_engine.campaigns_store),
    }
