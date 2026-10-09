"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, Loader2 } from "lucide-react";
import type { Conversation, Message } from "@/types";
import { getCurrentUserId } from "@/lib/session";
import { getUser } from "@/lib/users";
import { isSameCalendarDay, minutesBetween } from "@/lib/format";
import { EncryptionNotice } from "./EncryptionNotice";
import { DateDivider } from "./DateDivider";
import { SystemMessage } from "./SystemMessage";
import { MessageBubble } from "./MessageBubble";
import { TypingBubble } from "./TypingBubble";
import { useTypingUsers } from "@/hooks/usePresence";

const GROUP_WINDOW_MINUTES = 3;

type ThreadItem =
  | { kind: "divider"; id: string; iso: string }
  | { kind: "system"; id: string; message: Message }
  | {
      kind: "bubble";
      id: string;
      message: Message;
      isOwn: boolean;
      isFirstInRun: boolean;
      isLastInRun: boolean;
      showSenderName: boolean;
      showAvatar: boolean;
      replyToMessage: Message | null;
    };

function buildThreadItems(messages: Message[], isGroup: boolean): ThreadItem[] {
  const byId = new Map(messages.map((m) => [m.id, m]));
  const items: ThreadItem[] = [];
  let lastDay: string | null = null;

  messages.forEach((message, i) => {
    if (!lastDay || !isSameCalendarDay(lastDay, message.createdAt)) {
      items.push({ kind: "divider", id: `divider-${message.id}`, iso: message.createdAt });
      lastDay = message.createdAt;
    }

    if (message.type === "system") {
      items.push({ kind: "system", id: message.id, message });
      return;
    }

    const prev = messages[i - 1];
    const next = messages[i + 1];

    const sameRunAsPrev =
      !!prev &&
      prev.type === "text" &&
      prev.senderId === message.senderId &&
      isSameCalendarDay(prev.createdAt, message.createdAt) &&
      minutesBetween(prev.createdAt, message.createdAt) <= GROUP_WINDOW_MINUTES;

    const sameRunAsNext =
      !!next &&
      next.type === "text" &&
      next.senderId === message.senderId &&
      isSameCalendarDay(next.createdAt, message.createdAt) &&
      minutesBetween(next.createdAt, message.createdAt) <= GROUP_WINDOW_MINUTES;

    const isOwn = message.senderId === getCurrentUserId();

    items.push({
      kind: "bubble",
      id: message.id,
      message,
      isOwn,
      isFirstInRun: !sameRunAsPrev,
      isLastInRun: !sameRunAsNext,
      showSenderName: isGroup && !isOwn && !sameRunAsPrev,
      showAvatar: isGroup && !isOwn && !sameRunAsNext,
      replyToMessage: message.replyToId ? byId.get(message.replyToId) ?? null : null,
    });
  });

  return items;
}

interface MessageListProps {
  conversation: Conversation;
  messages: Message[];
  isLoading: boolean;
  hasMore: boolean;
  isLoadingOlder: boolean;
  onLoadOlder: () => void;
  onReply: (message: Message) => void;
  onReact: (message: Message, emoji: string) => void;
  onEdit: (message: Message, body: string) => void;
  onDeleteForMe: (message: Message) => void;
  onDeleteForEveryone: (message: Message) => void;
}

export function MessageList({
  conversation,
  messages,
  isLoading,
  hasMore,
  isLoadingOlder,
  onLoadOlder,
  onReply,
  onReact,
  onEdit,
  onDeleteForMe,
  onDeleteForEveryone,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevScrollHeight = useRef(0);
  const prevMessageCount = useRef(0);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newCount, setNewCount] = useState(0);

  const typingUsers = useTypingUsers(conversation.id);
  const isGroup = conversation.type === "group";
  const items = useMemo(() => buildThreadItems(messages, isGroup), [messages, isGroup]);

  // Preserve scroll position when older messages are prepended.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (messages.length > prevMessageCount.current && prevScrollHeight.current > 0) {
      const addedHeight = el.scrollHeight - prevScrollHeight.current;
      if (addedHeight > 0 && el.scrollTop < 200) {
        el.scrollTop += addedHeight;
      }
    }
  }, [messages.length]);

  // Scroll to bottom on new messages if already near bottom; otherwise bump the jump button.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const grew = messages.length > prevMessageCount.current;
    prevMessageCount.current = messages.length;
    if (!grew) return;

    const lastMessage = messages[messages.length - 1];
    const isMine = lastMessage?.senderId === getCurrentUserId();

    if (isAtBottom || isMine) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    } else {
      // Bumping the jump-to-bottom badge alongside the scroll decision above
      // — both are reactions to "a message arrived while scrolled up", not
      // state mirrored from props.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNewCount((n) => n + 1);
    }
  }, [messages, isAtBottom]);

  // Jump to bottom instantly on conversation switch, resetting the view state
  // that goes along with that DOM scroll reset.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setIsAtBottom(true);
    setNewCount(0);
    prevMessageCount.current = 0;
    prevScrollHeight.current = 0;
  }, [conversation.id]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setIsAtBottom(atBottom);
    if (atBottom) setNewCount(0);

    if (el.scrollTop < 120 && hasMore && !isLoadingOlder) {
      prevScrollHeight.current = el.scrollHeight;
      onLoadOlder();
    }
  };

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setNewCount(0);
  };

  const scrollToMessage = (messageId: string) => {
    const node = scrollRef.current?.querySelector(`[data-message-id="${messageId}"]`);
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (node instanceof HTMLElement) {
      node.classList.add("bg-accent/10");
      setTimeout(() => node.classList.remove("bg-accent/10"), 900);
    }
  };

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto bg-app pb-2 pt-3"
      >
        {isLoadingOlder && (
          <div className="flex justify-center py-2">
            <Loader2 size={16} className="animate-spin text-secondary" />
          </div>
        )}

        {!isLoading && !hasMore && <EncryptionNotice />}

        {isLoading ? (
          <div className="flex h-full items-center justify-center py-20">
            <Loader2 size={20} className="animate-spin text-secondary" />
          </div>
        ) : (
          items.map((item) => {
            if (item.kind === "divider") return <DateDivider key={item.id} iso={item.iso} />;
            if (item.kind === "system") return <SystemMessage key={item.id} message={item.message} />;
            const sender = getUser(item.message.senderId);
            return (
              <div key={item.id} data-message-id={item.message.id} className="rounded-md transition-colors duration-500">
                <MessageBubble
                  message={item.message}
                  isOwn={item.isOwn}
                  isFirstInRun={item.isFirstInRun}
                  isLastInRun={item.isLastInRun}
                  showSenderName={item.showSenderName}
                  showAvatar={item.showAvatar}
                  avatarId={sender?.id}
                  avatarUrl={sender?.avatarUrl}
                  replyToMessage={item.replyToMessage}
                  onReply={onReply}
                  onReact={onReact}
                  onScrollToMessage={scrollToMessage}
                  onEdit={onEdit}
                  onDeleteForMe={onDeleteForMe}
                  onDeleteForEveryone={onDeleteForEveryone}
                />
              </div>
            );
          })
        )}

        {typingUsers.length > 0 && <TypingBubble typingUserIds={typingUsers} isGroup={isGroup} />}
      </div>

      {!isAtBottom && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-elevated text-primary shadow-menu transition-transform duration-[120ms] ease-signal hover:scale-105"
        >
          <ArrowDown size={18} />
          {newCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold text-on-accent">
              {newCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
