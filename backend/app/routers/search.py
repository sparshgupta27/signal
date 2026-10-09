from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..core.database import get_db
from ..core.deps import get_current_user
from ..services import search_service

router = APIRouter(prefix="/api/v1/search", tags=["search"])


@router.get("", response_model=schemas.SearchResultsOut)
def search(
    q: str = "",
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return search_service.search(db, user.id, q)
