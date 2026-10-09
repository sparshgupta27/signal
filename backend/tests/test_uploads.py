import io

from app.core.config import settings
from app.services.message_service import create_message

from .conftest import make_direct_conversation, make_user, token_for


def test_attachment_access_control(client, db):
    alice = make_user(db, "Alice7")
    bob = make_user(db, "Bob7")
    stranger = make_user(db, "Stranger7")
    convo = make_direct_conversation(db, alice.id, bob.id)

    files = {"file": ("note.txt", io.BytesIO(b"hello world"), "text/plain")}
    r = client.post(
        "/api/v1/uploads", files=files, headers={"Authorization": f"Bearer {token_for(alice.id)}"}
    )
    assert r.status_code == 200
    attachment_id = r.json()["id"]

    # Not yet attached to a message — only the uploader can fetch it.
    assert client.get(f"/api/v1/uploads/{attachment_id}", params={"token": token_for(alice.id)}).status_code == 200
    assert client.get(f"/api/v1/uploads/{attachment_id}", params={"token": token_for(bob.id)}).status_code == 404

    create_message(db, convo, alice.id, "client-up1", "", None, [attachment_id])

    # Now a real member of the conversation can fetch it...
    assert client.get(f"/api/v1/uploads/{attachment_id}", params={"token": token_for(bob.id)}).status_code == 200
    # ...but a stranger still can't.
    assert client.get(f"/api/v1/uploads/{attachment_id}", params={"token": token_for(stranger.id)}).status_code == 404


def test_upload_rejects_oversized_file(client, db):
    alice = make_user(db, "Alice8")
    big = b"x" * (settings.max_upload_bytes + 1)
    files = {"file": ("big.bin", io.BytesIO(big), "application/octet-stream")}
    r = client.post(
        "/api/v1/uploads", files=files, headers={"Authorization": f"Bearer {token_for(alice.id)}"}
    )
    assert r.status_code == 413


def test_upload_rejects_empty_file(client, db):
    alice = make_user(db, "Alice8b")
    files = {"file": ("empty.txt", io.BytesIO(b""), "text/plain")}
    r = client.post(
        "/api/v1/uploads", files=files, headers={"Authorization": f"Bearer {token_for(alice.id)}"}
    )
    assert r.status_code == 400
