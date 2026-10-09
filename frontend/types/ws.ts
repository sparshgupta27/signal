import type { Conversation, Message, MessageStatus } from "./index";

/**
 * Mirrors the future real WebSocket contract. The mock socket (lib/mock/socket.ts)
 * emits these same shapes so swapping in the real client later is a one-file change.
 */
export type WsEvent =
  | { type: "message.new"; data: { message: Message } }
  | {
      type: "message.status";
      data: {
        messageId: string;
        conversationId: string;
        status: MessageStatus;
        at: string;
      };
    }
  | {
      type: "typing";
      data: { conversationId: string; userId: string; isTyping: boolean };
    }
  | {
      type: "presence";
      data: { userId: string; isOnline: boolean; lastSeenAt: string | null };
    }
  | { type: "conversation.updated"; data: { conversation: Conversation } }
  | {
      type: "message.deleted";
      data: { messageId: string; conversationId: string; deletedAt: string };
    };

export type WsEventType = WsEvent["type"];
export type WsEventData<T extends WsEventType> = Extract<
  WsEvent,
  { type: T }
>["data"];
