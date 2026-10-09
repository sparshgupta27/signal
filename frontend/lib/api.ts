import type {
  Conversation,
  GroupMember,
  GroupRole,
  Message,
  MessageAttachment,
  User,
} from "@/types";
import { getAccessToken, clearSession } from "./session";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

/** Shared by every call below. On a 401 the token is dead (expired/invalid)
 * — clear the session and bounce to /welcome rather than let every call
 * site handle that itself. */
async function request<T>(
  path: string,
  init?: RequestInit & { skipAuth?: boolean }
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (!init?.skipAuth) {
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (res.status === 401 && !init?.skipAuth) {
    clearSession();
    if (typeof window !== "undefined") window.location.href = "/welcome";
    throw new ApiError(401, "Session expired");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function qs(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][];
  if (entries.length === 0) return "";
  return `?${new URLSearchParams(entries).toString()}`;
}

// --- attachments --------------------------------------------------------------
// Served through GET /uploads/{id}, which can't read an Authorization header
// (it's hit by <img src>/<a href>), so the token rides in the query string —
// same accepted tradeoff the WebSocket endpoint already uses.

export function attachmentUrl(path: string): string {
  const token = getAccessToken();
  const sep = path.includes("?") ? "&" : "?";
  return `${API_BASE}${path}${token ? `${sep}token=${encodeURIComponent(token)}` : ""}`;
}

interface RawAttachment {
  id: string;
  kind: string;
  url: string;
  name: string;
  size: number;
  mimeType: string;
  width?: number | null;
  height?: number | null;
}

function mapAttachment(raw: RawAttachment): MessageAttachment {
  return {
    kind: raw.kind === "image" ? "image" : "file",
    url: attachmentUrl(raw.url),
    name: raw.name,
    size: raw.size,
    mimeType: raw.mimeType,
    width: raw.width ?? undefined,
    height: raw.height ?? undefined,
  };
}

/** The backend supports several attachments per message; the UI only ever
 * sends one, so only the first is surfaced here. */
export function mapMessage(raw: Message & { attachments?: RawAttachment[] }): Message {
  const { attachments, ...rest } = raw;
  return {
    ...rest,
    attachment: attachments && attachments.length > 0 ? mapAttachment(attachments[0]!) : null,
  };
}

export async function uploadAttachment(
  file: File,
  dims?: { width: number; height: number }
): Promise<MessageAttachment & { id: string }> {
  const form = new FormData();
  form.append("file", file);
  if (dims) {
    form.append("width", String(dims.width));
    form.append("height", String(dims.height));
  }
  const raw = await request<RawAttachment>("/api/v1/uploads", { method: "POST", body: form });
  return { ...mapAttachment(raw), id: raw.id };
}

// --- auth -----------------------------------------------------------------------

export async function requestOtp(identifier: string): Promise<{ isNewUser: boolean; otp: string }> {
  const out = await request<{ isNewUser: boolean; otpHint: string }>("/api/v1/auth/request-otp", {
    method: "POST",
    body: JSON.stringify({ identifier }),
    skipAuth: true,
  });
  return { isNewUser: out.isNewUser, otp: out.otpHint };
}

export async function verifyOtp(
  identifier: string,
  code: string
): Promise<{ success: boolean; accessToken?: string; user?: User; needsProfile: boolean }> {
  return request("/api/v1/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ identifier, code }),
    skipAuth: true,
  });
}

export function getMe(): Promise<User> {
  return request("/api/v1/users/me");
}

export function updateMe(input: { name?: string; about?: string; avatarUrl?: string | null }): Promise<User> {
  return request("/api/v1/users/me", { method: "PATCH", body: JSON.stringify(input) });
}

export function getUserById(userId: string): Promise<User> {
  return request(`/api/v1/users/${userId}`);
}

export function listAllUsers(): Promise<User[]> {
  return request("/api/v1/users");
}

// --- conversations ---------------------------------------------------------------

export function sortConversations(list: Conversation[]): Conversation[] {
  return [...list].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bt - at;
  });
}

export async function getConversations(): Promise<Conversation[]> {
  const list = await request<Conversation[]>("/api/v1/conversations");
  return sortConversations(list);
}

export async function getArchivedConversations(): Promise<Conversation[]> {
  const list = await request<Conversation[]>("/api/v1/conversations/archived");
  return sortConversations(list);
}

