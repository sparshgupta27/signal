from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..core.database import get_db
from ..core.deps import get_current_user
from ..services import conversation_service, reaction_service
from ..ws.broadcast import broadcast_reaction_updated

router = APIRouter(prefix="/api/v1/messages", tags=["reactions"])


def _get_message_for_member(db: Session, message_id: str, user_id: str) -> models.Message:
    message = db.get(models.Message, message_id)
    if not message:
        raise HTTPException(404, "Not found")
    participant = conversation_service.get_participant(db, message.conversation_id, user_id)
    if not participant or participant.left_at is not None:
        raise HTTPException(403, "Not a member")
    return message


@router.put("/{message_id}/reaction", status_code=204)
async def set_reaction(
    message_id: str,
    body: schemas.SetReactionIn,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    message = _get_message_for_member(db, message_id, user.id)
    reactions = reaction_service.set_reaction(db, message_id, user.id, body.emoji)
    member_ids = conversation_service.active_member_ids(db, message.conversation_id)
    await broadcast_reaction_updated(member_ids, message_id, message.conversation_id, reactions)


@router.delete("/{message_id}/reaction", status_code=204)
async def remove_reaction(
    message_id: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    message = _get_message_for_member(db, message_id, user.id)
    reactions = reaction_service.remove_reaction(db, message_id, user.id)
    member_ids = conversation_service.active_member_ids(db, message.conversation_id)
    await broadcast_reaction_updated(member_ids, message_id, message.conversation_id, reactions)
