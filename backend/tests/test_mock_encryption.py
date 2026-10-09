from app import models
from app.core.security import generate_mock_public_key, mock_encrypt
from app.services.message_service import create_message
from app.seeding import backfill_public_keys

from .conftest import auth_headers, make_direct_conversation, make_user


def test_new_user_gets_a_mock_public_key_on_registration(client):
    r = client.post("/api/v1/auth/request-otp", json={"identifier": "+19995550001"})
    otp = r.json()["otpHint"]
    r = client.post(
        "/api/v1/auth/verify-otp", json={"identifier": "+19995550001", "code": otp}
    )
    body = r.json()
    assert body["user"]["publicKey"] is not None
    assert body["user"]["publicKey"].startswith("mockpk_")


def test_message_gets_a_mock_ciphertext_distinct_from_body(db):
    alice = make_user(db, "AliceM1")
    bob = make_user(db, "BobM1")
    convo = make_direct_conversation(db, alice.id, bob.id)

    msg = create_message(db, convo, alice.id, "client-m1", "hello there", None)
    assert msg.ciphertext is not None
    assert msg.ciphertext != "hello there"
    assert msg.ciphertext == mock_encrypt("hello there")


def test_delete_for_everyone_clears_ciphertext_too(client, db):
    alice = make_user(db, "AliceM2")
    bob = make_user(db, "BobM2")
    convo = make_direct_conversation(db, alice.id, bob.id)
    msg = create_message(db, convo, alice.id, "client-m2", "secret", None)

    client.delete(f"/api/v1/messages/{msg.id}", headers=auth_headers(alice.id))

    db.expire_all()
    stored = db.get(models.Message, msg.id)
    assert stored.ciphertext is None


def test_backfill_public_keys_fills_in_users_missing_one(db):
    user = make_user(db, "NoKeyUser")
    user.public_key = None
    db.commit()

    backfill_public_keys(db)

    db.expire_all()
    refreshed = db.get(models.User, user.id)
    assert refreshed.public_key is not None
    assert refreshed.public_key.startswith("mockpk_")


def test_generate_mock_public_key_is_unique_per_call():
    assert generate_mock_public_key() != generate_mock_public_key()
