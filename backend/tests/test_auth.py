from app import models

from .conftest import make_user


def _verify(client, identifier: str):
    otp = client.post("/api/v1/auth/request-otp", json={"identifier": identifier}).json()["otpHint"]
    return client.post("/api/v1/auth/verify-otp", json={"identifier": identifier, "code": otp})


def test_verify_otp_returns_both_tokens_and_creates_a_session(client, db):
    r = _verify(client, "+19995551001")
    body = r.json()
    assert r.status_code == 200
    assert body["accessToken"]
    assert body["refreshToken"]

    db.expire_all()
    user = db.query(models.User).filter_by(phone="+19995551001").one()
    sessions = db.query(models.AuthSession).filter_by(user_id=user.id).all()
    assert len(sessions) == 1
    assert sessions[0].revoked_at is None


def test_refresh_rotates_the_token_and_old_one_stops_working(client, db):
    body = _verify(client, "+19995551002").json()
    refresh_token = body["refreshToken"]

    r1 = client.post("/api/v1/auth/refresh", json={"refreshToken": refresh_token})
    assert r1.status_code == 200
    new_pair = r1.json()
    assert new_pair["refreshToken"] != refresh_token

    # The rotated-out token is dead now.
    r2 = client.post("/api/v1/auth/refresh", json={"refreshToken": refresh_token})
    assert r2.status_code == 401

    # But the newly issued one works.
    r3 = client.post("/api/v1/auth/refresh", json={"refreshToken": new_pair["refreshToken"]})
    assert r3.status_code == 200


def test_login_with_a_username_is_rejected(client, db):
    user = make_user(db, "UsernameOnly")  # username-only account, no phone

    r = client.post("/api/v1/auth/request-otp", json={"identifier": user.username})
    assert r.status_code == 400

    r = client.post("/api/v1/auth/verify-otp", json={"identifier": user.username, "code": "000000"})
    assert r.json()["success"] is False


def test_phone_formatting_does_not_matter_but_the_number_must_match_exactly(client, db):
    first = _verify(client, "+91 98765 43210").json()
    again = _verify(client, "+919876543210").json()
    assert again["user"]["id"] == first["user"]["id"]
    assert again["needsProfile"] is False

    # Same trailing digits, different country code: a different account,
    # not a suffix match onto the existing one.
    other = _verify(client, "+1 98765 43210").json()
    assert other["user"]["id"] != first["user"]["id"]
    assert other["needsProfile"] is True


def test_refresh_with_unknown_token_is_rejected(client):
    r = client.post("/api/v1/auth/refresh", json={"refreshToken": "not-a-real-token"})
    assert r.status_code == 401


def test_logout_revokes_the_session_so_the_access_token_stops_working(client, db):
    body = _verify(client, "+19995551003").json()
    access_token = body["accessToken"]
    headers = {"Authorization": f"Bearer {access_token}"}

    # Works before logout.
    r = client.get("/api/v1/users/me", headers=headers)
    assert r.status_code == 200

    r = client.post("/api/v1/auth/logout", headers=headers)
    assert r.status_code == 204

    # Same still-unexpired JWT is now rejected, because its session is revoked.
    r = client.get("/api/v1/users/me", headers=headers)
    assert r.status_code == 401


def test_logout_also_kills_the_refresh_token(client):
    body = _verify(client, "+19995551004").json()
    headers = {"Authorization": f"Bearer {body['accessToken']}"}

    client.post("/api/v1/auth/logout", headers=headers)

    r = client.post("/api/v1/auth/refresh", json={"refreshToken": body["refreshToken"]})
    assert r.status_code == 401


def test_revoked_session_token_is_rejected_by_the_ws_and_upload_token_path(client, db):
    from app.core.deps import resolve_user_from_token

    alice = make_user(db, "AliceAuth1")
    from .conftest import token_for

    token = token_for(alice.id)
    assert resolve_user_from_token(db, token) is not None

    db.expire_all()
    from app.core.security import decode_access_token

    _, session_id = decode_access_token(token)
    session = db.get(models.AuthSession, session_id)
    session.revoked_at = session.created_at
    db.commit()

    assert resolve_user_from_token(db, token) is None
