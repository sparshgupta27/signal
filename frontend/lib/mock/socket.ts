import type { Message, MessageAttachment } from "@/types";
import type { WsEventData, WsEventType } from "@/types/ws";
import { CURRENT_USER_ID, users } from "./data";
import * as store from "./store";

/**
 * Fake socket emitter with the same on/send shape the real lib/ws.ts will
 * have, so swapping in a real WebSocket later only touches this file.
 * Drives the whole illusion of liveness: send → sent → delivered → read,
 * random incoming messages + typing bursts, and presence flicker.
 */

type Listener<T extends WsEventType = WsEventType> = (data: WsEventData<T>) => void;
// Storage is type-erased (heterogeneous event map), the public on/emit
// signatures below are what actually keep callers type-safe.
type AnyListener = (data: never) => void;

class MockSocket {
  private listeners = new Map<WsEventType, Set<AnyListener>>();
  private started = false;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private intervals: ReturnType<typeof setInterval>[] = [];

  on<T extends WsEventType>(type: T, handler: Listener<T>): () => void {
    const set = this.listeners.get(type) ?? new Set();
    const erased = handler as unknown as AnyListener;
    set.add(erased);
    this.listeners.set(type, set);
    return () => set.delete(erased);
  }

  private emit<T extends WsEventType>(type: T, data: WsEventData<T>) {
    const set = this.listeners.get(type);
    if (!set) return;
    for (const handler of set) (handler as unknown as Listener<T>)(data);
  }

  private after(ms: number, fn: () => void) {
    const id = setTimeout(fn, ms);
    this.timers.push(id);
  }

  /** Client → server: send a text message. Persists immediately (optimistic) then simulates the receipt lifecycle. */
  sendMessage(
    conversationId: string,
    input: {
      clientId: string;
      body: string;
      replyToId?: string | null;
      attachment?: MessageAttachment | null;
    }
  ) {
    const message: Message = {
      id: input.clientId,
      clientId: input.clientId,
      conversationId,
      senderId: CURRENT_USER_ID,
      type: "text",
      body: input.body,
      replyToId: input.replyToId ?? null,
      attachment: input.attachment ?? null,
      reactions: [],
      status: "sending",
      createdAt: new Date().toISOString(),
    };
    store.pushMessage(message);
    const conversation = store.touchConversation(conversationId, message);
    this.emit("message.new", { message });
    if (conversation) this.emit("conversation.updated", { conversation });

    this.after(300, () => {
      store.setMessageStatus(conversationId, message.id, "sent");
      this.emit("message.status", {
        messageId: message.id,
        conversationId,
        status: "sent",
        at: new Date().toISOString(),
      });
    });
    this.after(1000, () => {
      store.setMessageStatus(conversationId, message.id, "delivered");
      this.emit("message.status", {
        messageId: message.id,
        conversationId,
        status: "delivered",
        at: new Date().toISOString(),
      });
    });
    this.after(2500, () => {
      store.setMessageStatus(conversationId, message.id, "read");
      this.emit("message.status", {
        messageId: message.id,
        conversationId,
        status: "read",
        at: new Date().toISOString(),
      });
    });

    return message;
  }

  setTyping(conversationId: string, isTyping: boolean) {
    this.emit("typing", { conversationId, userId: CURRENT_USER_ID, isTyping });
  }

  markRead(conversationId: string) {
    const conversation = store.clearUnread(conversationId);
    if (conversation) this.emit("conversation.updated", { conversation });
  }

  /** Starts the background "other people are using the app too" simulation. Idempotent. */
  start() {
    if (this.started) return;
    this.started = true;

    const incomingPool = [
      "wait really?",
      "lol true",
      "one sec",
      "sending it now",
      "did you see the update",
      "omg finally",
      "can we push this to tomorrow",
      "sounds good to me",
      "👀",
      "on my way",
      "that's hilarious",
      "no way",
      "let me check and get back to you",
    ];

    const tick = () => {
      const conversations = store.listConversations().filter((c) => !c.isArchived);
      if (conversations.length === 0) return;
      const conversation = conversations[Math.floor(Math.random() * conversations.length)]!;
      const others = conversation.memberIds.filter((id) => id !== CURRENT_USER_ID);
      if (others.length === 0) return;
      const senderId = others[Math.floor(Math.random() * others.length)]!;

      this.emit("typing", { conversationId: conversation.id, userId: senderId, isTyping: true });

      this.after(1400 + Math.random() * 900, () => {
        this.emit("typing", { conversationId: conversation.id, userId: senderId, isTyping: false });

        const body = incomingPool[Math.floor(Math.random() * incomingPool.length)]!;
        const message: Message = {
          id: `incoming-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          clientId: `incoming-${Date.now()}`,
          conversationId: conversation.id,
          senderId,
          type: "text",
          body,
          reactions: [],
          status: "delivered",
          createdAt: new Date().toISOString(),
        };
        store.pushMessage(message);
        store.touchConversation(conversation.id, message);
        const updated = store.incrementUnread(conversation.id, 1);
        this.emit("message.new", { message });
        if (updated) this.emit("conversation.updated", { conversation: updated });
      });
    };

    const presenceTick = () => {
      const candidates = users.filter((u) => u.id !== CURRENT_USER_ID);
      const user = candidates[Math.floor(Math.random() * candidates.length)];
      if (!user) return;
      const nowOnline = !user.isOnline;
      user.isOnline = nowOnline;
      user.lastSeenAt = nowOnline ? null : new Date().toISOString();
      this.emit("presence", {
        userId: user.id,
        isOnline: nowOnline,
        lastSeenAt: user.lastSeenAt,
      });
    };

    this.intervals.push(setInterval(tick, 22_000));
    this.intervals.push(setInterval(presenceTick, 17_000));
  }

  stop() {
    this.started = false;
    this.timers.forEach(clearTimeout);
    this.intervals.forEach(clearInterval);
    this.timers = [];
    this.intervals = [];
  }
}

export const mockSocket = new MockSocket();
