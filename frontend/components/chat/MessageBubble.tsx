"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Ban, CornerUpLeft, Download, File as FileIcon, MoreHorizontal, SmilePlus } from "lucide-react";
import type { Message } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { ForwardDialog } from "@/components/dialogs/ForwardDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { MessageDetailsDialog } from "@/components/dialogs/MessageDetailsDialog";
import { StatusIcon } from "./StatusIcon";
import { MessageActionSheet, QUICK_REACTIONS } from "./MessageActionSheet";
import { cn } from "@/lib/cn";
import { formatBubbleTime, formatFileSize } from "@/lib/format";
import { messageSummary, senderDisplayName } from "@/lib/conversationDisplay";
import { SWIPE_TRIGGER_PX, useBubbleGestures } from "@/hooks/useBubbleGestures";
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
  onEdit?: (message: Message, body: string) => void;
  onDeleteForMe?: (message: Message) => void;
  onDeleteForEveryone?: (message: Message) => void;
}

function copyText(body: string) {
  navigator.clipboard.writeText(body).then(
    () => toast("Copied"),
    () => toast("Couldn't copy")
  );
}

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
  onEdit,
  onDeleteForMe,
  onDeleteForEveryone,
}: MessageBubbleProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteForMeOpen, setDeleteForMeOpen] = useState(false);
  const [deleteForEveryoneOpen, setDeleteForEveryoneOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(message.body);
  const [actionsOpen, setActionsOpen] = useState(false);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const { swipeX, handlers: gestureHandlers } = useBubbleGestures({
    enabled: !isEditing && !message.deletedAt,
    onLongPress: () => setActionsOpen(true),
    onSwipeReply: () => onReply?.(message),
  });

  const startEditing = () => {
    setEditBody(message.body);
    setIsEditing(true);
  };

  useEffect(() => {
    if (isEditing) {
      editRef.current?.focus();
      editRef.current?.select();
    }
  }, [isEditing]);

  const commitEdit = () => {
    const trimmed = editBody.trim();
    if (trimmed && trimmed !== message.body) {
      onEdit?.(message, trimmed);
    }
    setIsEditing(false);
  };

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
  // Only images get the borderless/overlaid-timestamp treatment — video
  // keeps normal bubble padding since native <video controls> already has
  // its own control bar at the bottom, which our floating time/tick badge
  // would otherwise sit on top of and compete with.
  const mediaOnly = message.attachment?.kind === "image" && !message.body;

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
        "group/bubble relative flex px-4",
        isOwn ? "justify-end" : "justify-start",
        isLastInRun ? "mb-3" : "mb-0.5"
      )}
    >
      {swipeX > 0 && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-row-hover text-secondary"
          style={{
            opacity: Math.min(swipeX / SWIPE_TRIGGER_PX, 1),
            transform: `scale(${swipeX >= SWIPE_TRIGGER_PX ? 1.1 : 0.8})`,
          }}
        >
          <CornerUpLeft size={16} />
        </span>
      )}

      {!isOwn && (
        <div className="mr-2 w-7 shrink-0 self-end">
          {showAvatar && avatarId ? (
            <Avatar id={avatarId} name={senderDisplayName(message)} src={avatarUrl} size={28} />
          ) : null}
        </div>
      )}

      <div
        {...gestureHandlers}
        className={cn(
          "flex max-w-[85%] touch-pan-y touch-pinch-zoom flex-col md:max-w-[65%]",
          // On touch, long-press opens the action sheet (which has Copy)
          // instead of the browser's own text-selection / save-image menu.
          !isEditing && "pointer-coarse:select-none pointer-coarse:[-webkit-touch-callout:none]",
          isOwn ? "items-end" : "items-start"
        )}
        style={{
          transform: swipeX ? `translateX(${swipeX}px)` : undefined,
          transition: swipeX ? "none" : "transform 180ms ease-out",
        }}
      >
        <div className="relative flex items-center gap-1.5">
          {isOwn && (
            <HoverToolbar
              message={message}
              isOwn={isOwn}
              onReply={onReply}
              onReact={onReact}
              onForward={() => setForwardOpen(true)}
              onEdit={startEditing}
              onShowDetails={() => setDetailsOpen(true)}
              onDeleteForMe={() => setDeleteForMeOpen(true)}
              onDeleteForEveryone={() => setDeleteForEveryoneOpen(true)}
              align="left"
            />
          )}

          {emojiOnly ? (
            <div className="px-1 py-0.5 text-[32px] leading-none">{message.body}</div>
          ) : (
            <div
              className={cn(
                "relative rounded-bubble",
                mediaOnly ? "p-1" : "px-3 py-2",
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
                    {replyToMessage.deletedAt
                      ? "This message was deleted"
                      : messageSummary(
                          replyToMessage.body,
                          replyToMessage.attachment?.kind,
                          replyToMessage.attachment?.name
                        )}
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

              {message.attachment?.kind === "video" && (
                <div className={cn("overflow-hidden rounded-md", message.body && "mb-1.5")}>
                  <video
                    src={message.attachment.url}
                    controls
                    preload="metadata"
                    className="max-h-[320px] max-w-[260px]"
                  />
                </div>
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

              {isEditing ? (
                <div className="flex min-w-[200px] flex-col gap-1.5">
                  <textarea
                    ref={editRef}
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        commitEdit();
                      } else if (e.key === "Escape") {
                        setIsEditing(false);
                      }
                    }}
                    rows={1}
                    className={cn(
                      "resize-none rounded-sm bg-transparent text-[14.5px] leading-[21px] outline-none",
                      isOwn ? "placeholder:text-on-accent/60" : "placeholder:text-secondary"
                    )}
                  />
                  <div className="flex items-center justify-end gap-2 text-[11.5px] font-medium">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="opacity-80 hover:opacity-100"
                    >
                      Cancel
                    </button>
                    <button type="button" onClick={commitEdit} className="opacity-80 hover:opacity-100">
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                message.body && (
                  <span className="whitespace-pre-wrap break-words text-[14.5px] leading-[21px]">
                    {message.body}
                    <span className="ml-2 inline-flex translate-y-1 items-center gap-1 align-bottom text-[11px] opacity-0">
                      {formatBubbleTime(message.createdAt)}
                      {isOwn && <StatusIcon status={message.status} />}
                    </span>
                  </span>
                )
              )}

              <span
                className={cn(
                  "pointer-events-none absolute bottom-1.5 right-3 flex items-center gap-1 rounded-full text-[11px]",
                  mediaOnly ? "bg-black/45 px-1.5 py-0.5 text-white" : isOwn ? "text-on-accent/80" : "text-secondary"
                )}
              >
                {message.editedAt && !isEditing && <span className="italic opacity-80">edited</span>}
                {formatBubbleTime(message.createdAt)}
                {isOwn && (
                  <StatusIcon
                    status={message.status}
                    className={message.status === "read" ? "text-on-accent" : undefined}
                  />
                )}
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

          {!isOwn && (
            <HoverToolbar
              message={message}
              isOwn={isOwn}
              onReply={onReply}
              onReact={onReact}
              onForward={() => setForwardOpen(true)}
              onEdit={startEditing}
              onShowDetails={() => setDetailsOpen(true)}
              onDeleteForMe={() => setDeleteForMeOpen(true)}
              onDeleteForEveryone={() => setDeleteForEveryoneOpen(true)}
              align="right"
            />
          )}
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

      <MessageActionSheet
        message={message}
        isOwn={isOwn}
        open={actionsOpen}
        onOpenChange={setActionsOpen}
        onReact={(emoji) => onReact?.(message, emoji)}
        onReply={() => onReply?.(message)}
        onCopy={() => copyText(message.body)}
        onForward={() => setForwardOpen(true)}
        onEdit={startEditing}
        onDetails={() => setDetailsOpen(true)}
        onDeleteForMe={() => setDeleteForMeOpen(true)}
        onDeleteForEveryone={() => setDeleteForEveryoneOpen(true)}
      />
      <ForwardDialog message={forwardOpen ? message : null} onOpenChange={setForwardOpen} />
      <MessageDetailsDialog message={detailsOpen ? message : null} onOpenChange={setDetailsOpen} />
      <ConfirmDialog
        open={deleteForMeOpen}
        onOpenChange={setDeleteForMeOpen}
        title="Delete message for me?"
        description="This removes the message from your view only — it stays visible to everyone else."
        confirmLabel="Delete for me"
        onConfirm={() => {
          onDeleteForMe?.(message);
          toast("Message deleted");
        }}
      />
      <ConfirmDialog
        open={deleteForEveryoneOpen}
        onOpenChange={setDeleteForEveryoneOpen}
        title="Delete message for everyone?"
        description="This removes the message for everyone in the chat. This can't be undone."
        confirmLabel="Delete for everyone"
        onConfirm={() => {
          onDeleteForEveryone?.(message);
          toast("Message deleted");
        }}
      />
    </div>
  );
}

function HoverToolbar({
  message,
  isOwn,
  onReply,
  onReact,
  onForward,
  onEdit,
  onShowDetails,
  onDeleteForMe,
  onDeleteForEveryone,
  align,
}: {
  message: Message;
  isOwn: boolean;
  onReply?: (message: Message) => void;
  onReact?: (message: Message, emoji: string) => void;
  onForward?: (message: Message) => void;
  onEdit?: () => void;
  onShowDetails?: () => void;
  onDeleteForMe?: () => void;
  onDeleteForEveryone?: () => void;
  align: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 opacity-0 transition-opacity duration-[120ms] group-hover/bubble:opacity-100",
        // Invisible-but-tappable on touch screens otherwise; touch uses the
        // long-press sheet instead.
        "pointer-coarse:hidden",
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
          {message.body && (
            <MenuItem onSelect={() => copyText(message.body)}>
              Copy text
            </MenuItem>
          )}
          <MenuItem onSelect={() => onForward?.(message)}>Forward</MenuItem>
          {isOwn && message.type === "text" && (
            <MenuItem onSelect={() => onEdit?.()}>Edit</MenuItem>
          )}
          {isOwn && <MenuItem onSelect={() => onShowDetails?.()}>Message details</MenuItem>}
          <MenuSeparator />
          <MenuItem danger onSelect={() => onDeleteForMe?.()}>
            Delete for me
          </MenuItem>
          {isOwn && (
            <MenuItem danger onSelect={() => onDeleteForEveryone?.()}>
              Delete for everyone
            </MenuItem>
          )}
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
