from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import mappers, models, schemas
from ..core.database import get_db
from ..core.deps import get_current_user
from ..services import conversation_service
from ..ws.broadcast import broadcast_conversation_updated, broadcast_message_new

router = APIRouter(prefix="/api/v1/conversations", tags=["conversations"])


@router.get("", response_model=list[schemas.ConversationOut])
def list_conversations(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return conversation_service.list_conversations_for_user(db, user.id)


# Must be registered before /{conversation_id} — otherwise "archived" would
# be swallowed as a conversation id (FastAPI matches routes in registration
# order, not by specificity).
@router.get("/archived", response_model=list[schemas.ConversationOut])
def list_archived_conversations(
    user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return conversation_service.list_archived_conversations_for_user(db, user.id)


@router.get("/{conversation_id}", response_model=schemas.ConversationOut)
def get_conversation(
    conversation_id: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation = db.get(models.Conversation, conversation_id)
    if not conversation:
        raise HTTPException(404, "Not found")
    participant = conversation_service.get_participant(db, conversation_id, user.id)
    if not participant:
        raise HTTPException(403, "Not a member")
    return conversation_service.build_conversation_out(db, conversation, user.id)


@router.get("/{conversation_id}/media", response_model=list[schemas.AttachmentOut])
def get_shared_media(
    conversation_id: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    participant = conversation_service.get_participant(db, conversation_id, user.id)
    if not participant:
        raise HTTPException(403, "Not a member")
    attachments = conversation_service.list_media_for_conversation(db, conversation_id)
    return [mappers.attachment_out(a) for a in attachments]


@router.post("/direct", response_model=schemas.ConversationOut)
def create_direct(
    body: schemas.CreateDirectIn,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation = conversation_service.get_or_create_direct(db, user.id, body.user_id)
    return conversation_service.build_conversation_out(db, conversation, user.id)


@router.patch("/{conversation_id}", response_model=schemas.ConversationOut)
async def update_conversation(
    conversation_id: str,
    body: schemas.UpdateConversationIn,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation = db.get(models.Conversation, conversation_id)
    if not conversation:
        raise HTTPException(404, "Not found")

    if "disappearing_seconds" in body.model_fields_set:
        message = conversation_service.set_disappearing(
            db, conversation, user.id, body.disappearing_seconds
        )
        member_ids = conversation_service.active_member_ids(db, conversation_id)
        await broadcast_message_new(db, message, member_ids)
        await broadcast_conversation_updated(db, conversation, member_ids)

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
