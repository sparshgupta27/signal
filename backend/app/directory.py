"""User lookup shared by auth (OTP identifier matching) and the users router
(exact-match "Add contact" lookup) — one matching rule, not two."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models


def normalize(value: str) -> str:
    return value.strip().lower().replace(" ", "")


def find_user_by_identifier(db: Session, identifier: str) -> models.User | None:
    normalized = normalize(identifier)
    if not normalized:
        return None
    users = db.execute(select(models.User)).scalars().all()
    for u in users:
        if u.username and normalize(u.username) == normalized:
            return u
        if u.phone:
            phone_digits = normalize(u.phone)
            if phone_digits == normalized or phone_digits.endswith(normalized):
                return u
    return None
