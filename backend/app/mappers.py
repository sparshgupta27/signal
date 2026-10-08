from . import models, schemas


def user_out(user: models.User) -> schemas.UserOut:
    return schemas.UserOut(
        id=user.id,
        name=user.display_name,
        username=user.username or "",
        phone=user.phone or "",
        avatar_url=user.avatar_url,
        about=user.about,
        is_online=user.is_online,
        last_seen_at=user.last_seen_at,
    )


def directory_user_out(user: models.User, is_contact: bool) -> schemas.DirectoryUserOut:
    base = user_out(user)
    return schemas.DirectoryUserOut(**base.model_dump(), is_contact=is_contact)
