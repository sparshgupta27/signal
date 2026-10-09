from datetime import datetime, timezone

from sqlalchemy import DateTime, create_engine, event, inspect, text
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


# No migration framework (Alembic) is warranted for a from-scratch schema —
# but `create_all()` only creates *missing tables*, never adds a column to a
# table that already exists. That's a real gap once a deployment's SQLite
# file has persisted real data across deploys (unlike a fresh local DB,
# which never hits this path since create_all() makes the column correctly
# the first time). This is intentionally a column-adder only, not a general
# migration system: list each new column here once, call it once in
# lifespan, done.
_PENDING_COLUMNS: list[tuple[str, str, str]] = [
    ("users", "show_last_seen", "BOOLEAN DEFAULT 1"),
]


def ensure_columns() -> None:
    inspector = inspect(engine)
    with engine.begin() as conn:
        for table, column, ddl_type in _PENDING_COLUMNS:
            if not inspector.has_table(table):
                continue
            existing = {col["name"] for col in inspector.get_columns(table)}
            if column not in existing:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}"))
