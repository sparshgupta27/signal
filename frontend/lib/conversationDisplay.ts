import type { AttachmentKind, Conversation, Message } from "@/types";
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
  return `${prefix}${messageSummary(last.body, last.attachmentKind, last.attachmentName)}`;
}

/** One-line text for a message that may be media-only — shared by the chat
 * list preview, the in-app new-message toast and the browser notification. */
export function messageSummary(
  body: string,
  attachmentKind?: AttachmentKind | null,
  attachmentName?: string | null
): string {
  if (attachmentKind === "image") return body ? `📷 ${body}` : "📷 Photo";
  if (attachmentKind === "video") return body ? `🎥 ${body}` : "🎥 Video";
  if (attachmentKind === "file") return body ? `📎 ${body}` : `📎 ${attachmentName ?? "File"}`;
  return body;
}

export function senderDisplayName(message: Message): string {
  if (message.senderId === getCurrentUserId()) return "You";
  return getUser(message.senderId)?.name ?? "Unknown";
}
