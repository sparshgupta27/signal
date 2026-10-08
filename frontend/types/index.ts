export type ConversationType = "direct" | "group";
export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";
export type MessageType = "text" | "system";
export type GroupRole = "admin" | "member";

export interface User {
  id: string;
  name: string;
  username: string;
  phone: string;
  avatarUrl?: string | null;
  about?: string;
  isOnline: boolean;
  /** ISO timestamp, or null while online / hidden by privacy settings. */
  lastSeenAt: string | null;
}

export interface GroupMember {
  userId: string;
  role: GroupRole;
  joinedAt: string;
  /** Soft-leave: history stays visible, member drops out of memberIds. */
  leftAt?: string | null;
}

export interface ConversationSummary {
  id: string;
  body: string;
  senderId: string | null;
  type: MessageType;
  createdAt: string;
  deletedAt?: string | null;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  /** Groups only. */
  name: string | null;
  avatarUrl?: string | null;
  /** Currently active members (direct: [me, other]). */
  memberIds: string[];
  /** Groups only — full roster including left/removed members for history. */
  members?: GroupMember[];
  createdBy?: string;
  disappearingSeconds?: number | null;
  lastMessage: ConversationSummary | null;
  lastMessageAt: string | null;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  isArchived: boolean;
  createdAt: string;
}

export interface MessageReaction {
  emoji: string;
  userId: string;
}

export interface SystemEvent {
  action:
    | "created"
    | "member_added"
    | "member_removed"
    | "member_left"
    | "member_promoted"
    | "member_demoted"
    | "name_changed";
  actorId: string;
  targetId?: string;
  value?: string;
}

export interface Message {
  id: string;
  /** Client-generated id used to de-duplicate retries and match optimistic sends. */
  clientId: string;
  conversationId: string;
  senderId: string | null;
  type: MessageType;
  body: string;
  replyToId?: string | null;
  reactions: MessageReaction[];
  status: MessageStatus;
  createdAt: string;
  deletedAt?: string | null;
  systemEvent?: SystemEvent;
}
