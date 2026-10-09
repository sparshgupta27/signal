import time

from fastapi import HTTPException

from app.services.conversation_service import set_disappearing
from app.services.group_service import create_group
from app.services.message_service import create_message

from .conftest import make_direct_conversation, make_user


def test_expiry_uses_per_message_timer_not_live_timer(db):
    """Changing the timer after a message was sent must not retroactively
    expire it — expires_at is fixed at send time, not recomputed later."""
    alice = make_user(db, "Alice4")
    bob = make_user(db, "Bob4")
    convo = make_direct_conversation(db, alice.id, bob.id)

    set_disappearing(db, convo, alice.id, 3600)  # 1 hour
    db.refresh(convo)
    msg = create_message(db, convo, alice.id, "client-4", "sent under the 1h timer", None)
    assert msg.expires_at is not None
    original_expiry = msg.expires_at

    # Tighten the timer drastically — the already-sent message's expiry
    # must not move.
    set_disappearing(db, convo, alice.id, 30)
    db.refresh(msg)
    assert msg.expires_at == original_expiry
    assert msg.deleted_at is None


def test_set_disappearing_requires_group_admin(db):
    alice = make_user(db, "Alice5")
    bob = make_user(db, "Bob5")
    group = create_group(db, alice.id, "Admin Test Group", [bob.id])

    try:
        set_disappearing(db, group, bob.id, 60)
        assert False, "a non-admin should not be able to set the group's timer"
    except HTTPException as exc:
        assert exc.status_code == 403


def test_either_dm_member_can_set_disappearing(db):
    alice = make_user(db, "Alice5b")
    bob = make_user(db, "Bob5b")
    convo = make_direct_conversation(db, alice.id, bob.id)

    # Should not raise — either side of a DM may set it.
    set_disappearing(db, convo, bob.id, 60)
    db.refresh(convo)
    assert convo.disappearing_seconds == 60


def test_sweep_deletes_expired_messages(client, db):
    alice = make_user(db, "Alice6")
    bob = make_user(db, "Bob6")
    convo = make_direct_conversation(db, alice.id, bob.id)

    set_disappearing(db, convo, alice.id, 1)  # 1 second
    db.refresh(convo)
    msg = create_message(db, convo, alice.id, "client-6", "ephemeral message", None)

    # The `client` fixture's lifespan starts the sweep loop (0.2s interval
    # in tests, see conftest) running concurrently in TestClient's
    # background thread while this sleeps.
    time.sleep(1.5)

    db.refresh(msg)
    assert msg.deleted_at is not None
    assert msg.body == ""
