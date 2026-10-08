"""Idempotent seed: a handful of named accounts so a reviewer can log in as
someone recognizable without registering first. Real multi-user testing means
registering fresh accounts beyond these — see README.

Run with: .venv\\Scripts\\python.exe seed.py
"""

from app import models
from app.core.database import Base, SessionLocal, engine

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

CONTACTS_OF_DEMO = ["aarav", "priya", "rohan", "ananya", "kabir"]


def run() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(models.User).count() > 0:
            print("Already seeded, skipping.")
            return
        for u in SEED_USERS:
            db.add(
                models.User(
                    id=u["id"],
                    phone=u["phone"],
                    username=u["username"],
                    display_name=u["name"],
                    about=u["about"],
                )
            )
        db.flush()
        for cid in CONTACTS_OF_DEMO:
            db.add(models.Contact(owner_id="demo", contact_id=cid))
        db.commit()
        print(f"Seeded {len(SEED_USERS)} users. Log in with OTP 123456 as e.g. demo.01 or +91 90000 00001.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
