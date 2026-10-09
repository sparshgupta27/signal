import type { Conversation, Message } from "@/types";
import { getCurrentUserId } from "@/lib/session";
import { getUser } from "@/lib/users";

export function getOtherMemberId(conversation: Conversation): string | undefined {
  return conversation.memberIds.find((id) => id !== getCurrentUserId());
}

export function getConversationTitle(conversation: Conversation): string {
  if (conversation.type === "group") return conversation.name ?? "Group";
  const other = getOtherMemberId(conversation);
  return getUser(other)?.name ?? "Unknown";
}

/** Id used to derive the deterministic avatar colour + fallback initials. */
export function getConversationAvatarId(conversation: Conversation): string {
  if (conversation.type === "group") return conversation.id;
  return getOtherMemberId(conversation) ?? conversation.id;
}

export function getConversationAvatarUrl(conversation: Conversation): string | null {
  if (conversation.type === "group") return conversation.avatarUrl ?? null;
  const other = getOtherMemberId(conversation);
  return getUser(other)?.avatarUrl ?? null;
}

/** Chat-list preview line, e.g. "You: see you then" or "Priya: 😂😂😂". */
export function getPreviewText(conversation: Conversation): string {
  const last = conversation.lastMessage;
  if (!last) return "";
  if (last.deletedAt) return "This message was deleted";
  if (last.type === "system") return "Group updated";

  const prefix =
    last.senderId === getCurrentUserId()
      ? "You: "
      : conversation.type === "group"
        ? `${getUser(last.senderId)?.name.split(" ")[0] ?? "Someone"}: `
        : "";
  const body =
    last.attachmentKind === "image"
      ? last.body
        ? `📷 ${last.body}`
        : "📷 Photo"
      : last.attachmentKind === "video"
        ? last.body
          ? `🎥 ${last.body}`
          : "🎥 Video"
      : last.attachmentKind === "file"
        ? `📎 ${last.attachmentName ?? last.body ?? "File"}`
        : last.body;
  return `${prefix}${body}`;
}

export function senderDisplayName(message: Message): string {
  if (message.senderId === getCurrentUserId()) return "You";
  return getUser(message.senderId)?.name ?? "Unknown";
}

export function avatarColorFor(userId: string | null | undefined): number {
  if (!userId) return 0;
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  return (hash % 12) + 1;
}

