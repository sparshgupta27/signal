from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..core.database import get_db
from ..core.deps import get_current_user
from ..services import conversation_service, message_service

router = APIRouter(prefix="/api/v1/conversations", tags=["messages"])

PAGE_SIZE = 40


@router.get("/{conversation_id}/messages", response_model=schemas.MessagePageOut)
def get_messages(
    conversation_id: str,
    before: str | None = None,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    participant = conversation_service.get_participant(db, conversation_id, user.id)
    if not participant:
        raise HTTPException(403, "Not a member")

    query = select(models.Message).where(models.Message.conversation_id == conversation_id)
    if before:
        anchor = db.get(models.Message, before)
        if anchor:
            query = query.where(models.Message.created_at < anchor.created_at)
    query = query.order_by(models.Message.created_at.desc()).limit(PAGE_SIZE + 1)

    rows = db.execute(query).scalars().all()
    has_more = len(rows) > PAGE_SIZE
    page = list(reversed(rows[:PAGE_SIZE]))

    member_ids = conversation_service.active_member_ids(db, conversation_id)
    return schemas.MessagePageOut(
        messages=[message_service.message_out(db, m, member_ids) for m in page],
        has_more=has_more,
    )
