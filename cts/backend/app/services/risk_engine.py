"""
Deterministic risk / decision engine.

This is the ONLY component permitted to decide a cheque's outcome. The AI
assistant (services/chatbot.py) only ever reads the structured result this
engine produces and explains it in plain language — it never re-evaluates
or overrides a decision.

Thresholds are centralized here so they can be tuned or made configurable
per-bank without touching the pipeline that calls this module.
"""

THRESHOLDS = {
    "image_quality": 70,
    "signature_match": 75,
    "micr_confidence": 70,
}

REJECTION_MESSAGES = {
    "POOR_IMAGE_QUALITY": {
        "label": "Poor image quality",
        "message": (
            "The uploaded cheque image was too unclear for CTS to confidently "
            "read the printed and handwritten fields."
        ),
        "action": "Upload a clearer cheque image, taken in good lighting on a flat surface.",
    },
    "SIGNATURE_MISMATCH": {
        "label": "Signature mismatch",
        "message": (
            "Your uploaded signature has a low similarity score compared with "
            "your enrolled reference signature."
        ),
        "action": "Upload a clearer cheque image or contact a CTS support agent.",
    },
    "AMOUNT_MISMATCH": {
        "label": "Amount mismatch",
        "message": (
            "The numerical amount on the cheque does not match the amount "
            "written in words."
        ),
        "action": "Re-upload the cheque or contact CTS support to correct the amount.",
    },
    "STALE_CHEQUE": {
        "label": "Stale cheque",
        "message": "This cheque is dated more than 3 months ago and can no longer be processed.",
        "action": "Request a fresh cheque from the payer.",
    },
    "INVALID_DATE": {
        "label": "Invalid date",
        "message": "The cheque date is invalid or postdated beyond an acceptable range.",
        "action": "Confirm the cheque date with the payer and upload again.",
    },
    "UNREADABLE_MICR": {
        "label": "Unreadable MICR",
        "message": "CTS could not confidently read the MICR line at the bottom of the cheque.",
        "action": "Upload a cheque image where the bottom MICR band is fully visible and unobstructed.",
    },
    "BANK_VERIFICATION_ERROR": {
        "label": "Bank verification error",
        "message": "CTS was unable to verify this cheque with the issuing bank at this time.",
        "action": "Try again shortly, or contact CTS support if the issue persists.",
    },
    "DUPLICATE_CHEQUE": {
        "label": "Duplicate cheque",
        "message": "A cheque with matching MICR and amount details has already been processed.",
        "action": "Contact CTS support if you believe this is an error.",
    },
    "MANUAL_REVIEW_REQUIRED": {
        "label": "Manual review required",
        "message": "This cheque has borderline verification scores and needs a specialist's review.",
        "action": "No action needed — a CTS reviewer will confirm the outcome shortly.",
    },
}


def evaluate(checks: dict) -> dict:
    """
    checks: {
        "image_quality": float 0-100,
        "signature_score": float 0-100,
        "amount_match": bool,
        "date_valid": bool,
        "is_stale": bool,
        "micr_score": float 0-100,
        "is_duplicate": bool,
        "bank_error": bool,
        "force_manual_review": bool,
    }
    Returns: {"decision": "accepted"|"rejected"|"manual_review", "reason": str|"", ...meta}
    """
    reason_code = ""
    decision = "accepted"

    if checks.get("bank_error"):
        decision, reason_code = "rejected", "BANK_VERIFICATION_ERROR"
    elif checks.get("is_duplicate"):
        decision, reason_code = "rejected", "DUPLICATE_CHEQUE"
    elif checks["image_quality"] < THRESHOLDS["image_quality"]:
        decision, reason_code = "rejected", "POOR_IMAGE_QUALITY"
    elif checks["signature_score"] < THRESHOLDS["signature_match"]:
        decision, reason_code = "rejected", "SIGNATURE_MISMATCH"
    elif not checks.get("amount_match", True):
        decision, reason_code = "rejected", "AMOUNT_MISMATCH"
    elif checks.get("force_manual_review"):
        decision, reason_code = "manual_review", "MANUAL_REVIEW_REQUIRED"

    confidence = round(
        (checks["image_quality"] * 0.25)
        + (checks["signature_score"] * 0.35)
        + (checks["micr_score"] * 0.2)
        + ((100 if checks.get("amount_match", True) else 40) * 0.1)
        + ((100 if checks.get("date_valid", True) else 30) * 0.1),
        1,
    )

    meta = REJECTION_MESSAGES.get(reason_code, {})
    return {
        "decision": decision,
        "reason": reason_code,
        "reason_label": meta.get("label", ""),
        "message": meta.get("message", ""),
        "action": meta.get("action", ""),
        "confidence": confidence,
    }
