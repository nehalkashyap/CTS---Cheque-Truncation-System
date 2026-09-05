"""
CTS Assistant.

IMPORTANT ARCHITECTURE RULE: this module only ever reads verification data
that the risk engine already produced (see services/risk_engine.py) and
turns it into plain-language explanations. It never computes a decision,
never re-scores a cheque, and never decides an escalation is warranted on
its own judgement -- escalation only happens via an explicit ticket the
user (or this module, echoing the user's own request) asks CTS to create.
"""
import re

ESCALATION_PATTERNS = [
    r"\bspeak to a (person|human|agent)\b",
    r"\btalk to a (person|human|agent)\b",
    r"\bhuman (agent|support|help)\b",
    r"\breal person\b",
    r"\bescalate\b",
    r"\bcustomer support\b",
    r"\bcontact support\b",
]

GREETING_PATTERNS = [r"^\s*(hi|hello|hey)\b"]
CALL_CENTER_HELPLINE = "1800-123-4567"


def wants_escalation(message: str) -> bool:
    m = message.lower()
    return any(re.search(p, m) for p in ESCALATION_PATTERNS)


def is_greeting(message: str) -> bool:
    m = message.lower()
    return any(re.search(p, m) for p in GREETING_PATTERNS)


def explain_cheque(cheque, verification_result) -> str:
    """Builds a plain-language explanation from a persisted Cheque + VerificationResult."""
    if cheque.status == "accepted":
        return (
            f"Cheque {cheque.display_id} for ₹{cheque.amount_numeric:,.0f} was accepted. "
            f"All verification checks passed with an overall confidence of "
            f"{cheque.verification_score:.1f}%."
        )
    if cheque.status == "manual_review":
        return (
            f"Cheque {cheque.display_id} is under manual review. Its verification scores "
            f"were borderline, so a CTS reviewer is confirming the outcome rather than the "
            f"automated system deciding on its own."
        )
    reason_label = cheque.rejection_reason.replace("_", " ").title()
    sig_score = None
    if verification_result:
        sig_score = verification_result.signature_score
    detail = f" Similarity score: {sig_score:.1f}%." if sig_score is not None and cheque.rejection_reason == "SIGNATURE_MISMATCH" else ""
    return (
        f"Your cheque {cheque.display_id} was rejected because of: {reason_label}.{detail} "
        f"{cheque.rejection_message}"
    )


def reply_to(message: str, user_name: str, latest_cheque=None, verification_result=None) -> dict:
    """
    Returns {"content": str, "quick_actions": [str], "should_escalate": bool}
    """
    if wants_escalation(message):
        return {
            "content": (
                "I can connect you with a CTS support agent.\n\n"
                + (f"Reason for escalation: {latest_cheque.rejection_reason.replace('_', ' ').title()}"
                   if latest_cheque and latest_cheque.status == "rejected"
                   else "Reason for escalation: General assistance requested")
            ),
            "quick_actions": ["Create Support Ticket"],
            "should_escalate": True,
        }

    if is_greeting(message):
        return {
            "content": f"Hi {user_name.split()[0] if user_name else 'there'}. How can I help?",
            "quick_actions": [],
            "should_escalate": False,
        }

    lowered = message.lower()

    if "why" in lowered and ("reject" in lowered or "fail" in lowered):
        if latest_cheque and latest_cheque.status in ("rejected", "manual_review"):
            return {
                "content": explain_cheque(latest_cheque, verification_result),
                "quick_actions": ["Upload Cheque", "Create Support Ticket"],
                "should_escalate": False,
            }
        return {
            "content": "I don't see a rejected cheque on your account right now. Would you like to upload one?",
            "quick_actions": ["Upload Cheque"],
            "should_escalate": False,
        }

    if "status" in lowered or "processing" in lowered:
        if latest_cheque:
            return {
                "content": (
                    f"Your most recent cheque {latest_cheque.display_id} is currently "
                    f"'{latest_cheque.status.replace('_', ' ')}'."
                ),
                "quick_actions": [],
                "should_escalate": False,
            }
        return {
            "content": "You don't have any cheques in progress yet. Want to deposit one?",
            "quick_actions": ["Upload Cheque"],
            "should_escalate": False,
        }

    if "what should i do" in lowered or "next" in lowered or "how do i fix" in lowered:
        if latest_cheque and latest_cheque.status == "rejected":
            return {
                "content": (
                    f"Try uploading a clearer cheque image, paying attention to the reason noted: "
                    f"{latest_cheque.rejection_reason.replace('_', ' ').lower()}. "
                    f"Would you like me to help you upload another cheque?"
                ),
                "quick_actions": ["Upload Cheque"],
                "should_escalate": False,
            }

    if "signature" in lowered:
        return {
            "content": (
                "Your enrolled signature is used as the reference CTS compares against every "
                "cheque you deposit. If matches keep failing, try re-enrolling your signature "
                "with a clearer, high-contrast image from the Profile page."
            ),
            "quick_actions": [],
            "should_escalate": False,
        }

    return {
        "content": (
            "I’m unable to resolve that request here. Please call the CTS Call Center at "
            f"{CALL_CENTER_HELPLINE} for further assistance, or create a support ticket."
        ),
        "quick_actions": ["Create Support Ticket"],
        "should_escalate": False,
    }
