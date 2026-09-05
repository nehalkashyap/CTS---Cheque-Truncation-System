import random

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User
from app.schemas.schemas import LocationVerificationRequest, CaptchaVerifyRequest
from app.utils.deps import get_current_user

router = APIRouter(prefix="/security", tags=["security"])


@router.post("/location-verification")
def location_verification(payload: LocationVerificationRequest, current_user: User = Depends(get_current_user)):
    is_new_location = payload.city.strip().lower() != (current_user.last_known_city or "").strip().lower()
    return {
        "is_new_location": is_new_location,
        "message": (
            "This cheque upload appears to be coming from a location that differs from your "
            "usual activity. For your protection, please verify this activity."
            if is_new_location else "Location verified."
        ),
    }


@router.get("/captcha")
def get_captcha():
    # Mock CAPTCHA for the prototype — a real deployment would use a vetted
    # provider and never store the answer in plaintext client-side.
    code = "".join(random.choices("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", k=5))
    return {"code": code}


@router.post("/captcha")
def verify_captcha(payload: CaptchaVerifyRequest):
    verified = payload.code.strip().upper() == payload.expected.strip().upper()
    return {"verified": verified, "message": "Identity verified" if verified else "Code did not match. Try again."}
