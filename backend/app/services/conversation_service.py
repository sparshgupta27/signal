from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..core.security import new_id


def active_member_ids(db: Session, conversation_id: str) -> list[str]:
    rows = (
        db.execute(
            select(models.ConversationParticipant.user_id).where(
                models.ConversationParticipant.conversation_id == conversation_id,
                models.ConversationParticipant.left_at.is_(None),
            )
        )
        .scalars()
        .all()
    )
    return list(rows)


def get_participant(
    db: Session, conversation_id: str, user_id: str
) -> models.ConversationParticipant | None:
    return db.get(models.ConversationParticipant, (conversation_id, user_id))


def _unread_count(
    db: Session, conversation_id: str, user_id: str, last_read_at: datetime | None
) -> int:
    query = select(func.count(models.Message.id)).where(
        models.Message.conversation_id == conversation_id,
        models.Message.sender_id != user_id,
        models.Message.type == "text",
        models.Message.deleted_at.is_(None),
    )
    if last_read_at is not None:
        query = query.where(models.Message.created_at > last_read_at)
    return db.execute(query).scalar_one()


def _last_message(db: Session, conversation_id: str) -> models.Message | None:
    return db.execute(
        select(models.Message)
        .where(models.Message.conversation_id == conversation_id)
        .order_by(models.Message.created_at.desc())
        .limit(1)
    ).scalar_one_or_none()


def build_conversation_out(
    db: Session, conversation: models.Conversation, viewer_id: str
) -> schemas.ConversationOut:
    participant = get_participant(db, conversation.id, viewer_id)
    member_ids = active_member_ids(db, conversation.id)

    members_out = None
    if conversation.type == "group":
        rows = (
            db.execute(
                select(models.ConversationParticipant).where(
                    models.ConversationParticipant.conversation_id == conversation.id
                )
            )
            .scalars()
            .all()
        )
        members_out = [
            schemas.GroupMemberOut(
                user_id=r.user_id, role=r.role, joined_at=r.joined_at, left_at=r.left_at
            )
            for r in rows
        ]

    last_msg = _last_message(db, conversation.id)
    last_message_out = None
    if last_msg:
        last_message_out = schemas.ConversationSummaryOut(
            id=last_msg.id,
            body=last_msg.body,
            sender_id=last_msg.sender_id,
            type=last_msg.type,
            created_at=last_msg.created_at,
            deleted_at=last_msg.deleted_at,
        )

    return schemas.ConversationOut(
        id=conversation.id,
        type=conversation.type,
        name=conversation.name,
        avatar_url=conversation.avatar_url,
        member_ids=member_ids,
        members=members_out,
        created_by=conversation.created_by,
        disappearing_seconds=conversation.disappearing_seconds,
        last_message=last_message_out,
        last_message_at=conversation.last_message_at,
        unread_count=_unread_count(
            db, conversation.id, viewer_id, participant.last_read_at if participant else None
        ),
        is_pinned=participant.is_pinned if participant else False,
        is_muted=participant.is_muted if participant else False,
        is_archived=participant.is_archived if participant else False,
        created_at=conversation.created_at,
    )


def _list_conversations_for_user(
    db: Session, user_id: str, *, archived: bool
) -> list[schemas.ConversationOut]:
    rows = (
        db.execute(
            select(models.Conversation)
            .join(
                models.ConversationParticipant,
                models.ConversationParticipant.conversation_id == models.Conversation.id,
            )
            .where(
                models.ConversationParticipant.user_id == user_id,
                models.ConversationParticipant.left_at.is_(None),
            )
        )
        .scalars()
        .all()
    )
    out = [build_conversation_out(db, c, user_id) for c in rows]
    out = [c for c in out if c.is_archived == archived]
    out.sort(
        key=lambda c: (
            not c.is_pinned,
            -(c.last_message_at.timestamp() if c.last_message_at else 0),
        )
    )
    return out


def list_conversations_for_user(db: Session, user_id: str) -> list[schemas.ConversationOut]:
    return _list_conversations_for_user(db, user_id, archived=False)


def list_archived_conversations_for_user(db: Session, user_id: str) -> list[schemas.ConversationOut]:
    return _list_conversations_for_user(db, user_id, archived=True)


def get_or_create_direct(db: Session, user_id: str, other_id: str) -> models.Conversation:
    key = ":".join(sorted([user_id, other_id]))
    existing = db.execute(
        select(models.Conversation).where(models.Conversation.dm_key == key)
    ).scalar_one_or_none()
    if existing:
        return existing

    conversation = models.Conversation(id=new_id("dm-"), type="direct", dm_key=key, created_by=user_id)
    db.add(conversation)
    db.flush()
    for uid in (user_id, other_id):
        db.add(
            models.ConversationParticipant(conversation_id=conversation.id, user_id=uid, role="member")
        )
    db.commit()
    db.refresh(conversation)
    return conversation


def set_disappearing(
    db: Session, conversation: models.Conversation, actor_id: str, seconds: int | None
) -> models.Message:
    """Enforced here, not the router: either member may set it in a direct
    conversation; only an admin may in a group."""
    participant = get_participant(db, conversation.id, actor_id)
    if not participant or participant.left_at is not None:
        raise HTTPException(403, "Not a member")
    if conversation.type == "group" and participant.role != "admin":
        raise HTTPException(403, "Admins only")

    conversation.disappearing_seconds = seconds

    now = datetime.now(timezone.utc)
    sid = new_id("sys-")
    message = models.Message(
        id=sid,
        client_id=sid,
        conversation_id=conversation.id,
        sender_id=None,
        type="system",
        body="",
        system_event={
            "action": "disappearing_changed",
            "actorId": actor_id,
            "value": str(seconds) if seconds else "0",
        },
        created_at=now,
    )
    db.add(message)
    conversation.last_message_at = now
    db.commit()
    db.refresh(message)
    return message
