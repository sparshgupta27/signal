import os

from app import models
from app.core.config import settings
from app.services.message_service import create_message
from app.services.upload_service import save_upload

from .conftest import auth_headers, make_direct_conversation, make_user


class _FakeUploadFile:
    def __init__(self, filename: str, content_type: str):
        self.filename = filename
        self.content_type = content_type


def _make_attachment(db, uploader_id: str, message_id: str | None = None) -> models.Attachment:
    attachment = save_upload(
        db, uploader_id, _FakeUploadFile("clip.jpg", "image/jpeg"), b"fake-bytes", 100, 100
    )
    if message_id:
        attachment.message_id = message_id
        db.commit()
    return attachment


def test_forward_text_message_to_multiple_conversations(client, db):
    alice = make_user(db, "AliceF1")
    bob = make_user(db, "BobF1")
    carol = make_user(db, "CarolF1")
    convo_ab = make_direct_conversation(db, alice.id, bob.id)
    convo_ac = make_direct_conversation(db, alice.id, carol.id)

    msg = create_message(db, convo_ab, alice.id, "client-f1", "forward me", None)

    r = client.post(
        f"/api/v1/messages/{msg.id}/forward",
        json={"conversationIds": [convo_ac.id]},
        headers=auth_headers(alice.id),
    )
    assert r.status_code == 200
    forwarded = r.json()
    assert len(forwarded) == 1
    assert forwarded[0]["body"] == "forward me"
    assert forwarded[0]["conversationId"] == convo_ac.id
    assert forwarded[0]["id"] != msg.id


def test_forward_duplicates_attachment_not_reuses_it(client, db):
    alice = make_user(db, "AliceF2")
    bob = make_user(db, "BobF2")
    carol = make_user(db, "CarolF2")
    convo_ab = make_direct_conversation(db, alice.id, bob.id)
    convo_ac = make_direct_conversation(db, alice.id, carol.id)

    msg = create_message(db, convo_ab, alice.id, "client-f2", "", None)
    original_attachment = _make_attachment(db, alice.id, msg.id)

    r = client.post(
        f"/api/v1/messages/{msg.id}/forward",
        json={"conversationIds": [convo_ac.id]},
        headers=auth_headers(alice.id),
    )
    assert r.status_code == 200
    forwarded_attachments = r.json()[0]["attachments"]
    assert len(forwarded_attachments) == 1
    assert forwarded_attachments[0]["id"] != original_attachment.id

    db.expire_all()
    new_attachment = db.get(models.Attachment, forwarded_attachments[0]["id"])
    assert new_attachment.message_id != original_attachment.message_id
    assert new_attachment.storage_path != original_attachment.storage_path
    # Deleting the original's file shouldn't take the forwarded copy down
    # with it — they're genuinely separate files on disk.
    assert os.path.exists(os.path.join(settings.upload_dir, new_attachment.storage_path))


def test_forward_skips_conversation_caller_is_not_in(client, db):
    alice = make_user(db, "AliceF3")
    bob = make_user(db, "BobF3")
    carol = make_user(db, "CarolF3")
    stranger = make_user(db, "StrangerF3")
    convo_ab = make_direct_conversation(db, alice.id, bob.id)
    # Alice is not a member of this one.
    convo_cs = make_direct_conversation(db, carol.id, stranger.id)

    msg = create_message(db, convo_ab, alice.id, "client-f3", "sneaky", None)

    r = client.post(
        f"/api/v1/messages/{msg.id}/forward",
        json={"conversationIds": [convo_cs.id]},
        headers=auth_headers(alice.id),
    )
    assert r.status_code == 200
    assert r.json() == []

    db.expire_all()
    count = db.query(models.Message).filter_by(conversation_id=convo_cs.id).count()
    assert count == 0


def test_cannot_forward_a_message_from_a_conversation_not_a_member_of(client, db):
    alice = make_user(db, "AliceF4")
    bob = make_user(db, "BobF4")
    stranger = make_user(db, "StrangerF4")
    convo_ab = make_direct_conversation(db, alice.id, bob.id)

    msg = create_message(db, convo_ab, alice.id, "client-f4", "private", None)

    r = client.post(
        f"/api/v1/messages/{msg.id}/forward",
        json={"conversationIds": [convo_ab.id]},
        headers=auth_headers(stranger.id),
    )
    assert r.status_code == 403
