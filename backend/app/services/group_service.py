from datetime import datetime, timezone

from sqlalchemy.orm import Session

from .. import models
from ..core.security import new_id
from .conversation_service import active_member_ids


def _system_message(conversation_id: str, event: dict) -> models.Message:
    sid = new_id("sys-")
    return models.Message(
        id=sid,
        client_id=sid,
        conversation_id=conversation_id,
        sender_id=None,
        type="system",
        body="",
        system_event=event,
        # Set explicitly, not left to the column default — callers read
        # .created_at right after add() to bump last_message_at, before any
        # flush would otherwise populate it.
        created_at=datetime.now(timezone.utc),
    )


def create_group(db: Session, creator_id: str, name: str, member_ids: list[str]) -> models.Conversation:
    conversation = models.Conversation(id=new_id("group-"), type="group", name=name, created_by=creator_id)
    db.add(conversation)
    db.flush()

    db.add(
        models.ConversationParticipant(conversation_id=conversation.id, user_id=creator_id, role="admin")
    )
    for uid in member_ids:
        if uid != creator_id:
            db.add(
                models.ConversationParticipant(conversation_id=conversation.id, user_id=uid, role="member")
            )

    msg = _system_message(conversation.id, {"action": "created", "actorId": creator_id})
    db.add(msg)
    conversation.last_message_at = msg.created_at
    db.commit()
    db.refresh(conversation)
    return conversation


def add_members(
    db: Session, conversation: models.Conversation, actor_id: str, user_ids: list[str]
) -> None:
    existing = set(active_member_ids(db, conversation.id))
    last_created_at = None
    for uid in user_ids:
        if uid in existing:
            continue
        participant = db.get(models.ConversationParticipant, (conversation.id, uid))
        if participant:
            participant.left_at = None
        else:
            db.add(
                models.ConversationParticipant(conversation_id=conversation.id, user_id=uid, role="member")
            )
        msg = _system_message(
            conversation.id, {"action": "member_added", "actorId": actor_id, "targetId": uid}
        )
        db.add(msg)
        last_created_at = msg.created_at
    if last_created_at:
        conversation.last_message_at = last_created_at
    db.commit()


def remove_member(
    db: Session, conversation: models.Conversation, actor_id: str, user_id: str
) -> None:
    participant = db.get(models.ConversationParticipant, (conversation.id, user_id))
    if not participant or participant.left_at is not None:
        return
    participant.left_at = datetime.now(timezone.utc)
    action = "member_left" if actor_id == user_id else "member_removed"
    msg = _system_message(
        conversation.id, {"action": action, "actorId": actor_id, "targetId": user_id}
    )
    db.add(msg)
    conversation.last_message_at = msg.created_at
    db.commit()


def set_role(
    db: Session, conversation: models.Conversation, actor_id: str, user_id: str, role: str
) -> None:
    participant = db.get(models.ConversationParticipant, (conversation.id, user_id))
    if not participant:
        return
    participant.role = role
    action = "member_promoted" if role == "admin" else "member_demoted"
    msg = _system_message(
        conversation.id, {"action": action, "actorId": actor_id, "targetId": user_id}
    )
    db.add(msg)
    conversation.last_message_at = msg.created_at
    db.commit()
