"""Loose user lookup behind "Add contact" (GET /users/lookup).

Where it sits: called only by routers/users.py::lookup_user. Login does NOT
use this — routers/auth.py::_find_user_by_phone does its own exact-match
lookup, because sign-in must never resolve to the wrong account.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models


def normalize(value: str) -> str:
    return value.strip().lower().replace(" ", "")


def find_user_by_identifier(db: Session, identifier: str) -> models.User | None:
    """Matches a username exactly, or a phone number exactly or by its
    trailing digits (so "90000 00002" finds "+91 90000 00002"). Loads every
    user and compares in Python — fine at demo scale."""
    normalized = normalize(identifier)
    if not normalized:
        return None
    users = db.execute(select(models.User)).scalars().all()
    for user in users:
        if user.username and normalize(user.username) == normalized:
            return user
        if user.phone:
            normalized_phone = normalize(user.phone)
            if normalized_phone == normalized or normalized_phone.endswith(normalized):
                return user
    return None
