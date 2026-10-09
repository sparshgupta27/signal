import os

from fastapi import APIRouter, Depends, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .. import mappers, models, schemas
from ..core.config import settings
from ..core.database import get_db
from ..core.deps import get_current_user
from ..core.limiter import limiter
from ..core.security import decode_access_token
from ..services import upload_service

router = APIRouter(prefix="/api/v1/uploads", tags=["uploads"])


@router.post("", response_model=schemas.UploadOut)
@limiter.limit("20/minute")
async def create_upload(
    request: Request,
    file: UploadFile,
    width: int | None = Form(None),
    height: int | None = Form(None),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = await file.read()
    if not data:
        raise HTTPException(400, "Empty file")
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(413, "File is too large")
    attachment = upload_service.save_upload(db, user.id, file, data, width, height)
    return mappers.upload_out(attachment)


def _user_from_query_token(token: str = Query(...), db: Session = Depends(get_db)) -> models.User:
    # GET requests here are issued by <img src> / <a href download>, which
    # can't carry an Authorization header — same accepted tradeoff already
    # used by the WebSocket endpoint (token in the query string).
    user_id = decode_access_token(token)
    if not user_id:
        raise HTTPException(401, "Invalid or expired token")
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(401, "User not found")
    return user


@router.get("/{attachment_id}")
def get_upload(
    attachment_id: str,
    user: models.User = Depends(_user_from_query_token),
    db: Session = Depends(get_db),
):
    attachment = db.get(models.Attachment, attachment_id)
    if not attachment or not upload_service.can_access(db, attachment, user.id):
        raise HTTPException(404, "Not found")
    path = os.path.join(settings.upload_dir, attachment.storage_path)
    if not os.path.exists(path):
        raise HTTPException(404, "Not found")
    return FileResponse(path, media_type=attachment.mime_type, filename=attachment.file_name)
