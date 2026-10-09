from app.services.group_service import create_group, remove_member
from app.services.message_service import create_message

from .conftest import auth_headers, make_direct_conversation, make_user


def test_search_excludes_conversations_user_is_not_in(client, db):
    alice = make_user(db, "Alice")
    bob = make_user(db, "Bob")
    carol = make_user(db, "Carol")

    convo = make_direct_conversation(db, alice.id, bob.id)
    create_message(db, convo, alice.id, "client-1", "the secret pineapple recipe", None)

    r = client.get("/api/v1/search", params={"q": "pineapple"}, headers=auth_headers(carol.id))
    assert r.status_code == 200
    assert r.json()["messages"] == []

    r = client.get("/api/v1/search", params={"q": "pineapple"}, headers=auth_headers(alice.id))
    assert r.status_code == 200
    bodies = [m["message"]["body"] for m in r.json()["messages"]]
    assert "the secret pineapple recipe" in bodies


def test_search_excludes_conversation_after_leaving(client, db):
    alice = make_user(db, "Alice2")
    bob = make_user(db, "Bob2")
    carol = make_user(db, "Carol2")

    group = create_group(db, alice.id, "Test Group", [bob.id, carol.id])
    create_message(db, group, alice.id, "client-g1", "unique watermelon topic", None)
    remove_member(db, group, alice.id, carol.id)

    r = client.get("/api/v1/search", params={"q": "watermelon"}, headers=auth_headers(carol.id))
    assert r.status_code == 200
    assert r.json()["messages"] == []

    r = client.get("/api/v1/search", params={"q": "watermelon"}, headers=auth_headers(bob.id))
    bodies = [m["message"]["body"] for m in r.json()["messages"]]
    assert "unique watermelon topic" in bodies


def test_search_escapes_like_wildcards(client, db):
    alice = make_user(db, "Alice3")
    bob = make_user(db, "Bob3")
    convo = make_direct_conversation(db, alice.id, bob.id)
    create_message(db, convo, alice.id, "client-2", "discount is 50% today", None)
    create_message(db, convo, alice.id, "client-3", "discount is 50X today", None)

    r = client.get("/api/v1/search", params={"q": "50%"}, headers=auth_headers(alice.id))
    bodies = [m["message"]["body"] for m in r.json()["messages"]]
    assert "discount is 50% today" in bodies
    assert "discount is 50X today" not in bodies
