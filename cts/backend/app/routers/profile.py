import os
import uuid
import secrets
import datetime

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User, Signature
from app.schemas.schemas import ProfileUpdateRequest, UserOut, SignatureOut, SignatureAnalyzeResponse
from app.services.signature_analysis import analyze_signature_image, verdict_for_score
from app.services.sms import SmsConfigurationError, SmsDeliveryError, send_otp_sms
from app.utils.deps import get_current_user

router = APIRouter(tags=["profile"])

SIGNATURE_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "signatures")
os.makedirs(SIGNATURE_DIR, exist_ok=True)


@router.get("/profile", response_model=UserOut)
def get_profile(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@router.put("/profile", response_model=UserOut)
def update_profile(payload: ProfileUpdateRequest, current_user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    if payload.phone is not None and payload.phone != current_user.phone:
        current_user.phone_verified = False
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return UserOut.model_validate(current_user)


@router.post("/profile/phone/request-otp")
def request_phone_otp(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.phone.strip():
        raise HTTPException(status_code=400, detail="Add a phone number to your profile first")
    otp = f"{secrets.randbelow(1_000_000):06d}"
    current_user.phone_otp = otp
    current_user.phone_otp_expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
    try:
        send_otp_sms(current_user.phone, otp, "phone verification")
    except SmsConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except SmsDeliveryError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    db.commit()
    return {"message": "A verification OTP was sent to your phone."}


@router.post("/profile/phone/verify-otp")
def verify_phone_otp(otp: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.phone_otp or not current_user.phone_otp_expires_at:
        raise HTTPException(status_code=400, detail="Request a phone verification OTP first")
    if datetime.datetime.utcnow() > current_user.phone_otp_expires_at or not secrets.compare_digest(otp, current_user.phone_otp):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    current_user.phone_verified = True
    current_user.phone_otp = ""
    current_user.phone_otp_expires_at = None
    db.commit()
    return {"message": "Phone number verified successfully", "phone_verified": True}


@router.get("/profile/signature", response_model=SignatureOut | None)
def get_signature(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sig = (
        db.query(Signature)
        .filter(Signature.user_id == current_user.id, Signature.is_active == True)  # noqa: E712
        .order_by(Signature.created_at.desc())
        .first()
    )
    return SignatureOut.model_validate(sig) if sig else None


@router.post("/profile/signature", response_model=SignatureOut)
async def upload_signature(file: UploadFile = File(...), current_user: User = Depends(get_current_user),
                            db: Session = Depends(get_db)):
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty file upload")

    scores = analyze_signature_image(file_bytes)

    ext = os.path.splitext(file.filename or "signature.png")[1] or ".png"
    filename = f"{current_user.id}_{uuid.uuid4().hex[:8]}{ext}"
    path = os.path.join(SIGNATURE_DIR, filename)
    with open(path, "wb") as f:
        f.write(file_bytes)

    # Deactivate previous signatures; the newest enrolled one becomes the reference.
    db.query(Signature).filter(Signature.user_id == current_user.id).update({"is_active": False})

    sig = Signature(
        user_id=current_user.id,
        image_path=f"/uploads/signatures/{filename}",
        **scores,
    )
    db.add(sig)
    db.commit()
    db.refresh(sig)
    return SignatureOut.model_validate(sig)


@router.post("/profile/signature/analyze", response_model=SignatureAnalyzeResponse)
async def analyze_signature(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    file_bytes = await file.read()
    scores = analyze_signature_image(file_bytes)
    verdict, suggestions = verdict_for_score(scores["quality_score"])
    return SignatureAnalyzeResponse(**scores, verdict=verdict, suggestions=suggestions)
