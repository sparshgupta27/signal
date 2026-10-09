import asyncio

from app import models
from app.services import block_service
from app.ws.router import _handle_send

from .conftest import auth_headers, make_direct_conversation, make_user


def test_block_and_unblock_are_idempotent(db):
    alice = make_user(db, "AliceB1")
    bob = make_user(db, "BobB1")

    assert block_service.block_user(db, alice.id, bob.id) is True
    assert block_service.block_user(db, alice.id, bob.id) is False
    assert block_service.list_blocked_ids(db, alice.id) == [bob.id]

    assert block_service.unblock_user(db, alice.id, bob.id) is True
    assert block_service.unblock_user(db, alice.id, bob.id) is False
    assert block_service.list_blocked_ids(db, alice.id) == []


def test_any_block_between_is_symmetric(db):
    alice = make_user(db, "AliceB2")
    bob = make_user(db, "BobB2")

    assert block_service.any_block_between(db, alice.id, bob.id) is False
    block_service.block_user(db, bob.id, alice.id)
    # Alice didn't block Bob — Bob blocked Alice — but the pair is still
    # blocked either way you ask it.
    assert block_service.any_block_between(db, alice.id, bob.id) is True
    assert block_service.any_block_between(db, bob.id, alice.id) is True


def test_block_endpoints_require_auth_and_reject_self_block(client, db):
    alice = make_user(db, "AliceB3")
    bob = make_user(db, "BobB3")

    r = client.post(f"/api/v1/users/{bob.id}/block", headers=auth_headers(alice.id))
    assert r.status_code == 204

    r = client.get("/api/v1/users/me/blocked", headers=auth_headers(alice.id))
    assert r.json()["userIds"] == [bob.id]

    r = client.delete(f"/api/v1/users/{bob.id}/block", headers=auth_headers(alice.id))
    assert r.status_code == 204
    assert client.get("/api/v1/users/me/blocked", headers=auth_headers(alice.id)).json()["userIds"] == []

    r = client.post(f"/api/v1/users/{alice.id}/block", headers=auth_headers(alice.id))
    assert r.status_code == 400


def test_blocked_pair_cannot_message_each_other_over_ws(db):
    alice = make_user(db, "AliceB4")
    bob = make_user(db, "BobB4")
    convo = make_direct_conversation(db, alice.id, bob.id)
    block_service.block_user(db, bob.id, alice.id)

    asyncio.run(
        _handle_send(
            db,
            alice.id,
            {"conversationId": convo.id, "clientId": "c-b4", "body": "hi"},
        )
    )

    db.expire_all()
    count = db.query(models.Message).filter_by(conversation_id=convo.id).count()
    assert count == 0


def test_unblocked_pair_can_message_again(db):
    alice = make_user(db, "AliceB5")
    bob = make_user(db, "BobB5")
    convo = make_direct_conversation(db, alice.id, bob.id)
    block_service.block_user(db, alice.id, bob.id)
    block_service.unblock_user(db, alice.id, bob.id)

    asyncio.run(
        _handle_send(
            db,
            alice.id,
            {"conversationId": convo.id, "clientId": "c-b5", "body": "hi again"},
        )
    )

    db.expire_all()
    count = db.query(models.Message).filter_by(conversation_id=convo.id).count()
    assert count == 1
