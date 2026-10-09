import { create } from "zustand";

interface UiState {
  detailsPanelOpen: boolean;
  openDetailsPanel: () => void;
  closeDetailsPanel: () => void;
  toggleDetailsPanel: () => void;

  /** The conversation the thread is currently replying to, keyed by conversation id. */
  replyTargets: Record<string, string | undefined>;
  setReplyTarget: (conversationId: string, messageId: string | undefined) => void;

  drafts: Record<string, string>;
  setDraft: (conversationId: string, text: string) => void;

  // Lifted out of ChatListHeader's local state so the Mod+N / Mod+Shift+N
  // global shortcuts can open it from any route, not just while it's mounted.
  newChatOpen: boolean;
  newChatMode: "browse" | "new-group";
  openNewChat: (mode?: "browse" | "new-group") => void;
  closeNewChat: () => void;

  shortcutsOpen: boolean;
  openShortcuts: () => void;
  closeShortcuts: () => void;

  /** Bumped by Mod+K; ListPane's search field watches this to focus itself. */
  searchFocusToken: number;
  requestSearchFocus: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  detailsPanelOpen: false,
  openDetailsPanel: () => set({ detailsPanelOpen: true }),
  closeDetailsPanel: () => set({ detailsPanelOpen: false }),
  toggleDetailsPanel: () => set((s) => ({ detailsPanelOpen: !s.detailsPanelOpen })),

  replyTargets: {},
  setReplyTarget: (conversationId, messageId) =>
    set((s) => ({ replyTargets: { ...s.replyTargets, [conversationId]: messageId } })),

  drafts: {},
  setDraft: (conversationId, text) =>
    set((s) => ({ drafts: { ...s.drafts, [conversationId]: text } })),

  newChatOpen: false,
  newChatMode: "browse",
  openNewChat: (mode = "browse") => set({ newChatOpen: true, newChatMode: mode }),
  closeNewChat: () => set({ newChatOpen: false }),

  shortcutsOpen: false,
  openShortcuts: () => set({ shortcutsOpen: true }),
  closeShortcuts: () => set({ shortcutsOpen: false }),

  searchFocusToken: 0,
  requestSearchFocus: () => set((s) => ({ searchFocusToken: s.searchFocusToken + 1 })),
}));
