import secrets

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from .. import mappers, models, schemas
from ..core.database import get_db
from ..core.limiter import limiter
from ..core.security import create_access_token, generate_mock_public_key, new_id
from ..directory import find_user_by_identifier

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

# Keyed by normalized identifier, holding whatever code was most recently
# "sent" for it. There's no real SMS gateway behind this mock, so the code
# is returned to the caller to display directly, mirroring the frontend's
# mock auth layer. In-memory only — fine for a single-process deploy, but
# won't survive a restart or scale across multiple instances.
_pending_otps: dict[str, str] = {}


def _normalize(identifier: str) -> str:
    return identifier.strip().lower().replace(" ", "")


def _generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


@router.post("/request-otp", response_model=schemas.RequestOtpOut)
@limiter.limit("5/minute")
def request_otp(request: Request, body: schemas.RequestOtpIn, db: Session = Depends(get_db)):
    user = find_user_by_identifier(db, body.identifier)
    code = _generate_otp()
    _pending_otps[_normalize(body.identifier)] = code
    return schemas.RequestOtpOut(is_new_user=user is None, otp_hint=code)


@router.post("/verify-otp", response_model=schemas.VerifyOtpOut)
@limiter.limit("10/minute")
def verify_otp(request: Request, body: schemas.VerifyOtpIn, db: Session = Depends(get_db)):
    key = _normalize(body.identifier)
    expected = _pending_otps.get(key)
    if not expected or body.code != expected:
        return schemas.VerifyOtpOut(success=False)
    # Burn it on success, same as a real one-time code.
    del _pending_otps[key]

    user = find_user_by_identifier(db, body.identifier)
    is_new_user = user is None

    if user is None:
        identifier = body.identifier.strip()
        is_phone = identifier.replace("+", "").replace(" ", "").isdigit()
        user = models.User(
            id=new_id("u-"),
            phone=identifier if is_phone else None,
            username=None if is_phone else identifier.lstrip("@"),
            display_name="New user" if is_phone else identifier,
            public_key=generate_mock_public_key(),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(user.id)
    return schemas.VerifyOtpOut(
        success=True,
        access_token=token,
        user=mappers.user_out(user, user.id),
        needs_profile=is_new_user,
    )
