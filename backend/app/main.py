import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from . import models  # noqa: F401 -- registers tables before create_all
from .core.config import settings
from .core.database import Base, SessionLocal, engine, ensure_columns
from .core.limiter import limiter
from .routers import (
    auth,
    contacts,
    conversations,
    forward,
    groups,
    message_actions,
    messages,
    reactions,
    search,
    uploads,
    users,
)
from .seeding import run_seed, seed_missing_demo_dms
from .services import conversation_service, message_service
from .ws.broadcast import broadcast_message_deleted
from .ws.router import router as ws_router


async def _disappearing_sweep_loop() -> None:
    """Runs for the lifetime of the process — a single worker is required
    for this to be correct (see README), same constraint the in-memory
    WebSocket connection manager and OTP store already have."""
    while True:
        await asyncio.sleep(settings.disappearing_sweep_interval_seconds)
        db = SessionLocal()
        try:
            expired = message_service.sweep_expired_messages(db)
            for message in expired:
                member_ids = conversation_service.active_member_ids(db, message.conversation_id)
                await broadcast_message_deleted(
                    member_ids, message.id, message.conversation_id, message.deleted_at
                )
        finally:
            db.close()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_columns()

    db = SessionLocal()
    try:
        run_seed(db)
        # Runs unconditionally (unlike run_seed, which bails the moment any
        # user exists) so a deployment that was seeded before these DMs
        # existed — i.e. the live one, which also has real accounts on it
        # now — backfills them on the next restart instead of needing a
        # destructive reseed. Checks each DM's existence first, so it's a
        # no-op on a database that already has them.
        seed_missing_demo_dms(db)
    finally:
        db.close()

    sweep_task = asyncio.create_task(_disappearing_sweep_loop())
    try:
        yield
    finally:
        sweep_task.cancel()


app = FastAPI(title="Signal Clone API", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(contacts.router)
app.include_router(conversations.router)
app.include_router(messages.router)
app.include_router(groups.router)
app.include_router(reactions.router)
app.include_router(forward.router)
app.include_router(message_actions.router)
app.include_router(uploads.router)
app.include_router(search.router)
app.include_router(ws_router)


@app.get("/api/v1/health")
def health():
    return {"status": "ok"}
