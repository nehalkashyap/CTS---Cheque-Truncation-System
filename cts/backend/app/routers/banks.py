from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User, BankAccount
from app.schemas.schemas import BankAccountCreate, BankAccountOut
from app.utils.deps import get_current_user

router = APIRouter(prefix="/banks", tags=["banks"])


def _to_out(acc: BankAccount) -> BankAccountOut:
    masked = "•••• •••• " + acc.account_number[-4:]
    return BankAccountOut(
        id=acc.id, bank_name=acc.bank_name, account_number=acc.account_number,
        ifsc=acc.ifsc, account_type=acc.account_type, is_default=acc.is_default,
        is_verified=acc.is_verified, masked_account_number=masked,
    )


@router.get("", response_model=list[BankAccountOut])
def list_banks(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    accounts = db.query(BankAccount).filter(BankAccount.user_id == current_user.id).all()
    return [_to_out(a) for a in accounts]


@router.post("", response_model=BankAccountOut)
def add_bank(payload: BankAccountCreate, current_user: User = Depends(get_current_user),
             db: Session = Depends(get_db)):
    if payload.is_default:
        db.query(BankAccount).filter(BankAccount.user_id == current_user.id).update({"is_default": False})

    existing_count = db.query(BankAccount).filter(BankAccount.user_id == current_user.id).count()
    acc = BankAccount(
        user_id=current_user.id,
        bank_name=payload.bank_name,
        account_number=payload.account_number,
        ifsc=payload.ifsc,
        account_type=payload.account_type,
        is_default=payload.is_default or existing_count == 0,
        is_verified=True,
    )
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return _to_out(acc)


@router.delete("/{bank_id}")
def delete_bank(bank_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    acc = db.query(BankAccount).filter(BankAccount.id == bank_id, BankAccount.user_id == current_user.id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Bank account not found")
    db.delete(acc)
    db.commit()
    return {"message": "Bank account removed"}


@router.put("/{bank_id}/default", response_model=BankAccountOut)
def set_default(bank_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    acc = db.query(BankAccount).filter(BankAccount.id == bank_id, BankAccount.user_id == current_user.id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Bank account not found")
    db.query(BankAccount).filter(BankAccount.user_id == current_user.id).update({"is_default": False})
    acc.is_default = True
    db.commit()
    db.refresh(acc)
    return _to_out(acc)
