from app import models
from app.services.message_service import create_message

from .conftest import auth_headers, make_direct_conversation, make_user


def test_reaction_replaces_previous_for_same_user(client, db):
    alice = make_user(db, "Alice9")
    bob = make_user(db, "Bob9")
    convo = make_direct_conversation(db, alice.id, bob.id)
    msg = create_message(db, convo, alice.id, "client-r1", "react to me", None)

    r = client.put(f"/api/v1/messages/{msg.id}/reaction", json={"emoji": "👍"}, headers=auth_headers(bob.id))
    assert r.status_code == 204
    r = client.put(f"/api/v1/messages/{msg.id}/reaction", json={"emoji": "❤️"}, headers=auth_headers(bob.id))
    assert r.status_code == 204

    db.expire_all()
    rows = db.query(models.MessageReaction).filter_by(message_id=msg.id, user_id=bob.id).all()
    assert len(rows) == 1
    assert rows[0].emoji == "❤️"


def test_non_member_cannot_react(client, db):
    alice = make_user(db, "Alice10")
    bob = make_user(db, "Bob10")
    stranger = make_user(db, "Stranger10")
    convo = make_direct_conversation(db, alice.id, bob.id)
    msg = create_message(db, convo, alice.id, "client-r2", "private message", None)

    r = client.put(
        f"/api/v1/messages/{msg.id}/reaction", json={"emoji": "👍"}, headers=auth_headers(stranger.id)
    )
    assert r.status_code == 403


def test_remove_reaction(client, db):
    alice = make_user(db, "Alice11")
    bob = make_user(db, "Bob11")
    convo = make_direct_conversation(db, alice.id, bob.id)
    msg = create_message(db, convo, alice.id, "client-r3", "remove my reaction", None)

    client.put(f"/api/v1/messages/{msg.id}/reaction", json={"emoji": "👍"}, headers=auth_headers(bob.id))
    r = client.delete(f"/api/v1/messages/{msg.id}/reaction", headers=auth_headers(bob.id))
    assert r.status_code == 204

    db.expire_all()
    rows = db.query(models.MessageReaction).filter_by(message_id=msg.id, user_id=bob.id).all()
    assert rows == []
