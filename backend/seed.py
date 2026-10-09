"""CLI entry point for seeding. The actual seed data/logic lives in
app/seeding.py, which is also called automatically from app.main's lifespan
on an empty database — this script is for manual/local use.

Run with: .venv\\Scripts\\python.exe seed.py
"""

from app import models
from app.core.database import Base, SessionLocal, engine
from app.seeding import run_seed


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        before = db.query(models.User).count()
        run_seed(db)
        if before == 0:
            print(
                "Seeded demo data. Log in as e.g. demo.01 or +91 90000 00001 — "
                "request-otp returns a fresh code each time."
            )
        else:
            print("Already seeded, skipping.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
