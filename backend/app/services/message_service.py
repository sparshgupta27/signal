from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..core.security import new_id
from .conversation_service import active_member_ids


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


def message_out(db: Session, message: models.Message, member_ids: list[str]) -> schemas.MessageOut:
    return schemas.MessageOut(
        id=message.id,
        client_id=message.client_id or message.id,
        conversation_id=message.conversation_id,
        sender_id=message.sender_id,
        type=message.type,
        body=message.body,
        reply_to_id=message.reply_to_id,
        reactions=[],
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
    db.add(message)
    db.flush()

    for uid in active_member_ids(db, conversation.id):
        if uid != sender_id:
            db.add(models.MessageReceipt(message_id=message.id, user_id=uid))

    conversation.last_message_at = message.created_at
    db.commit()
    db.refresh(message)
    return message


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
