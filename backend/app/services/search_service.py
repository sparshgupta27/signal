"""The global search box: chats by title, contacts by name, and messages by
text.

Where it sits: called only by routers/search.py. Everything is scoped to the
conversations the caller is currently an active member of.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import mappers, models, schemas
from . import conversation_service, message_service


def _escape_like(value: str) -> str:
    """Makes %, _ and \\ in the user's query match literally in a LIKE."""
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def search(db: Session, user_id: str, query: str) -> schemas.SearchResultsOut:
    """Titles and names are matched case-insensitively in Python; message
    bodies with an escaped ILIKE, newest 20 first."""
    text = query.strip()
    if not text:
        return schemas.SearchResultsOut(conversations=[], contacts=[], messages=[])
    needle = text.lower()

    # The same scope as the chat list — and the only universe message search
    # is allowed to touch. A conversation the user has left (left_at set)
    # never appears here, so its messages are excluded too.
    my_conversations = (
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
    conversations_by_id = {c.id: c for c in my_conversations}

    # A group's title is its name; a DM's title is the other person's name.
    matched_conversations = []
    for conversation in my_conversations:
        if conversation.type == "group":
            title = conversation.name or ""
        else:
            other_id = next(
                (
                    uid
                    for uid in conversation_service.active_member_ids(db, conversation.id)
                    if uid != user_id
                ),
                None,
            )
            other = db.get(models.User, other_id) if other_id else None
            title = other.display_name if other else ""
        if needle in title.lower():
            matched_conversations.append(
                conversation_service.build_conversation_out(db, conversation, user_id)
            )

    contact_rows = (
        db.execute(select(models.Contact).where(models.Contact.owner_id == user_id)).scalars().all()
    )
    matched_contacts = []
    for contact in contact_rows:
        target = db.get(models.User, contact.contact_id)
        if target and needle in target.display_name.lower():
            matched_contacts.append(mappers.directory_user_out(target, True, user_id))

    matched_messages: list[schemas.SearchMessageHitOut] = []
    if conversations_by_id:
        escaped = _escape_like(text)
        message_rows = (
            db.execute(
                select(models.Message)
                .where(
                    models.Message.conversation_id.in_(conversations_by_id.keys()),
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
        for message in message_rows:
            conversation = conversations_by_id[message.conversation_id]
            member_ids = conversation_service.active_member_ids(db, message.conversation_id)
            matched_messages.append(
                schemas.SearchMessageHitOut(
                    conversation=conversation_service.build_conversation_out(db, conversation, user_id),
                    message=message_service.message_out(db, message, member_ids),
                )
            )

    return schemas.SearchResultsOut(
        conversations=matched_conversations,
        contacts=matched_contacts,
        messages=matched_messages,
    )
