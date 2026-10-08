import type { Conversation, GroupMember, Message, User } from "@/types";
import { CURRENT_USER_ID, getUser, users } from "./data";
import { getMyProfileSnapshot } from "./profile";
import * as store from "./store";

function delay(ms = 220): Promise<void> {
  const jitter = ms * 0.4 * (Math.random() - 0.5);
  return new Promise((resolve) => setTimeout(resolve, Math.max(60, ms + jitter)));
}

export function sortConversations(list: Conversation[]): Conversation[] {
  return [...list].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bt - at;
  });
}

export async function getMe(): Promise<User> {
  await delay();
  const me = getUser(CURRENT_USER_ID);
  if (!me) throw new Error("Seed data missing current user");
  const profile = getMyProfileSnapshot();
  return { ...me, name: profile.name, about: profile.about, avatarUrl: profile.avatarUrl };
}

export async function getConversations(): Promise<Conversation[]> {
  await delay();
  return sortConversations(
    store.listConversations().filter((c) => !c.isArchived)
  );
}

export async function getConversation(id: string): Promise<Conversation | null> {
  await delay(120);
  return store.getConversation(id) ?? null;
}

const PAGE_SIZE = 40;

export async function getMessages(
  conversationId: string,
  opts: { before?: string } = {}
): Promise<{ messages: Message[]; hasMore: boolean }> {
  await delay(180);
  const all = store.listMessages(conversationId);
  let upper = all.length;
  if (opts.before) {
    const idx = all.findIndex((m) => m.id === opts.before);
    if (idx !== -1) upper = idx;
  }
  const lower = Math.max(0, upper - PAGE_SIZE);
  const page = all.slice(lower, upper);
  return { messages: page, hasMore: lower > 0 };
}

export async function sendMessage(
  conversationId: string,
  input: { clientId: string; body: string; replyToId?: string | null }
): Promise<Message> {
  await delay(80);
  const message: Message = {
    id: input.clientId,
    clientId: input.clientId,
    conversationId,
    senderId: CURRENT_USER_ID,
    type: "text",
    body: input.body,
    replyToId: input.replyToId ?? null,
    reactions: [],
    status: "sending",
    createdAt: new Date().toISOString(),
  };
  store.pushMessage(message);
  store.touchConversation(conversationId, message);
  return message;
}

export async function markRead(conversationId: string): Promise<void> {
  await delay(100);
  store.clearUnread(conversationId);
}

export async function createGroup(input: {
  name: string;
  memberIds: string[];
}): Promise<Conversation> {
  await delay(260);
  const id = `group-${Date.now()}`;
  const now = new Date().toISOString();
  const members: GroupMember[] = [
    { userId: CURRENT_USER_ID, role: "admin", joinedAt: now },
    ...input.memberIds
      .filter((id2) => id2 !== CURRENT_USER_ID)
      .map((userId): GroupMember => ({ userId, role: "member", joinedAt: now })),
  ];
  const systemMessage: Message = {
    id: `${id}-created`,
    clientId: `${id}-created`,
    conversationId: id,
    senderId: null,
    type: "system",
    body: "",
    reactions: [],
    status: "sent",
    createdAt: now,
    systemEvent: { action: "created", actorId: CURRENT_USER_ID },
  };
  store.pushMessage(systemMessage);

  const conversation: Conversation = {
    id,
    type: "group",
    name: input.name,
    memberIds: members.map((m) => m.userId),
    members,
    createdBy: CURRENT_USER_ID,
    lastMessage: {
      id: systemMessage.id,
      body: "",
      senderId: null,
      type: "system",
      createdAt: now,
    },
    lastMessageAt: now,
    unreadCount: 0,
    isPinned: false,
    isMuted: false,
    isArchived: false,
    createdAt: now,
  };
  store.putConversation(conversation);
  return conversation;
}

export async function createDirectConversation(otherUserId: string): Promise<Conversation> {
  await delay(180);
  const existing = store
    .listConversations()
    .find(
      (c) =>
        c.type === "direct" &&
        c.memberIds.includes(otherUserId) &&
        c.memberIds.includes(CURRENT_USER_ID)
    );
  if (existing) return existing;

  const id = `dm-${otherUserId}-${Date.now()}`;
  const now = new Date().toISOString();
  const conversation: Conversation = {
    id,
    type: "direct",
    name: null,
    memberIds: [CURRENT_USER_ID, otherUserId],
    lastMessage: null,
    lastMessageAt: now,
    unreadCount: 0,
    isPinned: false,
    isMuted: false,
    isArchived: false,
    createdAt: now,
  };
  store.putConversation(conversation);
  return conversation;
}

export async function addMembers(
  conversationId: string,
  userIds: string[]
): Promise<Conversation> {
  await delay(220);
  const conversation = store.getConversation(conversationId);
  if (!conversation) throw new Error("Conversation not found");
  const now = new Date().toISOString();
  const existingIds = new Set(conversation.memberIds);
  const toAdd = userIds.filter((id) => !existingIds.has(id));

  const newMembers: GroupMember[] = toAdd.map((userId) => ({
    userId,
    role: "member",
    joinedAt: now,
  }));

  let lastMessage = conversation.lastMessage;
  for (const userId of toAdd) {
    const sysMsg: Message = {
      id: `${conversationId}-add-${userId}-${Date.now()}`,
      clientId: `${conversationId}-add-${userId}-${Date.now()}`,
      conversationId,
      senderId: null,
      type: "system",
      body: "",
      reactions: [],
      status: "sent",
      createdAt: now,
      systemEvent: { action: "member_added", actorId: CURRENT_USER_ID, targetId: userId },
    };
    store.pushMessage(sysMsg);
    lastMessage = { id: sysMsg.id, body: "", senderId: null, type: "system", createdAt: now };
  }

  const updated: Conversation = {
    ...conversation,
    memberIds: [...conversation.memberIds, ...toAdd],
    members: [...(conversation.members ?? []), ...newMembers],
    lastMessage,
    lastMessageAt: now,
  };
  store.putConversation(updated);
  return updated;
}

