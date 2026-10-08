from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..core.database import get_db
from ..core.deps import get_current_user
from ..services import conversation_service, group_service
from ..ws.broadcast import broadcast_conversation_updated

router = APIRouter(prefix="/api/v1/groups", tags=["groups"])


def _require_admin(db: Session, conversation_id: str, user_id: str) -> None:
    participant = conversation_service.get_participant(db, conversation_id, user_id)
    if not participant or participant.role != "admin" or participant.left_at is not None:
        raise HTTPException(403, "Admins only")


def _get_conversation(db: Session, conversation_id: str) -> models.Conversation:
    conversation = db.get(models.Conversation, conversation_id)
    if not conversation:
        raise HTTPException(404, "Not found")
    return conversation


@router.post("", response_model=schemas.ConversationOut)
def create_group(
    body: schemas.CreateGroupIn,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation = group_service.create_group(db, user.id, body.name, body.member_ids)
    return conversation_service.build_conversation_out(db, conversation, user.id)


@router.post("/{conversation_id}/members", response_model=schemas.ConversationOut)
async def add_members(
    conversation_id: str,
    body: schemas.AddMembersIn,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(db, conversation_id, user.id)
    conversation = _get_conversation(db, conversation_id)
    group_service.add_members(db, conversation, user.id, body.user_ids)
    member_ids = conversation_service.active_member_ids(db, conversation_id)
    await broadcast_conversation_updated(db, conversation, member_ids)
    return conversation_service.build_conversation_out(db, conversation, user.id)


@router.delete("/{conversation_id}/members/{member_id}", response_model=schemas.ConversationOut)
async def remove_member(
    conversation_id: str,
    member_id: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if member_id != user.id:
        _require_admin(db, conversation_id, user.id)
    conversation = _get_conversation(db, conversation_id)
    member_ids_before = conversation_service.active_member_ids(db, conversation_id)
    group_service.remove_member(db, conversation, user.id, member_id)
    # Include the removed member so their client still hears about it.
    await broadcast_conversation_updated(db, conversation, member_ids_before)
    return conversation_service.build_conversation_out(db, conversation, user.id)


@router.patch("/{conversation_id}/members/{member_id}", response_model=schemas.ConversationOut)
async def set_role(
    conversation_id: str,
    member_id: str,
    body: schemas.SetRoleIn,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(db, conversation_id, user.id)
    conversation = _get_conversation(db, conversation_id)
    group_service.set_role(db, conversation, user.id, member_id, body.role)
    member_ids = conversation_service.active_member_ids(db, conversation_id)
    await broadcast_conversation_updated(db, conversation, member_ids)
    return conversation_service.build_conversation_out(db, conversation, user.id)
