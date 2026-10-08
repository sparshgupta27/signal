from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..core.database import get_db
from ..core.deps import get_current_user
from ..services import conversation_service

router = APIRouter(prefix="/api/v1/conversations", tags=["conversations"])


@router.get("", response_model=list[schemas.ConversationOut])
def list_conversations(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return conversation_service.list_conversations_for_user(db, user.id)


@router.get("/{conversation_id}", response_model=schemas.ConversationOut)
def get_conversation(
    conversation_id: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation = db.get(models.Conversation, conversation_id)
    if not conversation:
        raise HTTPException(404, "Not found")
    return conversation_service.build_conversation_out(db, conversation, user.id)


@router.post("/direct", response_model=schemas.ConversationOut)
def create_direct(
    body: schemas.CreateDirectIn,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation = conversation_service.get_or_create_direct(db, user.id, body.user_id)
    return conversation_service.build_conversation_out(db, conversation, user.id)


@router.patch("/{conversation_id}/me", response_model=schemas.ConversationOut)
def update_my_flags(
    conversation_id: str,
    body: schemas.UpdateParticipantFlagsIn,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation = db.get(models.Conversation, conversation_id)
    if not conversation:
        raise HTTPException(404, "Not found")
    participant = conversation_service.get_participant(db, conversation_id, user.id)
    if not participant:
        raise HTTPException(403, "Not a member")

    if body.is_pinned is not None:
        participant.is_pinned = body.is_pinned
    if body.is_muted is not None:
        participant.is_muted = body.is_muted
    if body.is_archived is not None:
        participant.is_archived = body.is_archived
    db.commit()
    return conversation_service.build_conversation_out(db, conversation, user.id)
