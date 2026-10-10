import re
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import mappers, models, schemas
from ..core.config import settings
from ..core.database import get_db
from ..core.deps import bearer_scheme
from ..core.limiter import limiter
from ..core.security import (
    create_access_token,
    decode_access_token,
    generate_mock_public_key,
    generate_refresh_token,
    hash_token,
    new_id,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

# Keyed by normalized identifier, holding whatever code was most recently
# "sent" for it. There's no real SMS gateway behind this mock, so the code
# is returned to the caller to display directly, mirroring the frontend's
# mock auth layer. In-memory only — fine for a single-process deploy, but
# won't survive a restart or scale across multiple instances.
_pending_otps: dict[str, str] = {}

# Login is phone-only: a one-time code only makes sense when there's a
# number to send it to. A username stays a profile handle (for finding
# people), never a way to sign in.
_PHONE_RE = re.compile(r"^\+\d{8,15}$")


def _normalize_phone(value: str) -> str | None:
    """'+91 89791 87571' -> '+918979187571', or None if it isn't a full
    international number."""
    compact = re.sub(r"[\s\-()]", "", value)
    return compact if _PHONE_RE.match(compact) else None


def _find_user_by_phone(db: Session, phone: str) -> models.User | None:
    """Exact match only — unlike the contact lookup, which also matches on a
    trailing-digits suffix for convenience, login must never resolve to the
    wrong account."""
    rows = db.execute(select(models.User).where(models.User.phone.is_not(None))).scalars()
    return next((u for u in rows if _normalize_phone(u.phone) == phone), None)


def _generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _create_session(db: Session, user_id: str) -> tuple[str, str]:
    """A fresh login/signup — new auth_sessions row backing a new refresh
    token, plus the access token (short-lived, tied to this session's id)
    handed back alongside it."""
    now = datetime.now(timezone.utc)
    refresh_token = generate_refresh_token()
    session = models.AuthSession(
        id=new_id("sess-"),
        user_id=user_id,
        refresh_token_hash=hash_token(refresh_token),
        expires_at=now + timedelta(days=settings.refresh_token_expire_days),
    )
    db.add(session)
    db.commit()
    access_token = create_access_token(user_id, session.id)
    return access_token, refresh_token


@router.post("/request-otp", response_model=schemas.RequestOtpOut)
@limiter.limit("5/minute")
def request_otp(request: Request, body: schemas.RequestOtpIn, db: Session = Depends(get_db)):
    phone = _normalize_phone(body.identifier)
    if not phone:
        raise HTTPException(400, "Enter your phone number with country code, e.g. +91 90000 00001")
    user = _find_user_by_phone(db, phone)
    code = _generate_otp()
    _pending_otps[phone] = code
    return schemas.RequestOtpOut(is_new_user=user is None, otp_hint=code)


@router.post("/verify-otp", response_model=schemas.VerifyOtpOut)
@limiter.limit("10/minute")
def verify_otp(request: Request, body: schemas.VerifyOtpIn, db: Session = Depends(get_db)):
    phone = _normalize_phone(body.identifier)
    expected = _pending_otps.get(phone) if phone else None
    if not expected or body.code != expected:
        return schemas.VerifyOtpOut(success=False)
    # Burn it on success, same as a real one-time code.
    del _pending_otps[phone]

    user = _find_user_by_phone(db, phone)
    is_new_user = user is None

    if user is None:
        user = models.User(
            id=new_id("u-"),
            phone=body.identifier.strip(),
            display_name="New user",
            public_key=generate_mock_public_key(),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token, refresh_token = _create_session(db, user.id)
    return schemas.VerifyOtpOut(
        success=True,
        access_token=access_token,
        refresh_token=refresh_token,
        user=mappers.user_out(user, user.id),
        needs_profile=is_new_user,
    )


@router.post("/refresh", response_model=schemas.RefreshTokenOut)
@limiter.limit("30/minute")
def refresh_token_endpoint(
    request: Request, body: schemas.RefreshTokenIn, db: Session = Depends(get_db)
):
    """Silent refresh — exchanges a still-valid refresh token for a new
    access token. Rotates the refresh token too (new hash, new expiry) so a
    stolen-and-reused old one gets kicked out automatically on next refresh."""
    now = datetime.now(timezone.utc)
    session = db.execute(
        select(models.AuthSession).where(
            models.AuthSession.refresh_token_hash == hash_token(body.refresh_token)
        )
    ).scalar_one_or_none()
    if not session or session.revoked_at is not None or session.expires_at <= now:
        raise HTTPException(401, "Invalid or expired refresh token")

    new_refresh_token = generate_refresh_token()
    session.refresh_token_hash = hash_token(new_refresh_token)
    session.expires_at = now + timedelta(days=settings.refresh_token_expire_days)
    db.commit()

    access_token = create_access_token(session.user_id, session.id)
    return schemas.RefreshTokenOut(access_token=access_token, refresh_token=new_refresh_token)


@router.post("/logout", status_code=204)
def logout(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    """Revokes the session behind the presented access token — after this,
    both that access token (via resolve_user_from_token's revocation check)
    and its refresh token stop working immediately, not just once the
    access token's own 15-minute expiry catches up."""
    if credentials is None:
        return
    decoded = decode_access_token(credentials.credentials)
    if not decoded:
        return
    _, session_id = decoded
    session = db.get(models.AuthSession, session_id)
    if session and session.revoked_at is None:
        session.revoked_at = datetime.now(timezone.utc)
        db.commit()
