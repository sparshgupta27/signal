import type { Conversation, ConversationSummary, Message, MessageStatus } from "@/types";
import { conversations as seedConversations, seedMessages } from "./data";
import { generatedContactIds } from "./generatedContacts";

/**
 * The single mutable in-memory "database" behind the mock API + mock socket.
 * Both modules read/write through here so a sent message, a status update or
 * a group change is visible everywhere consistently — exactly like a real
 * backend would be the shared source of truth for REST and WS alike.
 */

const conversationsById = new Map<string, Conversation>(
  seedConversations.map((c) => [c.id, structuredClone(c)])
);

const messagesByConversation = new Map<string, Message[]>();
for (const message of seedMessages) {
  const list = messagesByConversation.get(message.conversationId) ?? [];
  list.push(message);
  messagesByConversation.set(message.conversationId, list);
}

export interface ContactRecord {
  userId: string;
  nickname?: string;
  addedAt: string;
}

// Everyone Demo User already has a DM thread with is a plausible existing
// contact, as is the large generated directory (demo scale for the contact
// list + search). Meera and Dev are deliberately left out — group-only
// acquaintances, so "Add contact" still has someone real to add.
const INITIAL_CONTACT_IDS = [
  "aarav",
  "priya",
  "rohan",
  "ananya",
  "kabir",
  ...generatedContactIds,
];
const contactsById = new Map<string, ContactRecord>(
  INITIAL_CONTACT_IDS.map((userId) => [userId, { userId, addedAt: new Date(0).toISOString() }])
);

export function listContacts(): ContactRecord[] {
  return Array.from(contactsById.values());
}

export function isContact(userId: string): boolean {
  return contactsById.has(userId);
}

export function addContact(userId: string, nickname?: string): ContactRecord {
  const record: ContactRecord = { userId, nickname, addedAt: new Date().toISOString() };
  contactsById.set(userId, record);
  return record;
}

export function removeContact(userId: string): void {
  contactsById.delete(userId);
}

export function listConversations(): Conversation[] {
  return Array.from(conversationsById.values());
}

export function getConversation(id: string): Conversation | undefined {
  return conversationsById.get(id);
}

export function putConversation(conversation: Conversation): void {
  conversationsById.set(conversation.id, conversation);
}

export function listMessages(conversationId: string): Message[] {
  return messagesByConversation.get(conversationId) ?? [];
}

export function pushMessage(message: Message): void {
  const list = messagesByConversation.get(message.conversationId) ?? [];
  list.push(message);
  messagesByConversation.set(message.conversationId, list);
}

export function updateMessage(
  conversationId: string,
  messageId: string,
  patch: Partial<Message>
): Message | undefined {
  const list = messagesByConversation.get(conversationId);
  if (!list) return undefined;
  const idx = list.findIndex((m) => m.id === messageId);
  if (idx === -1) return undefined;
  const updated = { ...list[idx]!, ...patch };
  list[idx] = updated;
  return updated;
}

export function setMessageStatus(
  conversationId: string,
  messageId: string,
  status: MessageStatus
): Message | undefined {
  return updateMessage(conversationId, messageId, { status });
}

function toSummary(message: Message): ConversationSummary {
  return {
    id: message.id,
    body: message.body,
    senderId: message.senderId,
    type: message.type,
    createdAt: message.createdAt,
    deletedAt: message.deletedAt ?? null,
  };
}

/** Bumps a conversation's preview + sort position after a new message lands. */
export function touchConversation(conversationId: string, message: Message): Conversation | undefined {
  const conversation = conversationsById.get(conversationId);
  if (!conversation) return undefined;
  const updated: Conversation = {
    ...conversation,
    lastMessage: toSummary(message),
    lastMessageAt: message.createdAt,
  };
  conversationsById.set(conversationId, updated);
  return updated;
}

export function incrementUnread(conversationId: string, by = 1): Conversation | undefined {
  const conversation = conversationsById.get(conversationId);
  if (!conversation) return undefined;
  const updated = { ...conversation, unreadCount: conversation.unreadCount + by };
  conversationsById.set(conversationId, updated);
  return updated;
}

export function clearUnread(conversationId: string): Conversation | undefined {
  const conversation = conversationsById.get(conversationId);
  if (!conversation) return undefined;
  if (conversation.unreadCount === 0) return conversation;
  const updated = { ...conversation, unreadCount: 0 };
  conversationsById.set(conversationId, updated);
  return updated;
}
