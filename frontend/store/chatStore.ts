import { create } from "zustand";

interface ChatState {
  /** The conversation currently open in the chat pane, if any. Set by the chat route. */
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeConversationId: null,
  setActiveConversationId: (id) => set({ activeConversationId: id }),
}));
