from collections import defaultdict
from datetime import datetime, timedelta
from typing import Annotated, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models import UsageLog

router = APIRouter(tags=["usage"])


class UsageLogCreate(BaseModel):
    session_id: Optional[int] = None
    module_id: Optional[int] = None
    event_type: str = "message_sent"


class UsageLogResponse(BaseModel):
    id: int
    session_id: Optional[int]
    module_id: Optional[int]
    event_type: str
    created_at: str


class DailyUsage(BaseModel):
    date: str
    count: int


@router.post("/usage/logs", response_model=UsageLogResponse, status_code=201)
def create_usage_log(
    body: UsageLogCreate,
    db: Annotated[Session, Depends(get_session)],
):
    log = UsageLog(
        session_id=body.session_id,
        module_id=body.module_id,
        event_type=body.event_type,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return UsageLogResponse(
        id=log.id,
        session_id=log.session_id,
        module_id=log.module_id,
        event_type=log.event_type,
        created_at=log.created_at.isoformat(),
    )


@router.get("/usage/logs", response_model=list[DailyUsage])
def get_usage_logs(
    db: Annotated[Session, Depends(get_session)],
    days: int = 30,
):
    since = datetime.utcnow() - timedelta(days=days)
    logs = db.exec(select(UsageLog).where(UsageLog.created_at >= since)).all()

    counts: dict[str, int] = defaultdict(int)
    for log in logs:
        date_str = log.created_at.strftime("%Y-%m-%d")
        counts[date_str] += 1

    result = []
    for i in range(days):
        d = (datetime.utcnow() - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d")
        result.append(DailyUsage(date=d, count=counts.get(d, 0)))

    return result
