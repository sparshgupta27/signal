"""Idempotent seed, callable both as a CLI script (backend/seed.py) and from
app.main's lifespan on an empty database — so a fresh/wiped persistent disk
self-heals into a populated demo instead of opening empty.

Timestamps are computed relative to `now()` at seed time, not fixed dates —
a fixed "Oct 3" would read as "Today" once and stale forever after.
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from . import models
from .core.security import generate_mock_public_key, new_id

SEED_USERS = [
    {"id": "demo", "phone": "+91 90000 00001", "username": "demo.01", "name": "Demo User", "about": "Available"},
    {"id": "aarav", "phone": "+91 90000 00002", "username": "aarav.02", "name": "Aarav Mehta", "about": "At the gym 🏋️"},
    {"id": "priya", "phone": "+91 90000 00003", "username": "priya.03", "name": "Priya Sharma", "about": "Busy"},
    {"id": "rohan", "phone": "+91 90000 00004", "username": "rohan.04", "name": "Rohan Gupta", "about": ""},
    {"id": "ananya", "phone": "+91 90000 00005", "username": "ananya.05", "name": "Ananya Iyer", "about": ""},
    {"id": "kabir", "phone": "+91 90000 00006", "username": "kabir.06", "name": "Kabir Singh", "about": ""},
    {"id": "meera", "phone": "+91 90000 00007", "username": "meera.07", "name": "Meera Nair", "about": ""},
    {"id": "dev", "phone": "+91 90000 00008", "username": "dev.08", "name": "Dev Patel", "about": ""},
]

CONTACTS_OF_DEMO = ["aarav", "priya", "rohan", "ananya", "kabir", "dev"]


def _id(prefix: str) -> str:
    # A real UUID, not a process-local sequential counter: the old counter
    # reset to 1 on every restart, which was only safe as long as run_seed
    # ran at most once ever. The moment a *second* seeding pass runs in a
    # later process (seed_missing_demo_dms, backfilling live data run_seed
    # itself skipped because the database already had users) its counter
    # also restarted from 1 and collided head-on with ids a prior run had
    # already committed — e.g. "seed-dm1" existing twice. A UUID can't
    # collide with anything, this run or a previous one.
    return new_id(f"seed-{prefix}")


class _Clock:
    """Lets each conversation's messages be written as relative offsets
    ("3 days ago", "then +4 minutes") while staying anchored to the real
    seed-time `now()`."""

    def __init__(self, now: datetime):
        self.now = now

    def ago(self, **kwargs) -> datetime:
        return self.now - timedelta(**kwargs)


def _add_message(
    db: Session,
    conversation: models.Conversation,
    sender_id: str | None,
    body: str,
    at: datetime,
    *,
    msg_type: str = "text",
    system_event: dict | None = None,
) -> models.Message:
    message = models.Message(
        id=_id("m"),
        client_id=_id("c"),
        conversation_id=conversation.id,
        sender_id=sender_id,
        type=msg_type,
        body=body,
        system_event=system_event,
        created_at=at,
    )
    db.add(message)
    # Guard against clobbering with an older timestamp — a system message
    # inserted after the fact (but chronologically earlier) shouldn't undo
    # the conversation's actual last-activity time.
    if conversation.last_message_at is None or at > conversation.last_message_at:
        conversation.last_message_at = at
    return message


def _add_receipts(
    db: Session, message: models.Message, member_ids: list[str], *, read: bool
) -> None:
    for uid in member_ids:
        if uid == message.sender_id:
            continue
        db.add(
            models.MessageReceipt(
                message_id=message.id,
                user_id=uid,
                delivered_at=message.created_at + timedelta(seconds=2),
                read_at=message.created_at + timedelta(seconds=20) if read else None,
            )
        )


def _add_participant(
    db: Session,
    conversation_id: str,
    user_id: str,
    *,
    role: str = "member",
    last_read_at: datetime | None,
    joined_at: datetime | None = None,
    is_pinned: bool = False,
    is_muted: bool = False,
) -> models.ConversationParticipant:
    participant = models.ConversationParticipant(
        conversation_id=conversation_id,
        user_id=user_id,
        role=role,
        last_read_at=last_read_at,
        is_pinned=is_pinned,
        is_muted=is_muted,
    )
    if joined_at is not None:
        participant.joined_at = joined_at
    db.add(participant)
    return participant


def _seed_direct(
    db: Session,
    clock: _Clock,
    a: str,
    b: str,
    messages: list[tuple[str, str, datetime, bool]],
    *,
    pinned_for: set[str] | None = None,
    muted_for: set[str] | None = None,
    unread_cutoff_for: dict[str, datetime] | None = None,
    disappearing_seconds: int | None = None,
) -> models.Conversation:
    """messages: list of (sender_id, body, created_at, read) tuples, oldest first."""
    pinned_for = pinned_for or set()
    muted_for = muted_for or set()
    unread_cutoff_for = unread_cutoff_for or {}

    conversation = models.Conversation(
        id=_id("dm"),
        type="direct",
        dm_key=":".join(sorted([a, b])),
        created_by=a,
        disappearing_seconds=disappearing_seconds,
        created_at=clock.ago(days=7),
    )
    db.add(conversation)

    last_message = None
    for sender_id, body, at, read in messages:
        last_message = _add_message(db, conversation, sender_id, body, at)
        # Computed at creation time from the timer as it stood then — same
        # rule the real create_message() follows, so seeded data exercises
        # the identical expiry logic as a live-sent message would.
        if disappearing_seconds and sender_id:
            last_message.expires_at = at + timedelta(seconds=disappearing_seconds)
        _add_receipts(db, last_message, [a, b], read=read)

    final_at = last_message.created_at if last_message else clock.now
    for uid in (a, b):
        _add_participant(
            db,
            conversation.id,
            uid,
            last_read_at=unread_cutoff_for.get(uid, final_at),
            joined_at=conversation.created_at,
            is_pinned=uid in pinned_for,
            is_muted=uid in muted_for,
        )

    return conversation


def _dm_exists(db: Session, a: str, b: str) -> bool:
    key = ":".join(sorted([a, b]))
    return db.query(models.Conversation).filter_by(dm_key=key).first() is not None


def seed_missing_demo_dms(db: Session, clock: _Clock | None = None) -> None:
    """Backfill-safe: creates only the demo<->X DMs that don't already exist,
    so it can run against a live database with real users on it (where
    run_seed's "skip if any user exists" guard would otherwise skip this
    entirely) without touching or duplicating anything else."""
    # SessionLocal is autoflush=False, so when this is called from inside
    # run_seed (same uncommitted transaction), the existence checks below
    # would otherwise be blind to what that function already db.add()'d
    # moments ago — e.g. CONTACTS_OF_DEMO's "dev" contact — and duplicate
    # it, hitting the composite-PK unique constraint at commit time.
    db.flush()
    if not db.get(models.User, "demo"):
        return
    clock = clock or _Clock(datetime.now(timezone.utc))

    if db.get(models.User, "ananya") and not _dm_exists(db, "demo", "ananya"):
        _seed_direct(
            db,
            clock,
            "demo",
            "ananya",
            [
                ("ananya", "are we still on for sunday dinner?", clock.ago(hours=5), True),
                ("demo", "yep! what time works", clock.ago(hours=4, minutes=50), True),
                ("ananya", "7pm? i'll tell the others", clock.ago(hours=4, minutes=45), True),
                ("demo", "sounds good 👍", clock.ago(hours=4, minutes=40), True),
            ],
        )

    # --- demo <-> meera: not yet a saved contact, ordinary --------------------
    # Deliberately not in CONTACTS_OF_DEMO — exercises messaging someone who
    # isn't a saved contact yet, same as the real "Add contact" flow.
    if db.get(models.User, "meera") and not _dm_exists(db, "demo", "meera"):
        _seed_direct(
            db,
            clock,
            "demo",
            "meera",
            [
                ("meera", "hey, got your number from ananya!", clock.ago(days=1, hours=2), True),
                ("demo", "hey meera, welcome 👋", clock.ago(days=1, hours=2) + timedelta(minutes=3), True),
                ("meera", "are you coming sunday too?", clock.ago(days=1, hours=1, minutes=55), True),
            ],
        )

    if db.get(models.User, "dev") and not _dm_exists(db, "demo", "dev"):
        _seed_direct(
            db,
            clock,
            "demo",
            "dev",
            [
                ("dev", "placement prep session this week?", clock.ago(hours=8), True),
                ("demo", "yeah, thursday works for me", clock.ago(hours=7, minutes=50), True),
                ("dev", "perfect, i'll set it up", clock.ago(hours=7, minutes=45), True),
            ],
        )

    if db.get(models.User, "demo") and db.get(models.User, "dev"):
        if not db.get(models.Contact, ("demo", "dev")):
            db.add(models.Contact(owner_id="demo", contact_id="dev"))

    db.commit()


_SEED_USER_IDS = {u["id"] for u in SEED_USERS}


def seed_demo_data_for_user(db: Session, user_id: str) -> bool:
    """On-demand version of what demo.01 gets for free at seed time, for any
    *real* registered account — populates a couple of DMs and a group with
    the seed users so a reviewer testing with their own number isn't stuck
    looking at an empty chat list. Returns False (no-op) if the account is
    itself one of the seed users, or already has this demo data."""
    if user_id in _SEED_USER_IDS:
        return False
    if not db.get(models.User, user_id):
        return False
    if _dm_exists(db, user_id, "aarav"):
        return False

    db.flush()
    clock = _Clock(datetime.now(timezone.utc))

    _seed_direct(
        db,
        clock,
        user_id,
        "aarav",
        [
            ("aarav", "hey! saw you joined, welcome 👋", clock.ago(hours=3), True),
            (user_id, "thanks! excited to try this out", clock.ago(hours=2, minutes=55), True),
            ("aarav", "let me know if you have questions", clock.ago(hours=2, minutes=50), True),
        ],
    )

    _seed_direct(
        db,
        clock,
        user_id,
        "priya",
        [
            ("priya", "are you coming to the trip planning call?", clock.ago(hours=1), True),
            (user_id, "yep, see you there", clock.ago(minutes=55), True),
            ("priya", "great, sending the invite now", clock.ago(minutes=50), False),
        ],
    )

    group = models.Conversation(
        id=_id("group"), type="group", name="Weekend Trip", created_by=user_id,
        created_at=clock.ago(days=1),
    )
    db.add(group)
    db.flush()

    _add_message(
        db, group, None, "", clock.ago(days=1),
        msg_type="system", system_event={"action": "created", "actorId": user_id},
    )
    _add_message(db, group, user_id, "planning a weekend trip, who's in?", clock.ago(days=1) + timedelta(minutes=1))
    m = _add_message(db, group, "aarav", "count me in!", clock.ago(hours=20))
    _add_receipts(db, m, [user_id, "aarav", "priya", "rohan"], read=True)
    m = _add_message(db, group, "rohan", "me too, where are we thinking?", clock.ago(hours=19))
    _add_receipts(db, m, [user_id, "aarav", "priya", "rohan"], read=True)
    m = _add_message(db, group, "priya", "booked a campsite for next saturday 🏕️", clock.ago(minutes=30))
    _add_receipts(db, m, [user_id, "aarav", "priya", "rohan"], read=False)

    for uid, role in ((user_id, "admin"), ("aarav", "member"), ("priya", "member"), ("rohan", "member")):
        _add_participant(
            db, group.id, uid, role=role,
            last_read_at=clock.ago(minutes=40) if uid == user_id else clock.now,
            joined_at=group.created_at,
        )

    for cid in ("aarav", "priya", "rohan"):
        if not db.get(models.Contact, (user_id, cid)):
            db.add(models.Contact(owner_id=user_id, contact_id=cid))

    db.commit()
    return True


def remove_demo_data_for_user(db: Session, user_id: str) -> bool:
    """Undoes exactly what seed_demo_data_for_user added — the two DMs,
    the "Weekend Trip" group it created, and the three contacts. Deleting
    each Conversation row cascades to its messages/receipts/participants
    at the database level (ON DELETE CASCADE + PRAGMA foreign_keys=ON),
    so there's nothing else to clean up manually. Returns False if there
    was nothing to remove."""
    if user_id in _SEED_USER_IDS:
        return False

    removed_any = False

    for other_id in ("aarav", "priya"):
        key = ":".join(sorted([user_id, other_id]))
        convo = db.query(models.Conversation).filter_by(dm_key=key).first()
        if convo:
            db.delete(convo)
            removed_any = True

    group = (
        db.query(models.Conversation)
        .filter_by(type="group", created_by=user_id, name="Weekend Trip")
        .first()
    )
    if group:
        db.delete(group)
        removed_any = True

    for cid in ("aarav", "priya", "rohan"):
        contact = db.get(models.Contact, (user_id, cid))
        if contact:
            db.delete(contact)
            removed_any = True

    db.commit()
    return removed_any


def backfill_public_keys(db: Session) -> None:
    """ensure_columns() adds users.public_key as NULL on an existing
    deployment's DB — this fills it in for any account (seeded or real)
    that predates the column, so every user has one, not just new signups."""
    missing = db.query(models.User).filter(models.User.public_key.is_(None)).all()
    for user in missing:
        user.public_key = generate_mock_public_key()
    if missing:
        db.commit()


def run_seed(db: Session) -> None:
    if db.query(models.User).count() > 0:
        return

    now = datetime.now(timezone.utc)
    clock = _Clock(now)

    for u in SEED_USERS:
        db.add(
            models.User(
                id=u["id"],
                phone=u["phone"],
                username=u["username"],
                display_name=u["name"],
                about=u["about"],
                public_key=generate_mock_public_key(),
            )
        )
    db.flush()

    for cid in CONTACTS_OF_DEMO:
        db.add(models.Contact(owner_id="demo", contact_id=cid))

    # --- demo <-> aarav: ordinary, fully read -------------------------------
    _seed_direct(
        db,
        clock,
        "demo",
        "aarav",
        [
            ("aarav", "yo, free this weekend?", clock.ago(days=2, hours=1), True),
            ("demo", "yeah what's up", clock.ago(days=2, hours=1) + timedelta(minutes=2), True),
            ("aarav", "thinking of a trek, you in?", clock.ago(days=2, hours=1) + timedelta(minutes=3), True),
            ("demo", "depends where 👀", clock.ago(hours=3), True),
            ("aarav", "will share the plan in the group", clock.ago(hours=3) + timedelta(minutes=1), True),
        ],
    )

    # --- demo <-> priya: pinned, 2 unread for demo --------------------------
    priya_cutoff = clock.ago(minutes=12)
    _seed_direct(
        db,
        clock,
        "demo",
        "priya",
        [
            ("priya", "did you see the update", clock.ago(days=1), True),
            ("demo", "yep, looks good", clock.ago(days=1) + timedelta(minutes=5), True),
            ("priya", "can we push the call to tomorrow?", clock.ago(minutes=9), False),
            ("priya", "lmk when you're free", clock.ago(minutes=5), False),
        ],
        pinned_for={"demo"},
        unread_cutoff_for={"demo": priya_cutoff},
    )

    # --- demo <-> rohan: muted -----------------------------------------------
    _seed_direct(
        db,
        clock,
        "demo",
        "rohan",
        [
            ("rohan", "sent you the files", clock.ago(hours=6), True),
            ("demo", "got them, thanks!", clock.ago(hours=5, minutes=40), True),
        ],
        muted_for={"demo"},
    )

    # --- demo <-> kabir: disappearing messages already on --------------------
    kabir_convo = _seed_direct(
        db,
        clock,
        "demo",
        "kabir",
        [
            ("kabir", "turned on disappearing messages, 1 day", clock.ago(minutes=40), True),
            ("demo", "sounds good", clock.ago(minutes=38), True),
            ("kabir", "see you tomorrow", clock.ago(minutes=10), True),
        ],
        disappearing_seconds=86400,
    )
    _add_message(
        db,
        kabir_convo,
        None,
        "",
        clock.ago(minutes=41),
        msg_type="system",
        system_event={"action": "disappearing_changed", "actorId": "kabir", "value": "86400"},
    )

    seed_missing_demo_dms(db, clock)

    # --- group: Weekend Trip (demo admin, rohan removed) ----------------------
    trip = models.Conversation(
        id=_id("group"), type="group", name="Weekend Trip", created_by="demo", created_at=clock.ago(days=3)
    )
    db.add(trip)
    db.flush()

    _add_message(db, trip, None, "", clock.ago(days=3), msg_type="system", system_event={"action": "created", "actorId": "demo"})
    _add_message(db, trip, "demo", "planning a weekend trek, who's in?", clock.ago(days=3) + timedelta(minutes=1))
    m = _add_message(db, trip, "aarav", "me!", clock.ago(days=2, hours=20))
    _add_receipts(db, m, ["demo", "aarav", "priya", "rohan"], read=True)
    m = _add_message(db, trip, "rohan", "can't make it this time, sorry", clock.ago(days=2))
    _add_receipts(db, m, ["demo", "aarav", "priya", "rohan"], read=True)
    removed_at = clock.ago(days=1, hours=12)
    _add_message(
        db, trip, None, "", removed_at,
        msg_type="system", system_event={"action": "member_removed", "actorId": "demo", "targetId": "rohan"},
    )
    m = _add_message(db, trip, "priya", "booked the campsite 🏕️", clock.ago(minutes=20))
    _add_receipts(db, m, ["demo", "aarav", "priya"], read=False)
    m = _add_message(db, trip, "aarav", "excited!!", clock.ago(minutes=15))
    _add_receipts(db, m, ["demo", "aarav", "priya"], read=False)

    _add_participant(db, trip.id, "demo", role="admin", last_read_at=clock.ago(minutes=25), joined_at=trip.created_at)
    _add_participant(db, trip.id, "aarav", last_read_at=clock.now, joined_at=trip.created_at)
    _add_participant(db, trip.id, "priya", last_read_at=clock.now, joined_at=trip.created_at)
    rohan_p = _add_participant(db, trip.id, "rohan", last_read_at=removed_at, joined_at=trip.created_at)
    rohan_p.left_at = removed_at

    # --- group: Family (demo admin) -------------------------------------------
    family = models.Conversation(
        id=_id("group"), type="group", name="Family", created_by="demo", created_at=clock.ago(days=10)
    )
    db.add(family)
    db.flush()

    _add_message(db, family, None, "", clock.ago(days=10), msg_type="system", system_event={"action": "created", "actorId": "demo"})
    m = _add_message(db, family, "ananya", "dinner on sunday?", clock.ago(hours=4))
    _add_receipts(db, m, ["demo", "ananya", "meera", "dev"], read=True)
    m = _add_message(db, family, "dev", "count me in", clock.ago(hours=3, minutes=50))
    _add_receipts(db, m, ["demo", "ananya", "meera", "dev"], read=True)
    m = _add_message(db, family, "meera", "same, can't wait 😄", clock.ago(hours=3, minutes=40))
    _add_receipts(db, m, ["demo", "ananya", "meera", "dev"], read=True)

    for uid, role in (("demo", "admin"), ("ananya", "member"), ("meera", "member"), ("dev", "member")):
        _add_participant(db, family.id, uid, role=role, last_read_at=clock.now, joined_at=family.created_at)

    db.commit()
