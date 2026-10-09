from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import mappers, models


def _reactions_payload(db: Session, message_id: str) -> list[dict]:
    rows = db.execute(
        select(models.MessageReaction).where(models.MessageReaction.message_id == message_id)
    ).scalars()
    return [mappers.reaction_out(r).model_dump(by_alias=True, mode="json") for r in rows]


def set_reaction(db: Session, message_id: str, user_id: str, emoji: str) -> list[dict]:
    """One reaction per person per message — setting a new emoji replaces
    whichever one they already had, matching real Signal/WhatsApp behavior."""
    existing = db.get(models.MessageReaction, (message_id, user_id))
    if existing:
        existing.emoji = emoji
    else:
        db.add(models.MessageReaction(message_id=message_id, user_id=user_id, emoji=emoji))
    db.commit()
    return _reactions_payload(db, message_id)


def remove_reaction(db: Session, message_id: str, user_id: str) -> list[dict]:
    existing = db.get(models.MessageReaction, (message_id, user_id))
    if existing:
        db.delete(existing)
        db.commit()
    return _reactions_payload(db, message_id)
