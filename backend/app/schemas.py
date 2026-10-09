from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """snake_case fields in Python, camelCase keys on the wire — matches the
    frontend's TS types field-for-field so lib/api.ts needs no remapping."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# --- auth -------------------------------------------------------------------


class RequestOtpIn(CamelModel):
    identifier: str


class RequestOtpOut(CamelModel):
    is_new_user: bool
    otp_hint: str = "123456"


class VerifyOtpIn(CamelModel):
    identifier: str
    code: str


class UserOut(CamelModel):
    id: str
    name: str
    username: str
    phone: str
    avatar_url: str | None = None
    about: str = ""
    is_online: bool = False
    # None to anyone but the user themselves if they've hidden it — same
    # null-it-out-for-everyone-else pattern as last_seen_at, not a leak of
    # "whether privacy is on" to other users.
    last_seen_at: datetime | None = None
    show_last_seen: bool | None = None


class VerifyOtpOut(CamelModel):
    success: bool
    access_token: str | None = None
    user: UserOut | None = None
    needs_profile: bool = False


class DirectoryUserOut(UserOut):
    is_contact: bool = False


class UpdateMeIn(CamelModel):
    name: str | None = None
    about: str | None = None
    avatar_url: str | None = None
    show_last_seen: bool | None = None


# --- contacts -----------------------------------------------------------------


class AddContactIn(CamelModel):
    user_id: str


# --- conversations ------------------------------------------------------------


class ConversationSummaryOut(CamelModel):
    id: str
    body: str
    sender_id: str | None
    type: str
    created_at: datetime
    deleted_at: datetime | None = None


class GroupMemberOut(CamelModel):
    user_id: str
    role: str
    joined_at: datetime
    left_at: datetime | None = None


class ConversationOut(CamelModel):
    id: str
    type: str
    name: str | None
    avatar_url: str | None = None
    member_ids: list[str]
    members: list[GroupMemberOut] | None = None
    created_by: str | None = None
    disappearing_seconds: int | None = None
    last_message: ConversationSummaryOut | None
    last_message_at: datetime | None
    unread_count: int
    is_pinned: bool
    is_muted: bool
    is_archived: bool
    created_at: datetime


class CreateDirectIn(CamelModel):
    user_id: str


class CreateGroupIn(CamelModel):
    name: str
    member_ids: list[str]


class UpdateParticipantFlagsIn(CamelModel):
    is_pinned: bool | None = None
    is_muted: bool | None = None
    is_archived: bool | None = None


class UpdateConversationIn(CamelModel):
    """Conversation-level settings — currently just the disappearing-message
    timer, which is shared by everyone in the chat (unlike the per-viewer
    flags in UpdateParticipantFlagsIn)."""

    disappearing_seconds: int | None = None


# --- messages -------------------------------------------------------------------


class AttachmentOut(CamelModel):
    id: str
    kind: str  # 'image' | 'file' — derived from mime_type, not stored separately
    url: str
    name: str
    size: int
    mime_type: str
    width: int | None = None
    height: int | None = None


class ReactionOut(CamelModel):
    emoji: str
    user_id: str


class MessageOut(CamelModel):
    id: str
    client_id: str
    conversation_id: str
    sender_id: str | None
    type: str
    body: str
    reply_to_id: str | None = None
    attachments: list[AttachmentOut] = []
    reactions: list[ReactionOut] = []
    status: str
    created_at: datetime
    deleted_at: datetime | None = None
    system_event: dict | None = None


class MessagePageOut(CamelModel):
    messages: list[MessageOut]
    has_more: bool


class SendMessageIn(CamelModel):
    client_id: str
    body: str
    reply_to_id: str | None = None
    attachment_ids: list[str] = []


class ForwardMessageIn(CamelModel):
    conversation_ids: list[str]


class UploadOut(CamelModel):
    id: str
    kind: str
    url: str
    name: str
    size: int
    mime_type: str
    width: int | None = None
    height: int | None = None


class SetReactionIn(CamelModel):
    emoji: str


class MarkReadIn(CamelModel):
    up_to_message_id: str


# --- groups ---------------------------------------------------------------------


class AddMembersIn(CamelModel):
    user_ids: list[str]


class SetRoleIn(CamelModel):
    role: str


# --- search -----------------------------------------------------------------------


class SearchMessageHitOut(CamelModel):
    conversation: ConversationOut
    message: MessageOut


class SearchResultsOut(CamelModel):
    conversations: list[ConversationOut]
    contacts: list[DirectoryUserOut]
    messages: list[SearchMessageHitOut]
