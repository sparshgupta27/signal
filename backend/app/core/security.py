import base64
import hashlib
import secrets
import time
import uuid

import jwt

from .config import settings


def create_access_token(user_id: str, session_id: str) -> str:
    """Short-lived (15 min) — session_id ties it to an auth_sessions row so
    logout (which revokes that row) takes effect immediately instead of
    waiting out whatever's left of the token's own expiry."""
    now = int(time.time())
    payload = {
        "sub": user_id,
        "sid": session_id,
        "iat": now,
        "exp": now + settings.access_token_expire_minutes * 60,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> tuple[str, str] | None:
    """Returns (user_id, session_id), or None if the JWT itself is invalid
    or expired. Does NOT check revocation — callers needing that use
    core.deps.resolve_user_from_token, which looks up the session row too."""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        sub, sid = payload.get("sub"), payload.get("sid")
        if not sub or not sid:
            return None
        return sub, sid
    except jwt.PyJWTError:
        return None


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """Refresh tokens are stored as a hash, same discipline as a password —
    the raw token only ever exists in transit and in the client's storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def new_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:24]}"


# --- mock end-to-end encryption -------------------------------------------
# Real E2EE (an actual key exchange + ciphertext the server can't read) is
# explicitly out of scope for this assignment — but these two functions mark
# exactly where it would plug in: a public_key per user, a ciphertext per
# message, stored alongside (not instead of) the plaintext the rest of the
# app still reads. Neither is cryptographically meaningful.


def generate_mock_public_key() -> str:
    """A random-looking per-user fingerprint, generated once at account
    creation — stands in for the public half of a real key pair."""
    return f"mockpk_{secrets.token_hex(32)}"


def mock_encrypt(body: str) -> str:
    """Base64 is trivially reversible, which is the point: this is a
    placeholder shape for 'what ciphertext would look like here', not an
    attempt at real confidentiality."""
    return base64.b64encode(body.encode("utf-8")).decode("ascii")
