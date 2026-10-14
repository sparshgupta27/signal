"""Builds server->client WebSocket events and fans them out to a list of users.

Where it sits: called after a change is committed, by both the WS handlers
(ws/router.py) and REST routers — a REST edit or group change still has to
reach everyone live. Covers message.new/.edited/.status/.deleted,
reaction.updated and conversation.updated; presence and typing events are
built inline in ws/router.py. Delivery itself is ws/manager.py.
"""

from datetime import datetime

from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models
from ..services import conversation_service, message_service
from .manager import manager


def json_payload(model: BaseModel) -> dict:
    """camelCase, JSON-safe dict — the same shape REST responses use."""
    return model.model_dump(by_alias=True, mode="json")


async def broadcast_conversation_updated(
    db: Session, conversation: models.Conversation, member_ids: list[str]
) -> None:
    # Unread/pinned/muted are per-viewer, so each recipient gets their own build.
    for uid in member_ids:
        out = conversation_service.build_conversation_out(db, conversation, uid)
        await manager.send_to_user(
            uid, {"type": "conversation.updated", "data": {"conversation": json_payload(out)}}
        )


async def broadcast_message_new(db: Session, message: models.Message, member_ids: list[str]) -> None:
    """Includes the sender: their client swaps its optimistic copy for this
    one by matching clientId."""
    out = message_service.message_out(db, message, member_ids)
    payload = {"type": "message.new", "data": {"message": json_payload(out)}}
    for uid in member_ids:
        await manager.send_to_user(uid, payload)


async def broadcast_message_edited(db: Session, message: models.Message, member_ids: list[str]) -> None:
    out = message_service.message_out(db, message, member_ids)
    payload = {"type": "message.edited", "data": {"message": json_payload(out)}}
    for uid in member_ids:
        await manager.send_to_user(uid, payload)


async def broadcast_message_status(
    member_ids: list[str], message_id: str, conversation_id: str, status: str, at: datetime
) -> None:
    payload = {
        "type": "message.status",
        "data": {
            "messageId": message_id,
            "conversationId": conversation_id,
            "status": status,
            "at": at.isoformat(),
        },
    }
    for uid in member_ids:
        await manager.send_to_user(uid, payload)


async def broadcast_message_deleted(
    member_ids: list[str], message_id: str, conversation_id: str, deleted_at: datetime
) -> None:
    payload = {
        "type": "message.deleted",
        "data": {
            "messageId": message_id,
            "conversationId": conversation_id,
            "deletedAt": deleted_at.isoformat(),
        },
    }
    for uid in member_ids:
        await manager.send_to_user(uid, payload)


async def broadcast_reaction_updated(
    member_ids: list[str], message_id: str, conversation_id: str, reactions: list[dict]
) -> None:
    payload = {
        "type": "reaction.updated",
        "data": {
            "messageId": message_id,
            "conversationId": conversation_id,
            "reactions": reactions,
        },
    }
    for uid in member_ids:
        await manager.send_to_user(uid, payload)
