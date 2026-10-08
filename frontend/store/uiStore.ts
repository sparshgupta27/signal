import { create } from "zustand";

interface UiState {
  detailsPanelOpen: boolean;
  openDetailsPanel: () => void;
  closeDetailsPanel: () => void;
  toggleDetailsPanel: () => void;

  /** Mobile single-pane navigation: which pane is showing. */
  mobileView: "list" | "chat";
  setMobileView: (view: "list" | "chat") => void;

  /** The conversation the thread is currently replying to, keyed by conversation id. */
  replyTargets: Record<string, string | undefined>;
  setReplyTarget: (conversationId: string, messageId: string | undefined) => void;

  drafts: Record<string, string>;
  setDraft: (conversationId: string, text: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  detailsPanelOpen: false,
  openDetailsPanel: () => set({ detailsPanelOpen: true }),
  closeDetailsPanel: () => set({ detailsPanelOpen: false }),
  toggleDetailsPanel: () => set((s) => ({ detailsPanelOpen: !s.detailsPanelOpen })),

  mobileView: "list",
  setMobileView: (view) => set({ mobileView: view }),

  replyTargets: {},
  setReplyTarget: (conversationId, messageId) =>
    set((s) => ({ replyTargets: { ...s.replyTargets, [conversationId]: messageId } })),

  drafts: {},
  setDraft: (conversationId, text) =>
    set((s) => ({ drafts: { ...s.drafts, [conversationId]: text } })),
}));
