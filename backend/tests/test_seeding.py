from app import models
from app.seeding import SEED_USERS, seed_missing_demo_dms


def _dm_partners_of(db, user_id: str) -> set[str]:
    rows = (
        db.query(models.Conversation)
        .filter(models.Conversation.type == "direct", models.Conversation.dm_key.like(f"%{user_id}%"))
        .all()
    )
    partners = set()
    for c in rows:
        a, b = c.dm_key.split(":")
        partners.add(b if a == user_id else a)
    return partners


def _ensure_seed_users_exist(db) -> None:
    # Doesn't go through run_seed() itself — its "skip if any user already
    # exists" guard makes it unreliable to depend on on this shared test
    # database (other test files create their own throwaway users on the
    # same `db` fixture target, via the `db`-only fixture that never
    # touches the `client` fixture's lifespan at all).
    for u in SEED_USERS:
        if not db.get(models.User, u["id"]):
            db.add(
                models.User(
                    id=u["id"], phone=u["phone"], username=u["username"],
                    display_name=u["name"], about=u["about"],
                )
            )
    db.commit()


def test_seed_missing_demo_dms_backfills_ananya_meera_dev(db):
    # seed_missing_demo_dms only ever creates these three — demo<->aarav/
    # priya/rohan/kabir are run_seed's own responsibility, not this
    # function's. Verifying that contract, not "every seed user has a DM"
    # (which would depend on run_seed having actually populated this
    # shared test database, which it may not have).
    _ensure_seed_users_exist(db)
    seed_missing_demo_dms(db)

    partners = _dm_partners_of(db, "demo")
    assert {"ananya", "meera", "dev"} <= partners


def test_backfill_is_idempotent_and_skips_existing_dms(db):
    _ensure_seed_users_exist(db)
    seed_missing_demo_dms(db)

    before = _dm_partners_of(db, "demo")
    conversation_count_before = db.query(models.Conversation).count()

    seed_missing_demo_dms(db)  # calling it again must not duplicate anything

    after = _dm_partners_of(db, "demo")
    assert after == before
    assert db.query(models.Conversation).count() == conversation_count_before
