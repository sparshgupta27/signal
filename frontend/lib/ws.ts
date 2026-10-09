import type { Message, MessageAttachment } from "@/types";
import type { WsEvent, WsEventData, WsEventType } from "@/types/ws";
import { mapMessage } from "./api";
import { getAccessToken, getCurrentUserId, subscribeSession } from "./session";

/**
 * Real WebSocket client — same on()/emit shape lib/mock/socket.ts used, so
 * the hooks that drove the mock barely change. What's genuinely new here
 * (the mock never needed it): actual reconnection with backoff, and an
 * optimistic local echo on send, since there's no shared synchronous store
 * a second hook instance can read mid-send the way the mock store allowed.
 */

type Listener<T extends WsEventType = WsEventType> = (data: WsEventData<T>) => void;
type AnyListener = (data: never) => void;

function wsBaseUrl(): string {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  return apiBase.replace(/^http/, "ws");
}

const MAX_RECONNECT_DELAY_MS = 15_000;

class WsClient {
  private listeners = new Map<WsEventType, Set<AnyListener>>();
  private socket: WebSocket | null = null;
  private shouldRun = false;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribeSession: (() => void) | undefined;

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

  /** Starts (or restarts, on a session change) the connection. Idempotent
   * while the token hasn't changed. */
  start() {
    if (this.shouldRun) return;
    this.shouldRun = true;
    this.open();
    // A login/logout while already connected (rare, but e.g. a token
    // refresh) should reconnect with the new token rather than keep a
    // stale one.
    this.unsubscribeSession = subscribeSession(() => {
      this.close();
      if (this.shouldRun) this.open();
    });
  }

  stop() {
    this.shouldRun = false;
    this.unsubscribeSession?.();
    this.unsubscribeSession = undefined;
    this.close();
  }

  private open() {
    const token = getAccessToken();
    if (!token) return;
    const socket = new WebSocket(`${wsBaseUrl()}/ws?token=${encodeURIComponent(token)}`);
    this.socket = socket;

    socket.onopen = () => {
      this.reconnectAttempt = 0;
    };
    socket.onmessage = (event) => {
      let parsed: WsEvent;
      try {
        parsed = JSON.parse(event.data);
      } catch {
        return;
      }
      // The wire shape for a message (attachments: [...] plural, bare
      // storage paths) differs from the frontend's Message type (attachment:
      // singular, full URLs) exactly like REST responses do — api.ts maps
      // those via mapMessage(), so live WS messages need the same pass or
      // every attachment silently vanishes the moment it arrives live.
      if (parsed.type === "message.new") {
        this.emit("message.new", { message: mapMessage(parsed.data.message) });
        return;
      }
      this.emit(parsed.type, parsed.data as never);
    };
    socket.onclose = () => {
      if (this.socket === socket) this.socket = null;
      if (this.shouldRun) this.scheduleReconnect();
    };
    socket.onerror = () => socket.close();
  }

  private close() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
  }

  private scheduleReconnect() {
    const delay = Math.min(1000 * 2 ** this.reconnectAttempt, MAX_RECONNECT_DELAY_MS);
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      if (this.shouldRun) this.open();
    }, delay);
  }

  private send(type: string, data: unknown) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, data }));
    }
  }

  /** Echoes a "sending…" placeholder locally (same clientId the server will
   * echo back), then sends the real frame. useMessages reconciles the two
   * by clientId once the authoritative message.new arrives. */
  sendMessage(
    conversationId: string,
    input: {
      clientId: string;
      body: string;
      replyToId?: string | null;
      attachmentIds?: string[];
      /** Local-preview only — never sent over the wire, just lets the
       * optimistic bubble show the picked image/file immediately. */
      attachmentPreview?: MessageAttachment | null;
    }
  ) {
    const optimistic: Message = {
      id: input.clientId,
      clientId: input.clientId,
      conversationId,
      senderId: getCurrentUserId(),
      type: "text",
      body: input.body,
      replyToId: input.replyToId ?? null,
      attachment: input.attachmentPreview ?? null,
      reactions: [],
      status: "sending",
      createdAt: new Date().toISOString(),
    };
    this.emit("message.new", { message: optimistic });

    this.send("message.send", {
      conversationId,
      clientId: input.clientId,
      body: input.body,
      replyToId: input.replyToId ?? null,
      attachmentIds: input.attachmentIds ?? [],
    });
  }

  setTyping(conversationId: string, isTyping: boolean) {
    this.send("typing", { conversationId, isTyping });
  }

  markRead(conversationId: string, upToMessageId: string) {
    this.send("message.read", { conversationId, upToMessageId });
  }

  markDelivered(messageIds: string[]) {
    if (messageIds.length === 0) return;
    this.send("message.delivered", { messageIds });
  }
}

export const wsClient = new WsClient();
