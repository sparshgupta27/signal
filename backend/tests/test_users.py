from .conftest import auth_headers, make_user


def test_set_username(client, db):
    alice = make_user(db, "AliceU1")

    r = client.patch("/api/v1/users/me", json={"username": "alice.cool"}, headers=auth_headers(alice.id))
    assert r.status_code == 200
    assert r.json()["username"] == "alice.cool"


def test_username_must_be_unique(client, db):
    alice = make_user(db, "AliceU2")
    bob = make_user(db, "BobU2")
    client.patch("/api/v1/users/me", json={"username": "taken.name"}, headers=auth_headers(alice.id))

    r = client.patch("/api/v1/users/me", json={"username": "taken.name"}, headers=auth_headers(bob.id))
    assert r.status_code == 409


def test_username_rejects_bad_format(client, db):
    alice = make_user(db, "AliceU3")

    r = client.patch("/api/v1/users/me", json={"username": "a"}, headers=auth_headers(alice.id))
    assert r.status_code == 400

    r = client.patch("/api/v1/users/me", json={"username": "1starts.with.digit"}, headers=auth_headers(alice.id))
    assert r.status_code == 400

    r = client.patch("/api/v1/users/me", json={"username": "has spaces"}, headers=auth_headers(alice.id))
    assert r.status_code == 400


def test_username_normalizes_case_and_at_sign(client, db):
    alice = make_user(db, "AliceU4")

    r = client.patch("/api/v1/users/me", json={"username": "@Alice.Four"}, headers=auth_headers(alice.id))
    assert r.status_code == 200
    assert r.json()["username"] == "alice.four"
