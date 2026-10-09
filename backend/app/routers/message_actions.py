from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..core.database import get_db
from ..core.deps import get_current_user
from ..services import conversation_service, message_service
from ..ws.broadcast import broadcast_message_deleted, broadcast_message_edited

router = APIRouter(prefix="/api/v1/messages", tags=["messages"])


def _get_active_message_for_member(db: Session, message_id: str, user_id: str) -> models.Message:
    message = db.get(models.Message, message_id)
    if not message or message.deleted_at is not None:
        raise HTTPException(404, "Not found")
    participant = conversation_service.get_participant(db, message.conversation_id, user_id)
    if not participant or participant.left_at is not None:
        raise HTTPException(403, "Not a member")
    return message


@router.patch("/{message_id}", response_model=schemas.MessageOut)
async def edit_message(
    message_id: str,
    body: schemas.EditMessageIn,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    message = _get_active_message_for_member(db, message_id, user.id)
    if message.sender_id != user.id:
        raise HTTPException(403, "Only the sender can edit this message")
    if message.type != "text":
        raise HTTPException(400, "Only text messages can be edited")

    updated = message_service.edit_message(db, message, body.body)
    member_ids = conversation_service.active_member_ids(db, message.conversation_id)
    await broadcast_message_edited(db, updated, member_ids)
    return message_service.message_out(db, updated, member_ids)


@router.delete("/{message_id}/me", status_code=204)
async def delete_message_for_me(
    message_id: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    message = db.get(models.Message, message_id)
    if not message:
        raise HTTPException(404, "Not found")
    participant = conversation_service.get_participant(db, message.conversation_id, user.id)
    if not participant:
        raise HTTPException(403, "Not a member")
    message_service.delete_for_me(db, message_id, user.id)


@router.delete("/{message_id}", status_code=204)
async def delete_message_for_everyone(
    message_id: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    message = _get_active_message_for_member(db, message_id, user.id)
    if message.sender_id != user.id:
        raise HTTPException(403, "Only the sender can delete this message for everyone")

    updated = message_service.delete_for_everyone(db, message)
    member_ids = conversation_service.active_member_ids(db, message.conversation_id)
    await broadcast_message_deleted(member_ids, updated.id, updated.conversation_id, updated.deleted_at)


@router.get("/{message_id}/receipts", response_model=schemas.MessageReceiptsOut)
def get_message_receipts(
    message_id: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    message = _get_active_message_for_member(db, message_id, user.id)
    if message.sender_id != user.id:
        raise HTTPException(403, "Only the sender can view message details")

    member_ids = conversation_service.active_member_ids(db, message.conversation_id)
    return schemas.MessageReceiptsOut(receipts=message_service.get_receipts(db, message, member_ids))
