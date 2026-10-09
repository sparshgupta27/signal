from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import mappers, models, schemas
from ..core.database import get_db
from ..core.deps import get_current_user

router = APIRouter(prefix="/api/v1/contacts", tags=["contacts"])


@router.get("", response_model=list[schemas.DirectoryUserOut])
def list_contacts(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.execute(select(models.Contact).where(models.Contact.owner_id == user.id)).scalars().all()
    out = []
    for c in rows:
        target = db.get(models.User, c.contact_id)
        if target:
            out.append(mappers.directory_user_out(target, True, user.id))
    out.sort(key=lambda u: u.name)
    return out


@router.post("", response_model=schemas.DirectoryUserOut)
def add_contact(
    body: schemas.AddContactIn,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target = db.get(models.User, body.user_id)
    if not target:
        raise HTTPException(404, "User not found")
    existing = db.get(models.Contact, (user.id, body.user_id))
    if not existing:
        db.add(models.Contact(owner_id=user.id, contact_id=body.user_id))
        db.commit()
    return mappers.directory_user_out(target, True, user.id)


@router.delete("/{contact_id}", status_code=204)
def remove_contact(
    contact_id: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.get(models.Contact, (user.id, contact_id))
    if existing:
        db.delete(existing)
        db.commit()