export async function removeMember(
  conversationId: string,
  userId: string
): Promise<Conversation> {
  await delay(220);
  const conversation = store.getConversation(conversationId);
  if (!conversation) throw new Error("Conversation not found");
  const now = new Date().toISOString();

  const sysMsg: Message = {
    id: `${conversationId}-remove-${userId}-${Date.now()}`,
    clientId: `${conversationId}-remove-${userId}-${Date.now()}`,
    conversationId,
    senderId: null,
    type: "system",
    body: "",
    reactions: [],
    status: "sent",
    createdAt: now,
    systemEvent: { action: "member_removed", actorId: CURRENT_USER_ID, targetId: userId },
  };
  store.pushMessage(sysMsg);

  const updated: Conversation = {
    ...conversation,
    memberIds: conversation.memberIds.filter((id) => id !== userId),
    members: (conversation.members ?? []).map((m) =>
      m.userId === userId ? { ...m, leftAt: now } : m
    ),
    lastMessage: { id: sysMsg.id, body: "", senderId: null, type: "system", createdAt: now },
    lastMessageAt: now,
  };
  store.putConversation(updated);
  return updated;
}

export async function setMemberRole(
  conversationId: string,
  userId: string,
  role: GroupMember["role"]
): Promise<Conversation> {
  await delay(180);
  const conversation = store.getConversation(conversationId);
  if (!conversation) throw new Error("Conversation not found");
  const updated: Conversation = {
    ...conversation,
    members: (conversation.members ?? []).map((m) =>
      m.userId === userId ? { ...m, role } : m
    ),
  };
  store.putConversation(updated);
  return updated;
}

export async function setConversationFlags(
  conversationId: string,
  flags: Partial<Pick<Conversation, "isPinned" | "isMuted" | "isArchived">>
): Promise<Conversation> {
  await delay(100);
  const conversation = store.getConversation(conversationId);
  if (!conversation) throw new Error("Conversation not found");
  const updated = { ...conversation, ...flags };
  store.putConversation(updated);
  return updated;
}

export interface SearchResults {
  conversations: Conversation[];
  contacts: User[];
  messages: { conversation: Conversation; message: Message }[];
}

export async function searchAll(query: string): Promise<SearchResults> {
  await delay(150);
  const q = query.trim().toLowerCase();
  if (!q) return { conversations: [], contacts: [], messages: [] };

  const conversationMatches = store.listConversations().filter((c) => {
    const title =
      c.type === "group" ? c.name ?? "" : getUser(c.memberIds.find((id) => id !== CURRENT_USER_ID))?.name ?? "";
    return title.toLowerCase().includes(q);
  });

  const contactMatches = store
    .listContacts()
    .map((record) => getUser(record.userId))
    .filter((u): u is User => !!u && u.name.toLowerCase().includes(q));

  const messages: SearchResults["messages"] = [];
  for (const conversation of store.listConversations()) {
    for (const message of store.listMessages(conversation.id)) {
      if (message.type === "text" && message.body.toLowerCase().includes(q)) {
        messages.push({ conversation, message });
      }
    }
  }

  return { conversations: conversationMatches, contacts: contactMatches, messages: messages.slice(0, 20) };
}

export async function listAllUsers(): Promise<User[]> {
  await delay(120);
  return users.filter((u) => u.id !== CURRENT_USER_ID);
}

export interface DirectoryUser extends User {
  isContact: boolean;
}

/** Your saved contacts, sorted by name — distinct from the full user directory. */
export async function getContacts(): Promise<DirectoryUser[]> {
  await delay(150);
  return store
    .listContacts()
    .map((record) => {
      const user = getUser(record.userId);
      return user ? { ...user, isContact: true } : null;
    })
    .filter((u): u is DirectoryUser => !!u)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function addContact(userId: string, nickname?: string): Promise<DirectoryUser> {
  await delay(200);
  store.addContact(userId, nickname);
  const user = getUser(userId);
  if (!user) throw new Error("User not found");
  return { ...user, isContact: true };
}

export async function removeContact(userId: string): Promise<void> {
  await delay(150);
  store.removeContact(userId);
}

/** "Add contact" lookup: find a registered user by exact username or phone number. */
export async function lookupUser(identifier: string): Promise<DirectoryUser | null> {
  await delay(350);
  const trimmed = identifier.trim();
  if (!trimmed) return null;
  const normalized = trimmed.toLowerCase().replace(/\s+/g, "");
  const normalizedPhone = trimmed.replace(/\s+/g, "");

  const user = users.find((u) => {
    if (u.id === CURRENT_USER_ID) return false;
    if (u.username.toLowerCase() === normalized) return true;
    const phoneDigits = u.phone.replace(/\s+/g, "");
    return phoneDigits === normalizedPhone || phoneDigits.endsWith(normalizedPhone);
  });

  if (!user) return null;
  return { ...user, isContact: store.isContact(user.id) };
}
