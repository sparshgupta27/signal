from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import mappers, models, schemas
from . import conversation_service, message_service


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def search(db: Session, user_id: str, query: str) -> schemas.SearchResultsOut:
    q = query.strip()
    if not q:
        return schemas.SearchResultsOut(conversations=[], contacts=[], messages=[])
    ql = q.lower()

    # The same scope as the chat list — and the only universe message search
    # is allowed to touch. A conversation the user has left (left_at set)
    # never appears here, so its messages are excluded too.
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
    by_conv_id = {c.id: c for c in rows}

    matched_conversations = []
    for c in rows:
        if c.type == "group":
            title = c.name or ""
        else:
            other_id = next(
                (m for m in conversation_service.active_member_ids(db, c.id) if m != user_id), None
            )
            other = db.get(models.User, other_id) if other_id else None
            title = other.display_name if other else ""
        if ql in title.lower():
            matched_conversations.append(conversation_service.build_conversation_out(db, c, user_id))

    contact_rows = (
        db.execute(select(models.Contact).where(models.Contact.owner_id == user_id)).scalars().all()
    )
    matched_contacts = []
    for contact in contact_rows:
        target = db.get(models.User, contact.contact_id)
        if target and ql in target.display_name.lower():
            matched_contacts.append(mappers.directory_user_out(target, True))

    matched_messages: list[schemas.SearchMessageHitOut] = []
    if by_conv_id:
        escaped = _escape_like(q)
        message_rows = (
            db.execute(
                select(models.Message)
                .where(
                    models.Message.conversation_id.in_(by_conv_id.keys()),
                    models.Message.type == "text",
                    models.Message.deleted_at.is_(None),
                    models.Message.body.ilike(f"%{escaped}%", escape="\\"),
                )
                .order_by(models.Message.created_at.desc())
                .limit(20)
            )
            .scalars()
            .all()
        )
        for m in message_rows:
            conversation = by_conv_id[m.conversation_id]
            member_ids = conversation_service.active_member_ids(db, m.conversation_id)
            matched_messages.append(
                schemas.SearchMessageHitOut(
                    conversation=conversation_service.build_conversation_out(db, conversation, user_id),
                    message=message_service.message_out(db, m, member_ids),
                )
            )

    return schemas.SearchResultsOut(
        conversations=matched_conversations,
        contacts=matched_contacts,
        messages=matched_messages,
    )
