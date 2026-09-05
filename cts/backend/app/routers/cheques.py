import json
import os
import uuid
import datetime
import secrets

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User, BankAccount, Cheque, VerificationResult, Notification
from app.schemas.schemas import ChequeOut, VerificationResultOut
from app.services import cheque_verification
from app.services.sms import SmsConfigurationError, SmsDeliveryError, send_otp_sms
from app.utils.deps import get_current_user

router = APIRouter(prefix="/cheques", tags=["cheques"])

CHEQUE_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "cheques")
os.makedirs(CHEQUE_DIR, exist_ok=True)


def _next_display_id(db: Session) -> str:
    count = db.query(Cheque).count()
    return f"CTS-{2470 + count + 1:06d}"


def _to_out(cheque: Cheque) -> ChequeOut:
    return ChequeOut(
        id=cheque.id,
        display_id=cheque.display_id,
        bank_account_id=cheque.bank_account_id,
        bank_name=cheque.bank_account.bank_name if cheque.bank_account else "",
        amount_numeric=cheque.amount_numeric,
        amount_words=cheque.amount_words,
        payee=cheque.payee,
        micr=cheque.micr,
        cheque_date=cheque.cheque_date,
        status=cheque.status,
        rejection_reason=cheque.rejection_reason,
        rejection_message=cheque.rejection_message,
        verification_score=cheque.verification_score,
        created_at=cheque.created_at,
        processed_at=cheque.processed_at,
    )


