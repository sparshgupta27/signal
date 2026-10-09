"use client";

import { useState } from "react";
import { Ban, CornerUpLeft, Download, File as FileIcon, MoreHorizontal, SmilePlus } from "lucide-react";
import type { Message } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { StatusIcon } from "./StatusIcon";
import { cn } from "@/lib/cn";
import { formatBubbleTime, formatFileSize } from "@/lib/format";
import { senderDisplayName } from "@/lib/conversationDisplay";
import { getCurrentUserId } from "@/lib/session";
import { getUser } from "@/lib/users";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/Menu";

const EMOJI_ONLY_RE = /^(\p{Extended_Pictographic}️?\s*){1,3}$/u;

function isEmojiOnly(body: string): boolean {
  const trimmed = body.trim();
  return trimmed.length > 0 && EMOJI_ONLY_RE.test(trimmed);
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  isFirstInRun: boolean;
  isLastInRun: boolean;
  showSenderName: boolean;
  showAvatar: boolean;
  avatarId?: string;
  avatarUrl?: string | null;
  replyToMessage?: Message | null;
  onReply?: (message: Message) => void;
  onReact?: (message: Message, emoji: string) => void;
  onScrollToMessage?: (messageId: string) => void;
}

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "🙏", "👍"];

export function MessageBubble({
  message,
  isOwn,
  isFirstInRun,
  isLastInRun,
  showSenderName,
  showAvatar,
  avatarId,
  avatarUrl,
  replyToMessage,
  onReply,
  onReact,
  onScrollToMessage,
}: MessageBubbleProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (message.deletedAt) {
    return (
      <div className={cn("mb-0.5 flex px-4", isOwn ? "justify-end" : "justify-start")}>
        <div className="flex items-center gap-1.5 rounded-bubble bg-transparent px-1 py-1 text-[13.5px] italic text-secondary">
          <Ban size={14} />
          This message was deleted
        </div>
      </div>
    );
  }

  const emojiOnly = !message.attachment && isEmojiOnly(message.body);
  const reactionGroups = groupReactions(message.reactions);
  const imageOnly = message.attachment?.kind === "image" && !message.body;

  const outgoingCorner = cn(
    !isLastInRun && "rounded-br-[5px]",
    !isFirstInRun && "rounded-tr-[5px]"
  );
  const incomingCorner = cn(
    !isLastInRun && "rounded-bl-[5px]",
    !isFirstInRun && "rounded-tl-[5px]"
  );

  return (
    <div
      className={cn(
        "group/bubble flex px-4",
        isOwn ? "justify-end" : "justify-start",
        isLastInRun ? "mb-3" : "mb-0.5"
      )}
    >
      {!isOwn && (
        <div className="mr-2 w-7 shrink-0 self-end">
          {showAvatar && avatarId ? (
            <Avatar id={avatarId} name={senderDisplayName(message)} src={avatarUrl} size={28} />
          ) : null}
        </div>
      )}

      <div className={cn("flex max-w-[85%] flex-col md:max-w-[65%]", isOwn ? "items-end" : "items-start")}>
        <div className="relative flex items-center gap-1.5">
          {isOwn && <HoverToolbar message={message} onReply={onReply} onReact={onReact} align="left" />}

          {emojiOnly ? (
            <div className="px-1 py-0.5 text-[32px] leading-none">{message.body}</div>
          ) : (
            <div
              className={cn(
                "relative rounded-bubble",
                imageOnly ? "p-1" : "px-3 py-2",
                isOwn ? ["bg-bubble-out text-on-accent", outgoingCorner] : ["bg-bubble-in text-primary", incomingCorner]
              )}
            >
              {showSenderName && !isOwn && (
                <div
                  className="mb-0.5 text-[13px] font-semibold"
                  style={{ color: `var(--avatar-${avatarColorFor(message.senderId)})` }}
                >
                  {senderDisplayName(message)}
                </div>
              )}

              {replyToMessage && (
                <button
                  type="button"
                  onClick={() => onScrollToMessage?.(replyToMessage.id)}
                  className={cn(
                    "mb-1.5 flex w-full flex-col rounded-sm border-l-[3px] px-2 py-1 text-left",
                    isOwn ? "border-white/50 bg-black/10" : "border-accent bg-black/5"
                  )}
                >
                  <span className="text-[12px] font-semibold">
                    {senderDisplayName(replyToMessage)}
                  </span>
                  <span className="truncate text-[12px] opacity-80">
                    {replyToMessage.deletedAt ? "This message was deleted" : replyToMessage.body}
                  </span>
                </button>
              )}

              {message.attachment?.kind === "image" && (
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className={cn("block overflow-hidden rounded-md", message.body && "mb-1.5")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- client-only data URL, not an optimizable asset */}
                  <img
                    src={message.attachment.url}
                    alt={message.attachment.name}
                    className="max-h-[320px] max-w-[260px] object-cover"
                  />
                </button>
              )}

              {message.attachment?.kind === "file" && (
                <a
                  href={message.attachment.url}
                  download={message.attachment.name}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2",
                    message.body && "mb-1.5",
                    isOwn ? "bg-black/10" : "bg-black/5"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      isOwn ? "bg-white/20" : "bg-accent/15 text-accent"
                    )}
                  >
                    <FileIcon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{message.attachment.name}</span>
                    <span className="block text-[11px] opacity-75">{formatFileSize(message.attachment.size)}</span>
                  </span>
                  <Download size={16} className="shrink-0 opacity-75" />
                </a>
              )}

              {message.body && (
                <span className="whitespace-pre-wrap break-words text-[14.5px] leading-[21px]">
                  {message.body}
                  <span className="ml-2 inline-flex translate-y-1 items-center gap-1 align-bottom text-[11px] opacity-0">
                    {formatBubbleTime(message.createdAt)}
                    {isOwn && <StatusIcon status={message.status} />}
                  </span>
                </span>
              )}

              <span
                className={cn(
                  "pointer-events-none absolute bottom-1.5 right-3 flex items-center gap-1 rounded-full text-[11px]",
                  imageOnly ? "bg-black/45 px-1.5 py-0.5 text-white" : isOwn ? "text-on-accent/80" : "text-secondary"
                )}
              >
                {formatBubbleTime(message.createdAt)}
                {isOwn && <StatusIcon status={message.status} />}
              </span>

              {message.attachment?.kind === "image" && (
                <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
                  <DialogContent width={640} className="flex items-center justify-center bg-transparent p-2 shadow-none">
                    {/* eslint-disable-next-line @next/next/no-img-element -- client-only data URL, not an optimizable asset */}
                    <img
                      src={message.attachment.url}
                      alt={message.attachment.name}
                      className="max-h-[80vh] w-auto rounded-md"
                    />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}

          {!isOwn && <HoverToolbar message={message} onReply={onReply} onReact={onReact} align="right" />}
        </div>

        {reactionGroups.length > 0 && (
          <div className={cn("mt-1 flex flex-wrap gap-1", isOwn ? "justify-end" : "justify-start")}>
            {reactionGroups.map((g) => (
              <button
                key={g.emoji}
                type="button"
                onClick={() => onReact?.(message, g.emoji)}
                className={cn(
                  "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[12px]",
                  g.mine
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-divider bg-elevated text-secondary"
                )}
              >
                <span>{g.emoji}</span>
                <span>{g.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HoverToolbar({
  message,
  onReply,
  onReact,
  align,
}: {
  message: Message;
  onReply?: (message: Message) => void;
  onReact?: (message: Message, emoji: string) => void;
  align: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 opacity-0 transition-opacity duration-[120ms] group-hover/bubble:opacity-100",
        align === "left" ? "order-first" : "order-last"
      )}
    >
      <Menu>
        <MenuTrigger asChild>
          <button
            type="button"
            aria-label="Add reaction"
            className="flex h-7 w-7 items-center justify-center rounded-full text-secondary hover:bg-row-hover hover:text-primary"
          >
            <SmilePlus size={15} />
          </button>
        </MenuTrigger>
        <MenuContent align="center">
          <div className="flex items-center gap-1 p-1">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact?.(message, emoji)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[18px] hover:bg-row-hover"
              >
                {emoji}
              </button>
            ))}
          </div>
        </MenuContent>
      </Menu>

      <button
        type="button"
        aria-label="Reply"
        onClick={() => onReply?.(message)}
        className="flex h-7 w-7 items-center justify-center rounded-full text-secondary hover:bg-row-hover hover:text-primary"
      >
        <CornerUpLeft size={15} />
      </button>

      <Menu>
        <MenuTrigger asChild>
          <button
            type="button"
            aria-label="More"
            className="flex h-7 w-7 items-center justify-center rounded-full text-secondary hover:bg-row-hover hover:text-primary"
          >
            <MoreHorizontal size={15} />
          </button>
        </MenuTrigger>
        <MenuContent align="center">
          <MenuItem onSelect={() => navigator.clipboard.writeText(message.body)}>Copy text</MenuItem>
          <MenuItem disabled>Message details</MenuItem>
          <MenuSeparator />
          <MenuItem danger disabled>
            Delete for me
          </MenuItem>
          <MenuItem danger disabled>
            Delete for everyone
          </MenuItem>
        </MenuContent>
      </Menu>
    </div>
  );
}

function groupReactions(reactions: Message["reactions"]) {
  const map = new Map<string, { emoji: string; count: number; mine: boolean }>();
  for (const r of reactions) {
    const entry = map.get(r.emoji) ?? { emoji: r.emoji, count: 0, mine: false };
    entry.count += 1;
    if (r.userId === getCurrentUserId()) entry.mine = true;
    map.set(r.emoji, entry);
  }
  return Array.from(map.values());
}

function avatarColorFor(userId: string | null): number {
  const name = getUser(userId)?.id ?? "x";
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return (hash % 12) + 1;
}
