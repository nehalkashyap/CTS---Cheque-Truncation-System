import datetime
import json
import random

from sqlalchemy.orm import Session

from app.models.models import (
    User, BankAccount, Signature, Cheque, VerificationResult, Notification, SupportTicket
)
from app.utils.security import hash_password

DEMO_EMAIL = "demo@cts.bank"
DEMO_PASSWORD = "cts@demo123"

BANKS = [
    ("HDFC Bank", "HDFC0001234"),
    ("Axis Bank", "UTIB0000456"),
    ("Kotak Mahindra Bank", "KKBK0000789"),
]

REJECTION_SET = [
    ("SIGNATURE_MISMATCH", "Signature mismatch",
     "Your uploaded signature has a low similarity score compared with your enrolled reference signature."),
    ("STALE_CHEQUE", "Stale cheque", "This cheque is dated more than 3 months ago and can no longer be processed."),
]


def seed_if_empty(db: Session):
    existing = db.query(User).filter(User.email == DEMO_EMAIL).first()
    if existing:
        return existing

    user = User(
        name="Nehal Kashyap",
        email=DEMO_EMAIL,
        phone="+91 98765 43210",
        password_hash=hash_password(DEMO_PASSWORD),
        date_of_birth="1994-03-12",
        address="123, Anna Nagar",
        city="Chennai",
        state="Tamil Nadu",
        pincode="600040",
        last_known_city="Chennai",
    )
    db.add(user)
    db.flush()

    bank_accounts = []
    for i, (name, ifsc) in enumerate(BANKS):
        acc = BankAccount(
            user_id=user.id,
            bank_name=name,
            account_number=f"00{random.randint(100000, 999999)}{4821 - i}",
            ifsc=ifsc,
            account_type="Savings",
            is_default=(i == 0),
            is_verified=True,
        )
        db.add(acc)
        bank_accounts.append(acc)
    db.flush()

    signature = Signature(
        user_id=user.id,
        image_path="",
        quality_score=92.0,
        clarity_score=91.0,
        stroke_score=84.0,
        contrast_score=97.0,
        background_score=99.0,
    )
    db.add(signature)

    now = datetime.datetime.utcnow()
    statuses = (["accepted"] * 8) + (["processing"] * 2) + (["rejected"] * 2)
    random.shuffle(statuses)

    for i, status in enumerate(statuses):
        acc = random.choice(bank_accounts)
        amount = round(random.uniform(3000, 95000), 2)
        created = now - datetime.timedelta(days=random.randint(0, 20), hours=random.randint(0, 23))
        cheque = Cheque(
            display_id=f"CTS-{2470 + i:06d}",
            user_id=user.id,
            bank_account_id=acc.id,
            amount_numeric=amount,
            amount_words=f"{int(amount)} Rupees Only",
            payee=user.name,
            micr=f"{random.randint(100000,999999)}{random.randint(10,99)}{random.randint(1000,9999)}",
            cheque_date=(created - datetime.timedelta(days=random.randint(0, 5))).strftime("%d/%m/%Y"),
            status=status,
            created_at=created,
        )
        if status == "accepted":
            cheque.verification_score = round(random.uniform(88, 99), 1)
            cheque.processed_at = created + datetime.timedelta(minutes=2)
        elif status == "rejected":
            code, label, msg = random.choice(REJECTION_SET)
            cheque.rejection_reason = code
            cheque.rejection_message = msg
            cheque.verification_score = round(random.uniform(40, 70), 1)
            cheque.processed_at = created + datetime.timedelta(minutes=2)
        db.add(cheque)
        db.flush()

        if status != "processing":
            vr = VerificationResult(
                cheque_id=cheque.id,
                image_quality=round(random.uniform(85, 99), 1),
                signature_score=cheque.verification_score if status == "rejected" and cheque.rejection_reason == "SIGNATURE_MISMATCH" else round(random.uniform(85, 99), 1),
                amount_match=True,
                date_valid=status != "rejected" or cheque.rejection_reason != "STALE_CHEQUE",
                micr_score=round(random.uniform(85, 99), 1),
                risk_score=cheque.verification_score,
                decision=status,
                checklist_json=json.dumps({}),
                timeline_json=json.dumps([]),
            )
            db.add(vr)

        if status == "rejected":
            db.add(Notification(
                user_id=user.id,
                type="warning",
                title="Cheque rejected",
                message=f"{cheque.display_id} was rejected due to {cheque.rejection_reason.replace('_', ' ').lower()}.",
                related_cheque_id=cheque.id,
                created_at=cheque.processed_at,
            ))
        elif status == "accepted":
            db.add(Notification(
                user_id=user.id,
                type="success",
                title="Cheque accepted",
                message=f"{cheque.display_id} was successfully processed.",
                related_cheque_id=cheque.id,
                created_at=cheque.processed_at,
            ))

    db.add(Notification(
        user_id=user.id,
        type="security",
        title="New activity",
        message="A cheque upload was detected from a new location.",
        created_at=now - datetime.timedelta(days=1),
    ))

    db.commit()
    db.refresh(user)
    return user
