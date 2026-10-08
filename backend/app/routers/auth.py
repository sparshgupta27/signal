from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import mappers, models, schemas
from ..core.database import get_db
from ..core.security import create_access_token, new_id
from ..directory import find_user_by_identifier

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

OTP_CODE = "123456"


@router.post("/request-otp", response_model=schemas.RequestOtpOut)
def request_otp(body: schemas.RequestOtpIn, db: Session = Depends(get_db)):
    user = find_user_by_identifier(db, body.identifier)
    return schemas.RequestOtpOut(is_new_user=user is None)


@router.post("/verify-otp", response_model=schemas.VerifyOtpOut)
def verify_otp(body: schemas.VerifyOtpIn, db: Session = Depends(get_db)):
    if body.code != OTP_CODE:
        return schemas.VerifyOtpOut(success=False)

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
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(user.id)
    return schemas.VerifyOtpOut(
        success=True,
        access_token=token,
        user=mappers.user_out(user),
        needs_profile=is_new_user,
    )
