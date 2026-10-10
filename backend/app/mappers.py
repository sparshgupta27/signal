from . import models, schemas


def user_out(user: models.User, viewer_id: str | None = None) -> schemas.UserOut:
    is_self = viewer_id is not None and viewer_id == user.id
    return schemas.UserOut(
        id=user.id,
        name=user.display_name,
        username=user.username or "",
        phone=user.phone or "",
        avatar_url=user.avatar_url,
        about=user.about,
        is_online=user.is_online,
        # Hidden from everyone but the user themselves once they've turned
        # "show last seen" off — not just a cosmetic client-side toggle.
        last_seen_at=user.last_seen_at if (is_self or user.show_last_seen) else None,
        show_last_seen=user.show_last_seen if is_self else None,
        public_key=user.public_key,
    )


def directory_user_out(
    user: models.User, is_contact: bool, viewer_id: str | None = None
) -> schemas.DirectoryUserOut:
    base = user_out(user, viewer_id)
    return schemas.DirectoryUserOut(**base.model_dump(), is_contact=is_contact)


def attachment_kind(mime_type: str) -> str:
    if mime_type.startswith("image/"):
        return "image"
    if mime_type.startswith("video/"):
        return "video"
    return "file"


def attachment_out(attachment: models.Attachment) -> schemas.AttachmentOut:
    return schemas.AttachmentOut(
        id=attachment.id,
        kind=attachment_kind(attachment.mime_type),
        url=f"/api/v1/uploads/{attachment.id}",
        name=attachment.file_name,
        size=attachment.size_bytes,
        mime_type=attachment.mime_type,
        width=attachment.width,
        height=attachment.height,
    )


def upload_out(attachment: models.Attachment) -> schemas.UploadOut:
    base = attachment_out(attachment)
    return schemas.UploadOut(**base.model_dump())


def reaction_out(reaction: models.MessageReaction) -> schemas.ReactionOut:
    return schemas.ReactionOut(emoji=reaction.emoji, user_id=reaction.user_id)
