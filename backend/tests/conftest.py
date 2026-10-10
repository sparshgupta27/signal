"""Points the app at a throwaway SQLite file + upload dir before any app
module is imported (the engine is created at import time), so tests never
touch the real signal_clone.db."""

import os
from pathlib import Path

_HERE = Path(__file__).parent
TEST_DB_PATH = _HERE / "test_signal_clone.db"
TEST_UPLOAD_DIR = _HERE / "test_uploads"

for suffix in ("", "-wal", "-shm", "-journal"):
    p = Path(str(TEST_DB_PATH) + suffix)
    if p.exists():
        p.unlink()

os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"
os.environ["UPLOAD_DIR"] = str(TEST_UPLOAD_DIR)
os.environ["JWT_SECRET"] = "test-secret"
os.environ["CORS_ORIGINS"] = '["http://localhost:3000"]'
os.environ["DISAPPEARING_SWEEP_INTERVAL_SECONDS"] = "0.2"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from datetime import datetime, timedelta, timezone  # noqa: E402

from app import models  # noqa: E402
from app.core.database import Base, SessionLocal, engine  # noqa: E402
from app.core.limiter import limiter  # noqa: E402
from app.core.security import create_access_token, generate_refresh_token, hash_token, new_id  # noqa: E402
from app.main import app  # noqa: E402
from app.services.conversation_service import get_or_create_direct  # noqa: E402

# Created here, not left to app.main's lifespan — tests using only the `db`
# fixture (no `client`) never trigger that lifespan, but still need tables.
Base.metadata.create_all(bind=engine)


@pytest.fixture(autouse=True)
def _fresh_rate_limits():
    # Every TestClient request comes from the same "testclient" address, so
    # the per-IP OTP limits would otherwise accumulate across the whole suite.
    limiter.reset()


@pytest.fixture()
def client():
    # The `with` form is what actually triggers FastAPI's lifespan (startup
    # auto-seed + the disappearing-message sweep task) — a bare TestClient()
    # instance does not.
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


_counter = {"n": 0}


def make_user(db, name: str = "Test User") -> models.User:
    _counter["n"] += 1
    uid = f"test-user-{_counter['n']}"
    user = models.User(id=uid, username=uid, display_name=name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def token_for(user_id: str) -> str:
    """Creates a real auth_sessions row too — resolve_user_from_token
    checks that row (for revocation), so a bare JWT with no backing
    session would be rejected exactly like a logged-out one."""
    session = SessionLocal()
    try:
        auth_session = models.AuthSession(
            id=new_id("sess-"),
            user_id=user_id,
            refresh_token_hash=hash_token(generate_refresh_token()),
            expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        )
        session.add(auth_session)
        session.commit()
        return create_access_token(user_id, auth_session.id)
    finally:
        session.close()


def auth_headers(user_id: str) -> dict:
    return {"Authorization": f"Bearer {token_for(user_id)}"}


def make_direct_conversation(db, user_a_id: str, user_b_id: str) -> models.Conversation:
    return get_or_create_direct(db, user_a_id, user_b_id)
