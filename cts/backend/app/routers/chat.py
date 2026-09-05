from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User, ChatMessage, Cheque
from app.schemas.schemas import ChatMessageCreate, ChatMessageOut
from app.services import chatbot
from app.utils.deps import get_current_user

router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/messages", response_model=list[ChatMessageOut])
def get_messages(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    msgs = (
        db.query(ChatMessage)
        .filter(ChatMessage.user_id == current_user.id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    if not msgs:
        return [ChatMessageOut(
            id="welcome", role="assistant",
            content=f"Hi {current_user.name.split()[0]}. How can I help?",
            created_at=current_user.created_at, quick_actions=[],
        )]
    return [ChatMessageOut(id=m.id, role=m.role, content=m.content, created_at=m.created_at, quick_actions=[])
            for m in msgs]


@router.post("/messages", response_model=ChatMessageOut)
def post_message(payload: ChatMessageCreate, current_user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    user_msg = ChatMessage(user_id=current_user.id, role="user", content=payload.content,
                            related_cheque_id=payload.related_cheque_id or "")
    db.add(user_msg)
    db.flush()

    latest_cheque = None
    if payload.related_cheque_id:
        latest_cheque = db.query(Cheque).filter(Cheque.id == payload.related_cheque_id).first()
    else:
        latest_cheque = (
            db.query(Cheque)
            .filter(Cheque.user_id == current_user.id)
            .order_by(Cheque.created_at.desc())
            .first()
        )
    verification_result = latest_cheque.verification_result if latest_cheque else None

    reply = chatbot.reply_to(payload.content, current_user.name, latest_cheque, verification_result)

    assistant_msg = ChatMessage(user_id=current_user.id, role="assistant", content=reply["content"])
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)

    return ChatMessageOut(
        id=assistant_msg.id, role="assistant", content=assistant_msg.content,
        created_at=assistant_msg.created_at, quick_actions=reply["quick_actions"],
    )
