from datetime import datetime, timezone

from sqlalchemy import DateTime, create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.types import TypeDecorator

from .config import settings

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
)


@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_connection, _connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.close()


class UTCDateTime(TypeDecorator):
    """SQLite has no timezone-aware datetime type — it silently drops tzinfo
    on every round-trip. Without this, datetimes read back from the DB are
    naive, and FastAPI/Pydantic then serializes them with no "Z"/offset
    suffix, which browsers parse as *local* time instead of UTC (shifting
    every timestamp by the viewer's UTC offset). This makes every
    Mapped[datetime] column act as genuinely tz-aware UTC on both ends."""

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).replace(tzinfo=None)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return value.replace(tzinfo=timezone.utc)


class Base(DeclarativeBase):
    type_annotation_map = {datetime: UTCDateTime}


SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
