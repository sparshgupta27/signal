from datetime import datetime, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .. import models
from .database import get_db
from .security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def resolve_user_from_token(db: Session, token: str) -> models.User | None:
    """The one place that turns a raw access token into a user, checking
    both the JWT's own expiry (decode_access_token) and the backing
    auth_sessions row (revoked/expired) — shared by the Authorization-header
    path (get_current_user) and the two query-string-token paths (WS, GET
    /uploads/{id}) so a logout revokes a session everywhere at once, not
    just on REST calls that go through get_current_user."""
    decoded = decode_access_token(token)
    if not decoded:
        return None
    user_id, session_id = decoded

    session = db.get(models.AuthSession, session_id)
    now = datetime.now(timezone.utc)
    if not session or session.revoked_at is not None or session.expires_at <= now:
        return None

    return db.get(models.User, user_id)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    user = resolve_user_from_token(db, credentials.credentials)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    return user
