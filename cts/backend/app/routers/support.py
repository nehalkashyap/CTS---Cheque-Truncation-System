import random

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User, SupportTicket, Notification
from app.schemas.schemas import SupportTicketCreate, SupportTicketOut
from app.utils.deps import get_current_user

router = APIRouter(prefix="/support", tags=["support"])


@router.post("/tickets", response_model=SupportTicketOut)
def create_ticket(payload: SupportTicketCreate, current_user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    display_id = f"CTS-SUP-{random.randint(10000, 99999)}"
    ticket = SupportTicket(
        display_id=display_id,
        user_id=current_user.id,
        cheque_id=payload.cheque_id or "",
        reason=payload.reason,
        priority="Normal",
        status="waiting_for_agent",
    )
    db.add(ticket)
    db.add(Notification(
        user_id=current_user.id, type="support", title="Support ticket created",
        message=f"Ticket {display_id} has been created. Expected response within 10 minutes.",
    ))
    db.commit()
    db.refresh(ticket)
    return SupportTicketOut.model_validate(ticket)


@router.get("/tickets", response_model=list[SupportTicketOut])
def list_tickets(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tickets = (
        db.query(SupportTicket)
        .filter(SupportTicket.user_id == current_user.id)
        .order_by(SupportTicket.created_at.desc())
        .all()
    )
    return [SupportTicketOut.model_validate(t) for t in tickets]