export function getConversation(id: string): Promise<Conversation | null> {
  return request<Conversation>(`/api/v1/conversations/${id}`).catch((e) => {
    if (e instanceof ApiError && (e.status === 404 || e.status === 403)) return null;
    throw e;
  });
}

export function createDirectConversation(otherUserId: string): Promise<Conversation> {
  return request("/api/v1/conversations/direct", {
    method: "POST",
    body: JSON.stringify({ userId: otherUserId }),
  });
}

export function setConversationFlags(
  conversationId: string,
  flags: Partial<Pick<Conversation, "isPinned" | "isMuted" | "isArchived">>
): Promise<Conversation> {
  return request(`/api/v1/conversations/${conversationId}/me`, {
    method: "PATCH",
    body: JSON.stringify(flags),
  });
}

export function setDisappearing(
  conversationId: string,
  disappearingSeconds: number | null
): Promise<Conversation> {
  return request(`/api/v1/conversations/${conversationId}`, {
    method: "PATCH",
    body: JSON.stringify({ disappearingSeconds }),
  });
}

export async function markRead(conversationId: string): Promise<void> {
  await request(`/api/v1/conversations/${conversationId}/read`, { method: "POST" });
}

// --- messages ---------------------------------------------------------------------

export async function getMessages(
  conversationId: string,
  opts: { before?: string } = {}
): Promise<{ messages: Message[]; hasMore: boolean }> {
  const page = await request<{ messages: Message[]; hasMore: boolean }>(
    `/api/v1/conversations/${conversationId}/messages${qs({ before: opts.before })}`
  );
  return { messages: page.messages.map(mapMessage), hasMore: page.hasMore };
}

export async function setReaction(messageId: string, emoji: string): Promise<void> {
  await request(`/api/v1/messages/${messageId}/reaction`, {
    method: "PUT",
    body: JSON.stringify({ emoji }),
  });
}

export async function removeReaction(messageId: string): Promise<void> {
  await request(`/api/v1/messages/${messageId}/reaction`, { method: "DELETE" });
}

// --- groups -------------------------------------------------------------------------

export function createGroup(input: { name: string; memberIds: string[] }): Promise<Conversation> {
  return request("/api/v1/groups", { method: "POST", body: JSON.stringify(input) });
}

export function addMembers(conversationId: string, userIds: string[]): Promise<Conversation> {
  return request(`/api/v1/groups/${conversationId}/members`, {
    method: "POST",
    body: JSON.stringify({ userIds }),
  });
}

export function removeMember(conversationId: string, userId: string): Promise<Conversation> {
  return request(`/api/v1/groups/${conversationId}/members/${userId}`, { method: "DELETE" });
}

export function setMemberRole(
  conversationId: string,
  userId: string,
  role: GroupRole
): Promise<Conversation> {
  return request(`/api/v1/groups/${conversationId}/members/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export type { GroupMember };

// --- contacts -----------------------------------------------------------------------

export interface DirectoryUser extends User {
  isContact: boolean;
}

export function getContacts(): Promise<DirectoryUser[]> {
  return request("/api/v1/contacts");
}

export function addContact(userId: string): Promise<DirectoryUser> {
  return request("/api/v1/contacts", { method: "POST", body: JSON.stringify({ userId }) });
}

export async function removeContact(userId: string): Promise<void> {
  await request(`/api/v1/contacts/${userId}`, { method: "DELETE" });
}

export function lookupUser(identifier: string): Promise<DirectoryUser | null> {
  return request(`/api/v1/users/lookup${qs({ identifier })}`);
}

// --- search -----------------------------------------------------------------------

export interface SearchResults {
  conversations: Conversation[];
  contacts: User[];
  messages: { conversation: Conversation; message: Message }[];
}

export async function searchAll(query: string): Promise<SearchResults> {
  const q = query.trim();
  if (!q) return { conversations: [], contacts: [], messages: [] };
  const raw = await request<{
    conversations: Conversation[];
    contacts: User[];
    messages: { conversation: Conversation; message: Message }[];
  }>(`/api/v1/search${qs({ q })}`);
  return {
    ...raw,
    messages: raw.messages.map((hit) => ({ conversation: hit.conversation, message: mapMessage(hit.message) })),
  };
}
