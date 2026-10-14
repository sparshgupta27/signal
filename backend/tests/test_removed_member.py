from datetime import timedelta

from app import models
from app.services.conversation_service import get_participant
from app.services.group_service import create_group, remove_member
from app.services.message_service import create_message
from app.services.upload_service import save_upload

from .conftest import auth_headers, token_for, make_user


class _FakeUploadFile:
    def __init__(self, filename: str, content_type: str):
        self.filename = filename
        self.content_type = content_type


def _send_with_attachment(db, conversation, sender_id: str, client_id: str, body: str):
    attachment = save_upload(
        db, sender_id, _FakeUploadFile(f"{client_id}.jpg", "image/jpeg"), b"img", 10, 10
    )
    message = create_message(db, conversation, sender_id, client_id, body, None, [attachment.id])
    return message, attachment


def test_removed_member_only_sees_what_was_sent_before_they_left(client, db):
    alice = make_user(db, "AliceRM1")
    bob = make_user(db, "BobRM1")
    group = create_group(db, alice.id, "Cutoff Group", [bob.id])

    _, before_file = _send_with_attachment(db, group, alice.id, "rm-before", "before removal")
    remove_member(db, group, alice.id, bob.id)
    left_at = get_participant(db, group.id, bob.id).left_at
    after_msg, after_file = _send_with_attachment(db, group, alice.id, "rm-after", "after removal")
    # Pin it clearly past the cutoff, independent of the OS clock's resolution.
    after_msg.created_at = left_at + timedelta(seconds=1)
    db.commit()

    # History: everything up to and including the removal notice, nothing after.
    r = client.get(f"/api/v1/conversations/{group.id}/messages", headers=auth_headers(bob.id))
    assert r.status_code == 200
    messages = r.json()["messages"]
    bodies = [m["body"] for m in messages]
    assert "before removal" in bodies
    assert "after removal" not in bodies
    assert messages[-1]["systemEvent"]["action"] == "member_removed"

    # Files and shared media follow the same cutoff.
    bob_token = token_for(bob.id)
    assert client.get(f"/api/v1/uploads/{before_file.id}", params={"token": bob_token}).status_code == 200
    assert client.get(f"/api/v1/uploads/{after_file.id}", params={"token": bob_token}).status_code == 404
    media = client.get(f"/api/v1/conversations/{group.id}/media", headers=auth_headers(bob.id)).json()
    assert [a["id"] for a in media] == [before_file.id]

    # So does the conversation preview.
    convo = client.get(f"/api/v1/conversations/{group.id}", headers=auth_headers(bob.id)).json()
    assert convo["lastMessage"]["type"] == "system"

    # An active member is unaffected.
    r = client.get(f"/api/v1/conversations/{group.id}/messages", headers=auth_headers(alice.id))
    assert "after removal" in [m["body"] for m in r.json()["messages"]]
    assert client.get(
        f"/api/v1/uploads/{after_file.id}", params={"token": token_for(alice.id)}
    ).status_code == 200
    assert db.get(models.Attachment, after_file.id).message_id == after_msg.id
