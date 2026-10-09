from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, CheckConstraint, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column

from .core.database import Base


def gen_id() -> str:
    return uuid.uuid4().hex


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(primary_key=True, default=gen_id)
    phone: Mapped[str | None] = mapped_column(unique=True, nullable=True)
    username: Mapped[str | None] = mapped_column(unique=True, nullable=True)
    display_name: Mapped[str] = mapped_column(nullable=False)
    about: Mapped[str] = mapped_column(default="")
    avatar_url: Mapped[str | None] = mapped_column(nullable=True)
    is_online: Mapped[bool] = mapped_column(default=False)
    last_seen_at: Mapped[datetime | None] = mapped_column(nullable=True)
    show_last_seen: Mapped[bool] = mapped_column(default=True)
    # Mock E2EE — see core/security.py. Real, public, non-secret; everyone
    # can see everyone's, same as a real public key.
    public_key: Mapped[str | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)

    __table_args__ = (
        CheckConstraint("phone IS NOT NULL OR username IS NOT NULL", name="ck_user_identifier"),
    )


class AuthSession(Base):
    """Backs the refresh-token flow and server-side logout revocation —
    not named `Session` to avoid colliding with sqlalchemy.orm.Session,
    which every service function already imports under that name."""

    __tablename__ = "auth_sessions"

    id: Mapped[str] = mapped_column(primary_key=True, default=gen_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    # sha256 of the refresh token — the raw token is never stored, same
    # discipline as a password hash.
    refresh_token_hash: Mapped[str] = mapped_column(unique=True)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(nullable=True)

    __table_args__ = (Index("ix_auth_sessions_user", "user_id"),)


class Contact(Base):
    __tablename__ = "contacts"

    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    contact_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    nickname: Mapped[str | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(primary_key=True, default=gen_id)
    type: Mapped[str] = mapped_column(nullable=False)  # 'direct' | 'group'
    name: Mapped[str | None] = mapped_column(nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(nullable=True)
    created_by: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    # sorted "userIdA:userIdB" for direct conversations; NULL for groups — the
    # UNIQUE constraint is what makes "start a DM" idempotent per pair.
    dm_key: Mapped[str | None] = mapped_column(unique=True, nullable=True)
    disappearing_seconds: Mapped[int | None] = mapped_column(nullable=True)
    last_message_at: Mapped[datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)

    __table_args__ = (CheckConstraint("type IN ('direct','group')", name="ck_conversation_type"),)


class ConversationParticipant(Base):
    __tablename__ = "conversation_participants"

    conversation_id: Mapped[str] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role: Mapped[str] = mapped_column(default="member")  # 'admin' | 'member'
    joined_at: Mapped[datetime] = mapped_column(default=utcnow)
    left_at: Mapped[datetime | None] = mapped_column(nullable=True)
    last_read_at: Mapped[datetime | None] = mapped_column(nullable=True)
    is_muted: Mapped[bool] = mapped_column(default=False)
    is_pinned: Mapped[bool] = mapped_column(default=False)
    is_archived: Mapped[bool] = mapped_column(default=False)

    __table_args__ = (Index("ix_participants_user", "user_id"),)


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(primary_key=True, default=gen_id)
    client_id: Mapped[str | None] = mapped_column(nullable=True)
    conversation_id: Mapped[str] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE")
    )
    sender_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    type: Mapped[str] = mapped_column(default="text")  # 'text' | 'system'
    body: Mapped[str] = mapped_column(default="")
    reply_to_id: Mapped[str | None] = mapped_column(
        ForeignKey("messages.id", ondelete="SET NULL"), nullable=True
    )
    # {action, actorId, targetId?, value?} — mirrors the frontend's SystemEvent
    # shape verbatim so no field remapping is needed for system messages.
    system_event: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    deleted_at: Mapped[datetime | None] = mapped_column(nullable=True)
    edited_at: Mapped[datetime | None] = mapped_column(nullable=True)
    # Mock E2EE — see core/security.py. Stored alongside body, not instead
    # of it; the rest of the app still reads the plaintext body.
    ciphertext: Mapped[str | None] = mapped_column(nullable=True)
    # Set once, at send time, from the conversation's disappearing_seconds AT
    # THAT MOMENT — never recomputed from the live timer later, so changing
    # the timer afterward can't retroactively expire old messages.
    expires_at: Mapped[datetime | None] = mapped_column(nullable=True)

    __table_args__ = (
        Index("ix_messages_conv_created", "conversation_id", "created_at"),
        Index("ix_messages_expires_at", "expires_at"),
    )


class MessageHiddenForUser(Base):
    """'Delete for me' — hides a message from one viewer's own history
    without touching it for anyone else, unlike deleted_at (which is a
    real, global soft-delete used for 'delete for everyone' and expiry)."""

    __tablename__ = "message_hidden_for_user"

    message_id: Mapped[str] = mapped_column(
        ForeignKey("messages.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)


class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[str] = mapped_column(primary_key=True, default=gen_id)
    # Nullable until the message it belongs to is actually sent — uploaded
    # first (POST /uploads), linked to a message second (POST .../messages).
    message_id: Mapped[str | None] = mapped_column(
        ForeignKey("messages.id", ondelete="CASCADE"), nullable=True
    )
    uploader_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    file_name: Mapped[str] = mapped_column(nullable=False)
    mime_type: Mapped[str] = mapped_column(nullable=False)
    size_bytes: Mapped[int] = mapped_column(nullable=False)
    # Path on disk (under settings.upload_dir), not a public URL — served
    # through GET /uploads/{id} so membership can be checked first.
    storage_path: Mapped[str] = mapped_column(nullable=False)
    width: Mapped[int | None] = mapped_column(nullable=True)
    height: Mapped[int | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)

    __table_args__ = (Index("ix_attachments_message", "message_id"),)


class MessageReaction(Base):
    __tablename__ = "message_reactions"

    message_id: Mapped[str] = mapped_column(
        ForeignKey("messages.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    emoji: Mapped[str] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)


class MessageReceipt(Base):
    __tablename__ = "message_receipts"

    message_id: Mapped[str] = mapped_column(
        ForeignKey("messages.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    delivered_at: Mapped[datetime | None] = mapped_column(nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(nullable=True)
