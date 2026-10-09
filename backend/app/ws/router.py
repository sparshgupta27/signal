import json
from datetime import datetime, timezone

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from .. import models
from ..core.database import SessionLocal
from ..core.deps import resolve_user_from_token
from ..services import block_service, conversation_service, message_service
from .broadcast import broadcast_conversation_updated, broadcast_message_new, broadcast_message_status, json_payload
from .manager import manager

router = APIRouter()


@router.websocket("/ws")
async def ws_endpoint(websocket: WebSocket, token: str = Query(...)):
    db: Session = SessionLocal()
    user = resolve_user_from_token(db, token)
    if not user:
        db.close()
        await websocket.close(code=4401)
        return
    user_id = user.id

    was_offline = not manager.is_online(user_id)
    await manager.connect(user_id, websocket)
    if was_offline:
        user.is_online = True
        user.last_seen_at = None
        db.commit()
        await manager.broadcast_all(
            {"type": "presence", "data": {"userId": user_id, "isOnline": True, "lastSeenAt": None}}
        )

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                event = json.loads(raw)
            except ValueError:
                continue
            await _handle_event(db, user_id, event)
    except WebSocketDisconnect:
        pass
    finally:
        now_offline = manager.disconnect(user_id, websocket)
        if now_offline:
            user.is_online = False
            user.last_seen_at = datetime.now(timezone.utc)
            db.commit()
            await manager.broadcast_all(
                {
                    "type": "presence",
                    "data": {
                        "userId": user_id,
                        "isOnline": False,
                        # Broadcast to everyone, so same rule as the REST
                        # mappers: nulled out for everyone but the user
                        # themselves once they've hidden it — and nobody else
                        # is "themselves" here, since this fires on disconnect.
                        "lastSeenAt": (
                            user.last_seen_at.isoformat() if user.show_last_seen else None
                        ),
                    },
                }
            )
        db.close()


async def _handle_event(db: Session, user_id: str, event: dict) -> None:
    etype = event.get("type")
    data = event.get("data") or {}

    if etype == "message.send":
        await _handle_send(db, user_id, data)
    elif etype == "message.delivered":
        await _handle_delivered(db, user_id, data)
    elif etype == "message.read":
        await _handle_read(db, user_id, data)
    elif etype == "typing":
        await _handle_typing(db, user_id, data)


async def _handle_send(db: Session, user_id: str, data: dict) -> None:
    conversation_id = data.get("conversationId")
    client_id = data.get("clientId")
    body = (data.get("body") or "").strip()
    reply_to_id = data.get("replyToId")
    attachment_ids = data.get("attachmentIds") or []
    if not conversation_id or not client_id or (not body and not attachment_ids):
        return

    participant = conversation_service.get_participant(db, conversation_id, user_id)
    if not participant or participant.left_at is not None:
        return
    conversation = db.get(models.Conversation, conversation_id)
    if not conversation:
        return

    if conversation.type == "direct":
        member_ids = conversation_service.active_member_ids(db, conversation_id)
        other_id = next((uid for uid in member_ids if uid != user_id), None)
        if other_id and block_service.any_block_between(db, user_id, other_id):
            return

    message = message_service.create_message(
        db, conversation, user_id, client_id, body, reply_to_id, attachment_ids
    )
    member_ids = conversation_service.active_member_ids(db, conversation_id)
    await broadcast_message_new(db, message, member_ids)
    await broadcast_conversation_updated(db, conversation, member_ids)

    # Anyone already online right now effectively received it immediately —
    # mirrors a connected client auto-acking delivery.
    online_recipients = [uid for uid in member_ids if uid != user_id and manager.is_online(uid)]
    if online_recipients:
        for uid in online_recipients:
            message_service.mark_delivered(db, uid, [message.id])
        status = message_service.compute_status(db, message, member_ids)
        await broadcast_message_status(
            member_ids, message.id, conversation_id, status, datetime.now(timezone.utc)
        )


async def _handle_delivered(db: Session, user_id: str, data: dict) -> None:
    message_ids = data.get("messageIds") or []
    updated = message_service.mark_delivered(db, user_id, message_ids)
    for message in updated:
        member_ids = conversation_service.active_member_ids(db, message.conversation_id)
        status = message_service.compute_status(db, message, member_ids)
        await broadcast_message_status(
            member_ids, message.id, message.conversation_id, status, datetime.now(timezone.utc)
        )


async def _handle_read(db: Session, user_id: str, data: dict) -> None:
    conversation_id = data.get("conversationId")
    up_to_message_id = data.get("upToMessageId")
    if not conversation_id or not up_to_message_id:
        return

    updated = message_service.mark_read(db, conversation_id, user_id, up_to_message_id)
    member_ids = conversation_service.active_member_ids(db, conversation_id)
    for message in updated:
        status = message_service.compute_status(db, message, member_ids)
        await broadcast_message_status(
            member_ids, message.id, conversation_id, status, datetime.now(timezone.utc)
        )

    conversation = db.get(models.Conversation, conversation_id)
    if conversation:
        # Only the reader's own unread badge changed.
        out = conversation_service.build_conversation_out(db, conversation, user_id)
        await manager.send_to_user(
            user_id, {"type": "conversation.updated", "data": {"conversation": json_payload(out)}}
        )


async def _handle_typing(db: Session, user_id: str, data: dict) -> None:
    conversation_id = data.get("conversationId")
    is_typing = bool(data.get("isTyping"))
    if not conversation_id:
        return
    member_ids = conversation_service.active_member_ids(db, conversation_id)
    payload = {
        "type": "typing",
        "data": {"conversationId": conversation_id, "userId": user_id, "isTyping": is_typing},
    }
    for uid in member_ids:
        if uid != user_id:
            await manager.send_to_user(uid, payload)
