from app import models
from app.services.message_service import create_message, mark_read

from .conftest import auth_headers, make_direct_conversation, make_user


def test_sender_can_edit_own_message(client, db):
    alice = make_user(db, "AliceE1")
    bob = make_user(db, "BobE1")
    convo = make_direct_conversation(db, alice.id, bob.id)
    msg = create_message(db, convo, alice.id, "client-e1", "original", None)

    r = client.patch(
        f"/api/v1/messages/{msg.id}", json={"body": "edited text"}, headers=auth_headers(alice.id)
    )
    assert r.status_code == 200
    body = r.json()
    assert body["body"] == "edited text"
    assert body["editedAt"] is not None


def test_non_sender_cannot_edit_message(client, db):
    alice = make_user(db, "AliceE2")
    bob = make_user(db, "BobE2")
    convo = make_direct_conversation(db, alice.id, bob.id)
    msg = create_message(db, convo, alice.id, "client-e2", "original", None)

    r = client.patch(
        f"/api/v1/messages/{msg.id}", json={"body": "hacked"}, headers=auth_headers(bob.id)
    )
    assert r.status_code == 403


def test_delete_for_me_hides_message_only_for_that_user(client, db):
    alice = make_user(db, "AliceE3")
    bob = make_user(db, "BobE3")
    convo = make_direct_conversation(db, alice.id, bob.id)
    msg = create_message(db, convo, alice.id, "client-e3", "secret to me", None)

    r = client.delete(f"/api/v1/messages/{msg.id}/me", headers=auth_headers(bob.id))
    assert r.status_code == 204

    bob_page = client.get(
        f"/api/v1/conversations/{convo.id}/messages", headers=auth_headers(bob.id)
    ).json()
    assert all(m["id"] != msg.id for m in bob_page["messages"])

    alice_page = client.get(
        f"/api/v1/conversations/{convo.id}/messages", headers=auth_headers(alice.id)
    ).json()
    assert any(m["id"] == msg.id for m in alice_page["messages"])


def test_delete_for_everyone_only_allowed_by_sender(client, db):
    alice = make_user(db, "AliceE4")
    bob = make_user(db, "BobE4")
    convo = make_direct_conversation(db, alice.id, bob.id)
    msg = create_message(db, convo, alice.id, "client-e4", "oops", None)

    r = client.delete(f"/api/v1/messages/{msg.id}", headers=auth_headers(bob.id))
    assert r.status_code == 403

    r = client.delete(f"/api/v1/messages/{msg.id}", headers=auth_headers(alice.id))
    assert r.status_code == 204

    db.expire_all()
    stored = db.get(models.Message, msg.id)
    assert stored.deleted_at is not None
    assert stored.body == ""


def test_message_receipts_reflect_read_state_and_sender_only_access(client, db):
    alice = make_user(db, "AliceE5")
    bob = make_user(db, "BobE5")
    convo = make_direct_conversation(db, alice.id, bob.id)
    msg = create_message(db, convo, alice.id, "client-e5", "read me", None)

    r = client.get(f"/api/v1/messages/{msg.id}/receipts", headers=auth_headers(bob.id))
    assert r.status_code == 403

    r = client.get(f"/api/v1/messages/{msg.id}/receipts", headers=auth_headers(alice.id))
    assert r.status_code == 200
    receipts = r.json()["receipts"]
    assert len(receipts) == 1
    assert receipts[0]["userId"] == bob.id
    assert receipts[0]["readAt"] is None

    mark_read(db, convo.id, bob.id, msg.id)

    r = client.get(f"/api/v1/messages/{msg.id}/receipts", headers=auth_headers(alice.id))
    receipts = r.json()["receipts"]
    assert receipts[0]["readAt"] is not None
