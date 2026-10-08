"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Mic, Paperclip, Send, Smile, X } from "lucide-react";
import type { Message } from "@/types";
import { IconButton } from "@/components/ui/IconButton";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/Menu";
import { senderDisplayName } from "@/lib/conversationDisplay";
import { useUiStore } from "@/store/uiStore";
import { useTyping } from "@/hooks/useTyping";
import { useSendMessage } from "@/hooks/useSendMessage";
import { cn } from "@/lib/cn";

const QUICK_EMOJI = ["😀", "😂", "❤️", "👍", "🙏", "😮", "😢", "🔥", "🎉", "👀", "💯", "😅"];

interface ComposerProps {
  conversationId: string;
  canSend: boolean;
  replyTo: Message | null;
  onCancelReply: () => void;
}

export function Composer({ conversationId, canSend, replyTo, onCancelReply }: ComposerProps) {
  // The draft lives in uiStore, keyed by conversation — reading it straight
  // from there (rather than mirroring into local state) means switching
  // chats never needs an effect to resync anything.
  const value = useUiStore((s) => s.drafts[conversationId] ?? "");
  const setDraft = useUiStore((s) => s.setDraft);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { notifyTyping, stopTyping } = useTyping(conversationId);
  const { send } = useSendMessage(conversationId);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
  }, [value]);

  const handleSend = () => {
    if (!value.trim()) return;
    send(value, { replyToId: replyTo?.id });
    setDraft(conversationId, "");
    onCancelReply();
    stopTyping();
    textareaRef.current?.focus();
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(conversationId, e.target.value);
    if (e.target.value.trim()) notifyTyping();
    else stopTyping();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape" && replyTo) {
      onCancelReply();
    }
  };

  const insertEmoji = (emoji: string) => {
    setDraft(conversationId, `${value}${emoji}`);
    textareaRef.current?.focus();
  };

  if (!canSend) {
    return (
      <div className="flex shrink-0 items-center justify-center border-t border-divider bg-app px-4 py-4">
        <p className="text-[13px] text-secondary">
          You can&apos;t send messages because you&apos;re no longer a member
        </p>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-divider bg-app">
      {replyTo && (
        <div className="flex items-center gap-2 border-b border-divider bg-sidebar px-4 py-2">
          <div className="min-w-0 flex-1 border-l-2 border-accent pl-2">
            <div className="text-[12px] font-semibold text-accent">{senderDisplayName(replyTo)}</div>
            <div className="truncate text-[12.5px] text-secondary">
              {replyTo.deletedAt ? "This message was deleted" : replyTo.body}
            </div>
          </div>
          <button
            type="button"
            aria-label="Cancel reply"
            onClick={onCancelReply}
            className="rounded-full p-1 text-secondary hover:bg-row-hover hover:text-primary"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-1.5 p-3">
        <Menu>
          <MenuTrigger asChild>
            <IconButton label="Attach" showTooltip={false}>
              <Paperclip size={20} strokeWidth={1.75} />
            </IconButton>
          </MenuTrigger>
          <MenuContent align="start" side="top">
            <MenuItem onSelect={() => toast("Photo & video sharing is coming soon")}>
              Photo or video
            </MenuItem>
            <MenuItem onSelect={() => toast("File sharing is coming soon")}>File</MenuItem>
          </MenuContent>
        </Menu>

        <div className="flex min-w-0 flex-1 items-end gap-1 rounded-lg bg-input px-3 py-2">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={stopTyping}
            rows={1}
            placeholder="Type a message"
            className="max-h-[150px] min-h-[22px] flex-1 resize-none bg-transparent text-[14.5px] leading-[22px] text-primary outline-none placeholder:text-secondary"
          />
          <Menu>
            <MenuTrigger asChild>
              <button
                type="button"
                aria-label="Emoji"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-secondary hover:bg-row-hover hover:text-primary"
              >
                <Smile size={19} strokeWidth={1.75} />
              </button>
            </MenuTrigger>
            <MenuContent align="end" side="top" className="w-60">
              <div className="grid grid-cols-6 gap-1 p-1">
                {QUICK_EMOJI.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-[18px] hover:bg-row-hover"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </MenuContent>
          </Menu>
        </div>

        <IconButton
          label={value.trim() ? "Send message" : "Record voice message"}
          showTooltip={false}
          onClick={value.trim() ? handleSend : () => toast("Voice messages are coming soon")}
          className={cn(
            "transition-colors duration-[120ms] ease-signal",
            value.trim() && "bg-accent text-on-accent hover:bg-accent-hover hover:text-on-accent"
          )}
        >
          {value.trim() ? <Send size={18} strokeWidth={2} /> : <Mic size={20} strokeWidth={1.75} />}
        </IconButton>
      </div>
    </div>
  );
}
