import os
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import mappers, models, schemas
from ..core.config import settings
from ..core.security import new_id
from . import upload_service
from .conversation_service import active_member_ids, get_participant


def _delete_attachments(db: Session, message_id: str) -> None:
    for attachment in db.execute(
        select(models.Attachment).where(models.Attachment.message_id == message_id)
    ).scalars():
        try:
            os.remove(os.path.join(settings.upload_dir, attachment.storage_path))
        except OSError:
            pass
        db.delete(attachment)


def compute_status(db: Session, message: models.Message, member_ids: list[str]) -> str:
    """The sender's-eye-view delivery state: sent once persisted, delivered once
    every other active member's client has it, read once every one has."""
    if message.sender_id is None:
        return "sent"
    others = [uid for uid in member_ids if uid != message.sender_id]
    if not others:
        return "sent"

    receipts = (
        db.execute(
            select(models.MessageReceipt).where(
                models.MessageReceipt.message_id == message.id,
                models.MessageReceipt.user_id.in_(others),
            )
        )
        .scalars()
        .all()
    )
    by_user = {r.user_id: r for r in receipts}
    if all(by_user.get(uid) and by_user[uid].read_at for uid in others):
        return "read"
    if all(by_user.get(uid) and by_user[uid].delivered_at for uid in others):
        return "delivered"
    return "sent"


def _is_expired(message: models.Message, now: datetime) -> bool:
    return (
        message.expires_at is not None
        and message.deleted_at is None
        and message.expires_at <= now
    )


def _apply_lazy_expiry(db: Session, message: models.Message) -> None:
    """Fallback for the gap between background sweeps — a read that lands
    just after expiry shouldn't show stale content."""
    now = datetime.now(timezone.utc)
    if not _is_expired(message, now):
        return
    message.deleted_at = now
    message.body = ""
    _delete_attachments(db, message.id)
    db.commit()


def message_out(db: Session, message: models.Message, member_ids: list[str]) -> schemas.MessageOut:
    _apply_lazy_expiry(db, message)

    attachments: list[schemas.AttachmentOut] = []
    reactions: list[schemas.ReactionOut] = []
    if message.deleted_at is None:
        attachments = [
            mappers.attachment_out(a)
            for a in db.execute(
                select(models.Attachment).where(models.Attachment.message_id == message.id)
            ).scalars()
        ]
        reactions = [
            mappers.reaction_out(r)
            for r in db.execute(
                select(models.MessageReaction).where(models.MessageReaction.message_id == message.id)
            ).scalars()
        ]

    return schemas.MessageOut(
        id=message.id,
        client_id=message.client_id or message.id,
        conversation_id=message.conversation_id,
        sender_id=message.sender_id,
        type=message.type,
        body=message.body,
        reply_to_id=message.reply_to_id,
        attachments=attachments,
        reactions=reactions,
        status=compute_status(db, message, member_ids),
        created_at=message.created_at,
        deleted_at=message.deleted_at,
        system_event=message.system_event,
    )


def create_message(
    db: Session,
    conversation: models.Conversation,
    sender_id: str,
    client_id: str,
    body: str,
    reply_to_id: str | None,
    attachment_ids: list[str] | None = None,
) -> models.Message:
    message = models.Message(
        id=new_id("m-"),
        client_id=client_id,
        conversation_id=conversation.id,
        sender_id=sender_id,
        type="text",
        body=body,
        reply_to_id=reply_to_id,
    )
    # Computed once from the timer as it stands right now — deliberately not
    # re-derived later, so changing the timer afterward can't retroactively
    # expire messages that were already sent under a longer (or no) timer.
    if conversation.disappearing_seconds:
        message.expires_at = datetime.now(timezone.utc) + timedelta(
            seconds=conversation.disappearing_seconds
        )
    db.add(message)
    db.flush()

    if attachment_ids:
        attachments = (
            db.execute(
                select(models.Attachment).where(
                    models.Attachment.id.in_(attachment_ids),
                    models.Attachment.uploader_id == sender_id,
                    models.Attachment.message_id.is_(None),
                )
            )
            .scalars()
            .all()
        )
        for attachment in attachments:
            attachment.message_id = message.id

    for uid in active_member_ids(db, conversation.id):
        if uid != sender_id:
            db.add(models.MessageReceipt(message_id=message.id, user_id=uid))

    conversation.last_message_at = message.created_at
    db.commit()
    db.refresh(message)
    return message


