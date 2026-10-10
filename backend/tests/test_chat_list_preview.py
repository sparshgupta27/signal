from app.services.message_service import create_message
from app.services.upload_service import save_upload

from .conftest import auth_headers, make_direct_conversation, make_user


class _FakeUploadFile:
    def __init__(self, filename: str, content_type: str):
        self.filename = filename
        self.content_type = content_type


def _last_message_for(client, user_id: str, conversation_id: str) -> dict:
    rows = client.get("/api/v1/conversations", headers=auth_headers(user_id)).json()
    return next(c for c in rows if c["id"] == conversation_id)["lastMessage"]


def test_caption_less_photo_reports_its_kind_to_the_chat_list(client, db):
    alice = make_user(db, "AliceP1")
    bob = make_user(db, "BobP1")
    convo = make_direct_conversation(db, alice.id, bob.id)
    photo = save_upload(db, alice.id, _FakeUploadFile("beach.jpg", "image/jpeg"), b"img", 10, 10)

    create_message(db, convo, alice.id, "client-p1", "", None, [photo.id])

    last = _last_message_for(client, bob.id, convo.id)
    assert last["body"] == ""
    assert last["attachmentKind"] == "image"
    assert last["attachmentName"] == "beach.jpg"


def test_video_is_reported_as_video_not_file(client, db):
    alice = make_user(db, "AliceP2")
    bob = make_user(db, "BobP2")
    convo = make_direct_conversation(db, alice.id, bob.id)
    clip = save_upload(db, alice.id, _FakeUploadFile("clip.mp4", "video/mp4"), b"vid", None, None)

    create_message(db, convo, alice.id, "client-p2", "", None, [clip.id])

    assert _last_message_for(client, bob.id, convo.id)["attachmentKind"] == "video"


def test_plain_text_message_has_no_attachment_kind(client, db):
    alice = make_user(db, "AliceP3")
    bob = make_user(db, "BobP3")
    convo = make_direct_conversation(db, alice.id, bob.id)

    create_message(db, convo, alice.id, "client-p3", "just text", None)

    last = _last_message_for(client, bob.id, convo.id)
    assert last["attachmentKind"] is None
    assert last["body"] == "just text"
