from app import models
from app.seeding import remove_demo_data_for_user, seed_demo_data_for_user

from .conftest import auth_headers, make_user


def test_load_demo_data_creates_dms_and_group(client, db):
    alice = make_user(db, "AliceD1")

    r = client.post("/api/v1/users/me/demo-data", headers=auth_headers(alice.id))
    assert r.status_code == 200
    assert r.json()["created"] is True

    db.expire_all()
    dm_rows = (
        db.query(models.Conversation)
        .filter(models.Conversation.type == "direct", models.Conversation.dm_key.like(f"%{alice.id}%"))
        .all()
    )
    assert len(dm_rows) == 2

    group_rows = db.query(models.Conversation).filter_by(type="group", created_by=alice.id).all()
    assert len(group_rows) == 1
    members = (
        db.query(models.ConversationParticipant).filter_by(conversation_id=group_rows[0].id).count()
    )
    assert members == 4


def test_load_demo_data_is_idempotent(client, db):
    bob = make_user(db, "BobD2")

    r1 = client.post("/api/v1/users/me/demo-data", headers=auth_headers(bob.id))
    assert r1.json()["created"] is True

    r2 = client.post("/api/v1/users/me/demo-data", headers=auth_headers(bob.id))
    assert r2.status_code == 200
    assert r2.json()["created"] is False

    db.expire_all()
    dm_rows = (
        db.query(models.Conversation)
        .filter(models.Conversation.type == "direct", models.Conversation.dm_key.like(f"%{bob.id}%"))
        .all()
    )
    assert len(dm_rows) == 2  # not duplicated by the second call


def test_seed_users_themselves_are_excluded(db):
    created = seed_demo_data_for_user(db, "aarav")
    assert created is False


def test_remove_demo_data_undoes_everything_load_added(client, db):
    carol = make_user(db, "CarolD3")
    client.post("/api/v1/users/me/demo-data", headers=auth_headers(carol.id))

    r = client.delete("/api/v1/users/me/demo-data", headers=auth_headers(carol.id))
    assert r.status_code == 200
    assert r.json()["removed"] is True

    db.expire_all()
    dm_rows = (
        db.query(models.Conversation)
        .filter(models.Conversation.type == "direct", models.Conversation.dm_key.like(f"%{carol.id}%"))
        .all()
    )
    assert dm_rows == []
    group_rows = db.query(models.Conversation).filter_by(type="group", created_by=carol.id).all()
    assert group_rows == []
    for cid in ("aarav", "priya", "rohan"):
        assert db.get(models.Contact, (carol.id, cid)) is None


def test_remove_demo_data_is_a_safe_noop_when_nothing_was_loaded(client, db):
    dave = make_user(db, "DaveD4")

    r = client.delete("/api/v1/users/me/demo-data", headers=auth_headers(dave.id))
    assert r.status_code == 200
    assert r.json()["removed"] is False


def test_remove_demo_data_excludes_seed_users_themselves(db):
    removed = remove_demo_data_for_user(db, "aarav")
    assert removed is False
