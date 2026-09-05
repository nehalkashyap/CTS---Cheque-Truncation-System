"""
Cheque verification pipeline.

Architecture (see spec section 42):

    Cheque Image
          v
    Image Processing        (field localization -- production: YOLO)
          v
    ML / Verification Models
        - handwritten amount reconstruction  (production: TrOCR)
        - signature similarity               (production: Siamese network)
        - MICR extraction
        - date validation
          v
    Rules Engine             (services/risk_engine.py -- the ONLY decision-maker)
          v
    Verification Decision
          v
    Database / Notifications / AI Assistant explanation

For the hackathon prototype, each ML stage is simulated with seeded
randomness so demo scenarios are reproducible, but the module boundaries
match where real models would plug in.
"""
import datetime
import random
from dateutil import parser as date_parser

from app.services import risk_engine

STAGE_LABELS = [
    "Image quality",
    "Cheque boundaries detected",
    "Bank information detected",
    "Reading MICR",
    "Comparing signature",
    "Validating amount",
    "Checking date",
]

# Demo Mode presets so the hackathon demo can reliably show each rejection path.
DEMO_SCENARIOS = {
    "success": dict(image_quality=(90, 99), signature_score=(88, 97), micr_score=(90, 99),
                    amount_match=True, date_valid=True, is_stale=False, is_duplicate=False,
                    bank_error=False, force_manual_review=False),
    "signature_mismatch": dict(image_quality=(88, 97), signature_score=(45, 65), micr_score=(88, 97),
                                amount_match=True, date_valid=True, is_stale=False, is_duplicate=False,
                                bank_error=False, force_manual_review=False),
    "amount_mismatch": dict(image_quality=(85, 96), signature_score=(85, 95), micr_score=(88, 97),
                             amount_match=False, date_valid=True, is_stale=False, is_duplicate=False,
                             bank_error=False, force_manual_review=False),
    "stale_cheque": dict(image_quality=(85, 96), signature_score=(85, 95), micr_score=(88, 97),
                          amount_match=True, date_valid=True, is_stale=True, is_duplicate=False,
                          bank_error=False, force_manual_review=False),
    "unreadable_micr": dict(image_quality=(80, 92), signature_score=(85, 95), micr_score=(35, 60),
                             amount_match=True, date_valid=True, is_stale=False, is_duplicate=False,
                             bank_error=False, force_manual_review=False),
    "bank_error": dict(image_quality=(85, 96), signature_score=(85, 95), micr_score=(85, 96),
                        amount_match=True, date_valid=True, is_stale=False, is_duplicate=False,
                        bank_error=True, force_manual_review=False),
    "manual_review": dict(image_quality=(76, 84), signature_score=(76, 82), micr_score=(76, 84),
                           amount_match=True, date_valid=True, is_stale=False, is_duplicate=False,
                           bank_error=False, force_manual_review=True),
    "poor_image": dict(image_quality=(30, 55), signature_score=(70, 85), micr_score=(50, 70),
                        amount_match=True, date_valid=True, is_stale=False, is_duplicate=False,
                        bank_error=False, force_manual_review=False),
}


def _roll(bounds):
    lo, hi = bounds
    return round(random.uniform(lo, hi), 1)


def _is_stale(cheque_date_str: str) -> bool:
    try:
        d = date_parser.parse(cheque_date_str, dayfirst=True)
    except Exception:
        return False
    return (datetime.datetime.utcnow() - d).days > 90


def run_pipeline(cheque_date: str, amount_numeric: float, amount_words: str,
                  demo_scenario: str | None = None) -> dict:
    """
    Simulates the full verification pipeline and returns everything needed to
    persist a VerificationResult and render the processing/result screens.
    """
    scenario_key = demo_scenario if demo_scenario in DEMO_SCENARIOS else "success"
    preset = DEMO_SCENARIOS[scenario_key]

    checks = {
        "image_quality": _roll(preset["image_quality"]),
        "signature_score": _roll(preset["signature_score"]),
        "micr_score": _roll(preset["micr_score"]),
        "amount_match": preset["amount_match"],
        "date_valid": True,
        "is_stale": False,
        "is_duplicate": preset["is_duplicate"],
        "bank_error": preset["bank_error"],
        "force_manual_review": preset["force_manual_review"],
    }

    result = risk_engine.evaluate(checks)

    micr = f"{random.randint(100000, 999999)}{random.randint(10, 99)}{random.randint(1000, 9999)}"

    timeline = [
        {"label": "Submitted", "done": True},
        {"label": "Image analyzed", "done": True},
        {"label": "Signature verified", "done": True, "score": checks["signature_score"]},
        {"label": "Amount validated", "done": True, "passed": checks["amount_match"]},
        {"label": "MICR validated", "done": True, "score": checks["micr_score"]},
        {
            "label": "Accepted" if result["decision"] == "accepted"
            else "Manual review" if result["decision"] == "manual_review"
            else "Rejected",
            "done": True,
        },
    ]

    return {
        "checks": checks,
        "micr": micr,
        "result": result,
        "timeline": timeline,
        "scenario": scenario_key,
    }
