import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import mappers, models, schemas
from ..core.database import get_db
from ..core.deps import get_current_user
from ..directory import find_user_by_identifier
from ..seeding import remove_demo_data_for_user, seed_demo_data_for_user
from ..services import block_service

router = APIRouter(prefix="/api/v1/users", tags=["users"])

# Starts with a letter, 3-30 chars total, lowercase letters/digits/dot/
# underscore after that — matches the seed data's own style (demo.01).
_USERNAME_RE = re.compile(r"^[a-z][a-z0-9_.]{2,29}$")


@router.get("/me", response_model=schemas.UserOut)
def get_me(user: models.User = Depends(get_current_user)):
    return mappers.user_out(user, user.id)


@router.patch("/me", response_model=schemas.UserOut)
def update_me(
    body: schemas.UpdateMeIn,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.name is not None and body.name.strip():
        user.display_name = body.name.strip()
    if body.about is not None:
        user.about = body.about
    if body.avatar_url is not None:
        user.avatar_url = body.avatar_url or None
    if body.show_last_seen is not None:
        user.show_last_seen = body.show_last_seen
    if body.username is not None:
        normalized = body.username.strip().lstrip("@").lower()
        if not _USERNAME_RE.match(normalized):
            raise HTTPException(
                400,
                "Username must be 3-30 characters, start with a letter, and use only "
                "lowercase letters, numbers, dots, or underscores.",
            )
        taken = db.execute(
            select(models.User).where(models.User.username == normalized, models.User.id != user.id)
        ).scalar_one_or_none()
        if taken:
            raise HTTPException(409, "That username is already taken.")
        user.username = normalized
    db.commit()
    db.refresh(user)
    return mappers.user_out(user, user.id)


@router.post("/me/demo-data", response_model=schemas.DemoDataOut)
def load_demo_data(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    created = seed_demo_data_for_user(db, user.id)
    return schemas.DemoDataOut(created=created)


@router.delete("/me/demo-data", response_model=schemas.RemoveDemoDataOut)
def remove_demo_data(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    removed = remove_demo_data_for_user(db, user.id)
    return schemas.RemoveDemoDataOut(removed=removed)


@router.get("/me/blocked", response_model=schemas.BlockedUsersOut)
def list_blocked(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return schemas.BlockedUsersOut(user_ids=block_service.list_blocked_ids(db, user.id))


@router.post("/{user_id}/block", status_code=204)
def block_user(
    user_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    if user_id == user.id:
        raise HTTPException(400, "Cannot block yourself")
    block_service.block_user(db, user.id, user_id)


@router.delete("/{user_id}/block", status_code=204)
def unblock_user(
    user_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    block_service.unblock_user(db, user.id, user_id)


@router.get("", response_model=list[schemas.UserOut])
def list_users(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.execute(select(models.User).where(models.User.id != user.id)).scalars().all()
    return [mappers.user_out(u, user.id) for u in rows]


@router.get("/lookup", response_model=schemas.DirectoryUserOut | None)
def lookup_user(
    identifier: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    found = find_user_by_identifier(db, identifier)
    if not found or found.id == user.id:
        return None
    is_contact = db.get(models.Contact, (user.id, found.id)) is not None
    return mappers.directory_user_out(found, is_contact, user.id)


# Must stay registered after the literal /me and /lookup paths above — a
# dynamic /{user_id} registered first would shadow them (FastAPI matches
# routes in registration order, not by specificity).
@router.get("/{user_id}", response_model=schemas.UserOut)
def get_user(
    user_id: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target = db.get(models.User, user_id)
    if not target:
        raise HTTPException(404, "Not found")
    return mappers.user_out(target, user.id)
