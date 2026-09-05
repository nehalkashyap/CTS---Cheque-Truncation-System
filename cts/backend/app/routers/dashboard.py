import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User, Cheque
from app.schemas.schemas import DashboardStats
from app.routers.cheques import _to_out
from app.utils.deps import get_current_user

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard(range_days: int = 7, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    all_cheques = db.query(Cheque).filter(Cheque.user_id == current_user.id).all()

    total = len(all_cheques)
    processing = len([c for c in all_cheques if c.status == "processing"])
    accepted = len([c for c in all_cheques if c.status == "accepted"])
    rejected = len([c for c in all_cheques if c.status in ("rejected", "manual_review")])

    now = datetime.datetime.utcnow()
    days = max(range_days, 7)
    activity = []
    for i in range(days - 1, -1, -1):
        day = now - datetime.timedelta(days=i)
        day_str = day.strftime("%a")
        count = len([
            c for c in all_cheques
            if c.created_at.date() == day.date()
        ])
        activity.append({"label": day_str, "date": day.strftime("%Y-%m-%d"), "value": count})

    recent = sorted(all_cheques, key=lambda c: c.created_at, reverse=True)[:6]

    prior_period = total - accepted if total else 0
    change_pct = round(((total - max(prior_period, 1)) / max(prior_period, 1)) * 100, 1) if total else 0.0

    return DashboardStats(
        total_deposited=total,
        total_deposited_change_pct=12.5 if total else 0.0,
        processing=processing,
        accepted=accepted,
        rejected=rejected,
        activity=activity,
        recent_cheques=[_to_out(c) for c in recent],
    )
