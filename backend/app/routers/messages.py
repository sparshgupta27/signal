from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..core.database import get_db
from ..core.deps import get_current_user
from ..services import conversation_service, message_service
from ..ws.broadcast import broadcast_message_status, json_payload
from ..ws.manager import manager

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

    hidden_ids = select(models.MessageHiddenForUser.message_id).where(
        models.MessageHiddenForUser.user_id == user.id
    )
    query = select(models.Message).where(
        models.Message.conversation_id == conversation_id,
        models.Message.id.not_in(hidden_ids),
    )
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


@router.post("/{conversation_id}/read", status_code=204)
async def mark_conversation_read(
    conversation_id: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """REST counterpart to the WS message.read event, for a bulk "mark all
    read" action that doesn't already know a specific up-to message id —
    marks read through whatever the latest message currently is."""
    participant = conversation_service.get_participant(db, conversation_id, user.id)
    if not participant:
        raise HTTPException(403, "Not a member")

    latest = db.execute(
        select(models.Message)
        .where(models.Message.conversation_id == conversation_id)
        .order_by(models.Message.created_at.desc())
        .limit(1)
    ).scalar_one_or_none()
    if not latest:
        return

    updated = message_service.mark_read(db, conversation_id, user.id, latest.id)
    member_ids = conversation_service.active_member_ids(db, conversation_id)
    for message in updated:
        status = message_service.compute_status(db, message, member_ids)
        await broadcast_message_status(
            member_ids, message.id, conversation_id, status, datetime.now(timezone.utc)
        )

    conversation = db.get(models.Conversation, conversation_id)
    out = conversation_service.build_conversation_out(db, conversation, user.id)
    await manager.send_to_user(
        user.id, {"type": "conversation.updated", "data": {"conversation": json_payload(out)}}
    )