@router.post("", response_model=ChequeOut)
async def create_cheque(
    bank_account_id: str = Form(...),
    amount_numeric: float = Form(...),
    amount_words: str = Form(""),
    payee: str = Form(""),
    cheque_date: str = Form(""),
    demo_scenario: str = Form(""),
    file: UploadFile | None = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    acc = db.query(BankAccount).filter(BankAccount.id == bank_account_id,
                                        BankAccount.user_id == current_user.id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Bank account not found")

    image_path = ""
    if file is not None:
        file_bytes = await file.read()
        ext = os.path.splitext(file.filename or "cheque.jpg")[1] or ".jpg"
        filename = f"{current_user.id}_{uuid.uuid4().hex[:8]}{ext}"
        path = os.path.join(CHEQUE_DIR, filename)
        with open(path, "wb") as f:
            f.write(file_bytes)
        image_path = f"/uploads/cheques/{filename}"

    cheque = Cheque(
        display_id=_next_display_id(db),
        user_id=current_user.id,
        bank_account_id=acc.id,
        image_path=image_path,
        amount_numeric=amount_numeric,
        amount_words=amount_words,
        payee=payee or current_user.name,
        cheque_date=cheque_date,
        status="processing",
        demo_scenario=demo_scenario,
    )
    db.add(cheque)
    db.commit()
    db.refresh(cheque)
    return _to_out(cheque)


@router.get("", response_model=list[ChequeOut])
def list_cheques(status: str | None = None, current_user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    q = db.query(Cheque).filter(Cheque.user_id == current_user.id)
    if status == "progress":
        q = q.filter(Cheque.status.in_(["processing", "manual_review"]))
    elif status and status != "all":
        q = q.filter(Cheque.status == status)
    cheques = q.order_by(Cheque.created_at.desc()).all()
    return [_to_out(c) for c in cheques]


@router.get("/{cheque_id}", response_model=ChequeOut)
def get_cheque(cheque_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cheque = db.query(Cheque).filter(Cheque.id == cheque_id, Cheque.user_id == current_user.id).first()
    if not cheque:
        raise HTTPException(status_code=404, detail="Cheque not found")
    return _to_out(cheque)


@router.get("/{cheque_id}/timeline")
def get_cheque_timeline(cheque_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cheque = db.query(Cheque).filter(Cheque.id == cheque_id, Cheque.user_id == current_user.id).first()
    if not cheque:
        raise HTTPException(status_code=404, detail="Cheque not found")
    vr = cheque.verification_result
    timeline = json.loads(vr.timeline_json) if vr else []
    breakdown = {}
    if vr:
        breakdown = {
            "Image Quality": vr.image_quality,
            "Signature Match": vr.signature_score,
            "Amount Match": 100 if vr.amount_match else 0,
            "MICR Confidence": vr.micr_score,
            "Date Validity": 100 if vr.date_valid else 0,
        }
    return {"timeline": timeline, "breakdown": breakdown}


@router.post("/{cheque_id}/request-otp")
def request_cheque_otp(cheque_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cheque = db.query(Cheque).filter(Cheque.id == cheque_id, Cheque.user_id == current_user.id).first()
    if not cheque:
        raise HTTPException(status_code=404, detail="Cheque not found")
    if not current_user.phone_verified:
        raise HTTPException(status_code=400, detail="Verify your phone number in Profile before processing a cheque")
    otp = f"{secrets.randbelow(1_000_000):06d}"
    cheque.otp_code = otp
    cheque.otp_expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
    cheque.otp_verified = False
    try:
        send_otp_sms(current_user.phone, otp, "cheque processing")
    except SmsConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except SmsDeliveryError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    db.commit()
    return {"message": "A processing OTP was sent to your phone."}


@router.post("/{cheque_id}/verify-otp")
def verify_cheque_otp(cheque_id: str, otp: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cheque = db.query(Cheque).filter(Cheque.id == cheque_id, Cheque.user_id == current_user.id).first()
    if not cheque:
        raise HTTPException(status_code=404, detail="Cheque not found")
    if not cheque.otp_code or not cheque.otp_expires_at:
        raise HTTPException(status_code=400, detail="Request a cheque processing OTP first")
    if datetime.datetime.utcnow() > cheque.otp_expires_at or not secrets.compare_digest(otp, cheque.otp_code):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    cheque.otp_verified = True
    cheque.otp_code = ""
    cheque.otp_expires_at = None
    db.commit()
    return {"message": "Cheque OTP verified", "otp_verified": True}


@router.post("/{cheque_id}/verify", response_model=VerificationResultOut)
def verify_cheque(cheque_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cheque = db.query(Cheque).filter(Cheque.id == cheque_id, Cheque.user_id == current_user.id).first()
    if not cheque:
        raise HTTPException(status_code=404, detail="Cheque not found")
    if not cheque.otp_verified:
        raise HTTPException(status_code=403, detail="Verify the cheque OTP before processing")

    pipeline_output = cheque_verification.run_pipeline(
        cheque_date=cheque.cheque_date,
        amount_numeric=cheque.amount_numeric,
        amount_words=cheque.amount_words,
        demo_scenario=cheque.demo_scenario,
    )
    checks = pipeline_output["checks"]
    result = pipeline_output["result"]

    if result["decision"] == "rejected":
        cheque.rejection_attempts = (cheque.rejection_attempts or 0) + 1
        if cheque.rejection_attempts > 3:
            result = {
                **result,
                "decision": "manual_review",
                "reason": "MANUAL_REVIEW_REQUIRED",
                "reason_label": "Manual review required",
                "message": "This cheque has been rejected more than three times and has been sent for manual review.",
                "action": "A CTS specialist will review this cheque before it can be finalized.",
            }

    cheque.micr = pipeline_output["micr"]
    cheque.status = result["decision"]
    cheque.rejection_reason = result["reason"]
    cheque.rejection_message = result["message"]
    cheque.verification_score = result["confidence"]
    cheque.processed_at = datetime.datetime.utcnow()

    vr = VerificationResult(
        cheque_id=cheque.id,
        image_quality=checks["image_quality"],
        signature_score=checks["signature_score"],
        amount_match=checks["amount_match"],
        date_valid=checks["date_valid"] and not checks["is_stale"],
        micr_score=checks["micr_score"],
        risk_score=result["confidence"],
        decision=result["decision"],
        checklist_json=json.dumps(checks),
        timeline_json=json.dumps(pipeline_output["timeline"]),
    )
    db.add(vr)

    if result["decision"] == "accepted":
        notif = Notification(
            user_id=current_user.id, type="success", title="Cheque accepted",
            message=f"{cheque.display_id} was successfully processed.",
            related_cheque_id=cheque.id,
        )
    elif result["decision"] == "manual_review":
        notif = Notification(
            user_id=current_user.id, type="warning", title="Manual review in progress",
            message=f"{cheque.display_id} needs a specialist's review before it can be finalized.",
            related_cheque_id=cheque.id,
        )
    else:
        notif = Notification(
            user_id=current_user.id, type="warning", title="Cheque verification requires attention",
            message=f"{cheque.display_id} was rejected due to {result['reason_label'].lower()}.",
            related_cheque_id=cheque.id,
        )
    db.add(notif)
    db.commit()

    return VerificationResultOut(
        decision=result["decision"],
        reason=result["reason"],
        message=result["message"] + (f" {result['action']}" if result["action"] else ""),
        confidence=result["confidence"],
        checks={
            "image_quality": checks["image_quality"],
            "signature_match": checks["signature_score"],
            "amount_match": checks["amount_match"],
            "date_valid": checks["date_valid"] and not checks["is_stale"],
            "micr_readable": checks["micr_score"],
        },
        timeline=pipeline_output["timeline"],
    )
