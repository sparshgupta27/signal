import os
import shutil

from fastapi import UploadFile
from sqlalchemy.orm import Session

from .. import models
from ..core.config import settings
from ..core.security import new_id
from .conversation_service import get_participant


def save_upload(
    db: Session,
    uploader_id: str,
    file: UploadFile,
    data: bytes,
    width: int | None,
    height: int | None,
) -> models.Attachment:
    os.makedirs(settings.upload_dir, exist_ok=True)
    # Never trust the client's filename as a path — store under a generated
    # name, keep the original only as display metadata.
    _, ext = os.path.splitext(file.filename or "")
    storage_name = f"{new_id()}{ext[:10]}"
    with open(os.path.join(settings.upload_dir, storage_name), "wb") as f:
        f.write(data)

    attachment = models.Attachment(
        id=new_id("att-"),
        message_id=None,
        uploader_id=uploader_id,
        file_name=file.filename or "file",
        mime_type=file.content_type or "application/octet-stream",
        size_bytes=len(data),
        storage_path=storage_name,
        width=width,
        height=height,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment


def duplicate_attachment(db: Session, source: models.Attachment, uploader_id: str) -> models.Attachment:
    """A forwarded message gets its own copy of the file, not a second
    reference to the original — matches real messaging apps (the original
    being deleted/expired shouldn't take a forward down with it), and keeps
    Attachment.message_id a clean one-to-one rather than needing a join
    table for something that's rare in practice."""
    _, ext = os.path.splitext(source.storage_path)
    storage_name = f"{new_id()}{ext}"
    shutil.copyfile(
        os.path.join(settings.upload_dir, source.storage_path),
        os.path.join(settings.upload_dir, storage_name),
    )

    attachment = models.Attachment(
        id=new_id("att-"),
        message_id=None,
        uploader_id=uploader_id,
        file_name=source.file_name,
        mime_type=source.mime_type,
        size_bytes=source.size_bytes,
        storage_path=storage_name,
        width=source.width,
        height=source.height,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment


def can_access(db: Session, attachment: models.Attachment, user_id: str) -> bool:
    """Not yet attached to a message: only its uploader can see it (mid
    compose). Attached: anyone currently in that message's conversation."""
    if attachment.message_id is None:
        return attachment.uploader_id == user_id
    message = db.get(models.Message, attachment.message_id)
    if not message:
        return False
    return get_participant(db, message.conversation_id, user_id) is not None
