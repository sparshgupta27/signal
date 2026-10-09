from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models


def is_blocked(db: Session, owner_id: str, blocked_id: str) -> bool:
    return db.get(models.BlockedUser, (owner_id, blocked_id)) is not None


def block_user(db: Session, owner_id: str, blocked_id: str) -> bool:
    """Idempotent — returns False if already blocked."""
    if owner_id == blocked_id or is_blocked(db, owner_id, blocked_id):
        return False
    db.add(models.BlockedUser(owner_id=owner_id, blocked_id=blocked_id))
    db.commit()
    return True


def unblock_user(db: Session, owner_id: str, blocked_id: str) -> bool:
    row = db.get(models.BlockedUser, (owner_id, blocked_id))
    if not row:
        return False
    db.delete(row)
    db.commit()
    return True


def list_blocked_ids(db: Session, owner_id: str) -> list[str]:
    return list(
        db.execute(
            select(models.BlockedUser.blocked_id).where(models.BlockedUser.owner_id == owner_id)
        ).scalars()
    )


def any_block_between(db: Session, user_a: str, user_b: str) -> bool:
    """A block in either direction stops messages flowing between the two —
    simpler and safer than a one-directional rule, and avoids the UX puzzle
    of silently failing sends for the blocker but not the blockee."""
    return is_blocked(db, user_a, user_b) or is_blocked(db, user_b, user_a)
