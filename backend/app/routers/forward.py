from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..core.database import get_db
from ..core.deps import get_current_user
from ..services import conversation_service, message_service
from ..ws.broadcast import broadcast_conversation_updated, broadcast_message_new

router = APIRouter(prefix="/api/v1/messages", tags=["messages"])


@router.post("/{message_id}/forward", response_model=list[schemas.MessageOut])
async def forward_message(
    message_id: str,
    body: schemas.ForwardMessageIn,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    source = db.get(models.Message, message_id)
    if not source or source.deleted_at is not None:
        raise HTTPException(404, "Not found")
    participant = conversation_service.get_participant(db, source.conversation_id, user.id)
    if not participant or participant.left_at is not None:
        raise HTTPException(403, "Not a member")

    forwarded = message_service.forward_message(db, source, user.id, body.conversation_ids)

    out = []
    for message in forwarded:
        member_ids = conversation_service.active_member_ids(db, message.conversation_id)
        await broadcast_message_new(db, message, member_ids)
        conversation = db.get(models.Conversation, message.conversation_id)
        if conversation:
            await broadcast_conversation_updated(db, conversation, member_ids)
        out.append(message_service.message_out(db, message, member_ids))

    return out