def forward_message(
    db: Session, source: models.Message, sender_id: str, target_conversation_ids: list[str]
) -> list[models.Message]:
    """Forwards into each target the caller is actually a member of — any
    id they're not a member of (or that doesn't exist) is silently
    skipped rather than failing the whole batch, same spirit as the
    multi-select picker that calls this not being able to offer a chat
    the user isn't in anyway."""
    source_attachments = list(
        db.execute(
            select(models.Attachment).where(models.Attachment.message_id == source.id)
        ).scalars()
    )

    forwarded: list[models.Message] = []
    for conversation_id in target_conversation_ids:
        participant = get_participant(db, conversation_id, sender_id)
        if not participant or participant.left_at is not None:
            continue
        conversation = db.get(models.Conversation, conversation_id)
        if not conversation:
            continue

        attachment_ids = [
            upload_service.duplicate_attachment(db, a, sender_id).id for a in source_attachments
        ]
        message = create_message(
            db, conversation, sender_id, new_id("fwd-"), source.body, None, attachment_ids
        )
        forwarded.append(message)

    return forwarded


def mark_delivered(db: Session, user_id: str, message_ids: list[str]) -> list[models.Message]:
    now = datetime.now(timezone.utc)
    updated: list[models.Message] = []
    for mid in message_ids:
        receipt = db.get(models.MessageReceipt, (mid, user_id))
        if receipt and receipt.delivered_at is None:
            receipt.delivered_at = now
            message = db.get(models.Message, mid)
            if message:
                updated.append(message)
    db.commit()
    return updated


def mark_read(
    db: Session, conversation_id: str, user_id: str, up_to_message_id: str
) -> list[models.Message]:
    target = db.get(models.Message, up_to_message_id)
    if not target:
        return []
    now = datetime.now(timezone.utc)

    participant = db.get(models.ConversationParticipant, (conversation_id, user_id))
    if participant:
        participant.last_read_at = target.created_at

    messages = (
        db.execute(
            select(models.Message).where(
                models.Message.conversation_id == conversation_id,
                models.Message.created_at <= target.created_at,
                models.Message.sender_id.is_not(None),
                models.Message.sender_id != user_id,
            )
        )
        .scalars()
        .all()
    )

    updated: list[models.Message] = []
    for message in messages:
        receipt = db.get(models.MessageReceipt, (message.id, user_id))
        if receipt is None:
            receipt = models.MessageReceipt(message_id=message.id, user_id=user_id)
            db.add(receipt)
        changed = False
        if receipt.delivered_at is None:
            receipt.delivered_at = now
            changed = True
        if receipt.read_at is None:
            receipt.read_at = now
            changed = True
        if changed:
            updated.append(message)

    db.commit()
    return updated


def sweep_expired_messages(db: Session) -> list[models.Message]:
    """Called periodically by the background task in app.main's lifespan.
    Soft-deletes every message past its expiry and returns them so the
    caller can broadcast message.deleted to each one's conversation."""
    now = datetime.now(timezone.utc)
    expired = (
        db.execute(
            select(models.Message).where(
                models.Message.expires_at.is_not(None),
                models.Message.expires_at <= now,
                models.Message.deleted_at.is_(None),
            )
        )
        .scalars()
        .all()
    )
    for message in expired:
        message.deleted_at = now
        message.body = ""
        _delete_attachments(db, message.id)
    if expired:
        db.commit()
    return list(expired)
