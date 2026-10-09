import type { Conversation, Message, MessageReaction, MessageStatus } from "./index";

/** The real WebSocket contract, served from /ws (see lib/ws.ts). */
export type WsEvent =
  | { type: "message.new"; data: { message: Message } }
  | { type: "message.edited"; data: { message: Message } }
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
    }
  | {
      type: "reaction.updated";
      data: { messageId: string; conversationId: string; reactions: MessageReaction[] };
    };

export type WsEventType = WsEvent["type"];
export type WsEventData<T extends WsEventType> = Extract<
  WsEvent,
  { type: T }
>["data"];
