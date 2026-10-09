import type { Conversation, Message } from "@/types";
import { CURRENT_USER_ID, getUser } from "@/lib/mock/data";

export function getOtherMemberId(conversation: Conversation): string | undefined {
  return conversation.memberIds.find((id) => id !== CURRENT_USER_ID);
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
    last.senderId === CURRENT_USER_ID
      ? "You: "
      : conversation.type === "group"
        ? `${getUser(last.senderId)?.name.split(" ")[0] ?? "Someone"}: `
        : "";
  const body =
    last.attachmentKind === "image"
      ? last.body
        ? `📷 ${last.body}`
        : "📷 Photo"
      : last.attachmentKind === "file"
        ? `📎 ${last.attachmentName ?? last.body ?? "File"}`
        : last.body;
  return `${prefix}${body}`;
}

export function senderDisplayName(message: Message): string {
  if (message.senderId === CURRENT_USER_ID) return "You";
  return getUser(message.senderId)?.name ?? "Unknown";
}
