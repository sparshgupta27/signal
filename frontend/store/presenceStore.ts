import { create } from "zustand";

interface PresenceInfo {
  isOnline: boolean;
  lastSeenAt: string | null;
}

interface PresenceState {
  users: Record<string, PresenceInfo>;
  /** conversationId -> set of userIds currently typing */
  typing: Record<string, Set<string>>;
  setPresence: (userId: string, info: PresenceInfo) => void;
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
  clearTypingForConversation: (conversationId: string) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  users: {},
  typing: {},

  setPresence: (userId, info) =>
    set((state) => ({ users: { ...state.users, [userId]: info } })),

  setTyping: (conversationId, userId, isTyping) =>
    set((state) => {
      const current = new Set(state.typing[conversationId] ?? []);
      if (isTyping) current.add(userId);
      else current.delete(userId);
      return { typing: { ...state.typing, [conversationId]: current } };
    }),

  clearTypingForConversation: (conversationId) =>
    set((state) => ({ typing: { ...state.typing, [conversationId]: new Set() } })),
}));
