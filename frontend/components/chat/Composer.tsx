"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { File as FileIcon, Loader2, Mic, Paperclip, Send, Smile, X } from "lucide-react";
import type { Message, MessageAttachment } from "@/types";
import { CameraCaptureDialog } from "@/components/dialogs/CameraCaptureDialog";
import { IconButton } from "@/components/ui/IconButton";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/Menu";
import { senderDisplayName } from "@/lib/conversationDisplay";
import { formatFileSize } from "@/lib/format";
import { dataUrlToFile, fileToChatImage } from "@/lib/image";
import * as api from "@/lib/api";
import { useUiStore } from "@/store/uiStore";
import { useTyping } from "@/hooks/useTyping";
import { useSendMessage } from "@/hooks/useSendMessage";
import { cn } from "@/lib/cn";

const QUICK_EMOJI = ["😀", "😂", "❤️", "👍", "🙏", "😮", "😢", "🔥", "🎉", "👀", "💯", "😅"];
const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;

type UploadedAttachment = MessageAttachment & { id: string };

interface ComposerProps {
  conversationId: string;
  canSend: boolean;
  disabledMessage?: string;
  replyTo: Message | null;
  onCancelReply: () => void;
}

export function Composer({
  conversationId,
  canSend,
  disabledMessage,
  replyTo,
  onCancelReply,
}: ComposerProps) {
  // The draft lives in uiStore, keyed by conversation — reading it straight
  // from there (rather than mirroring into local state) means switching
  // chats never needs an effect to resync anything.
  const value = useUiStore((s) => s.drafts[conversationId] ?? "");
  const setDraft = useUiStore((s) => s.setDraft);
  const [pendingAttachment, setPendingAttachment] = useState<UploadedAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  // Resetting a half-picked attachment when the chat changes, via React's
  // "adjust state while rendering" pattern — not an effect, since a half-
  // picked photo for one conversation has no business in the next one and
  // this has to happen before paint, not after.
  const [attachmentConversationId, setAttachmentConversationId] = useState(conversationId);
  if (conversationId !== attachmentConversationId) {
    setAttachmentConversationId(conversationId);
    setPendingAttachment(null);
    setUploading(false);
  }
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { notifyTyping, stopTyping } = useTyping(conversationId);
  const { send } = useSendMessage(conversationId);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
  }, [value]);

  const canSubmit = (!!value.trim() || !!pendingAttachment) && !uploading;

  const handleSend = () => {
    if (!canSubmit) return;
    send(value, {
      replyToId: replyTo?.id,
      attachmentId: pendingAttachment?.id,
      attachmentPreview: pendingAttachment,
    });
    setDraft(conversationId, "");
    setPendingAttachment(null);
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

  const uploadImageFile = async (file: File) => {
    setUploading(true);
    try {
      const { url, width, height } = await fileToChatImage(file);
      const resized = await dataUrlToFile(url, file.name, "image/jpeg");
      const uploaded = await api.uploadAttachment(resized, { width, height });
      setPendingAttachment(uploaded);
    } catch {
      toast("Couldn't upload that image");
    } finally {
      setUploading(false);
    }
  };

  // Video can't go through the canvas-resize pipeline fileToChatImage uses
  // for images — there's no cheap client-side way to re-encode/shrink a
  // video in the browser, so it uploads as-is.
  const uploadVideoFile = async (file: File) => {
    setUploading(true);
    try {
      const uploaded = await api.uploadAttachment(file);
      setPendingAttachment(uploaded);
    } catch {
      toast("Couldn't upload that video");
    } finally {
      setUploading(false);
    }
  };

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast("Please choose a photo or video file");
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast("That file is too large (max 50MB)");
      return;
    }
    if (file.type.startsWith("video/")) {
      await uploadVideoFile(file);
    } else {
      await uploadImageFile(file);
    }
  };

  const handleCameraCapture = (file: File) => {
    uploadImageFile(file);
  };

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast("File is too large (max 50MB)");
      return;
    }
    setUploading(true);
    try {
      const uploaded = await api.uploadAttachment(file);
      setPendingAttachment(uploaded);
    } catch {
      toast("Couldn't upload that file");
    } finally {
      setUploading(false);
    }
  };

  if (!canSend) {
    return (
      <div className="flex shrink-0 items-center justify-center border-t border-divider bg-app px-4 py-4">
        <p className="text-[13px] text-secondary">
          {disabledMessage ?? "You can't send messages because you're no longer a member"}
        </p>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-divider bg-app">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleImagePick}
      />
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFilePick} />

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

      {uploading && !pendingAttachment && (
        <div className="flex items-center gap-2 border-b border-divider bg-sidebar px-4 py-2">
          <Loader2 size={16} className="shrink-0 animate-spin text-secondary" />
          <span className="text-[12.5px] text-secondary">Uploading…</span>
        </div>
      )}

      {pendingAttachment && (
        <div className="flex items-center gap-2 border-b border-divider bg-sidebar px-4 py-2">
          {pendingAttachment.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element -- authenticated remote URL, not an optimizable asset
            <img src={pendingAttachment.url} alt="" className="h-10 w-10 rounded-md object-cover" />
          ) : pendingAttachment.kind === "video" ? (
             
            <video src={pendingAttachment.url} className="h-10 w-10 rounded-md object-cover" muted />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-row-hover text-secondary">
              <FileIcon size={18} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-medium text-primary">{pendingAttachment.name}</div>
            <div className="text-[11.5px] text-secondary">{formatFileSize(pendingAttachment.size)}</div>
          </div>
          <button
            type="button"
            aria-label="Remove attachment"
            onClick={() => setPendingAttachment(null)}
            className="rounded-full p-1 text-secondary hover:bg-row-hover hover:text-primary"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-1.5 p-3">
        <Menu>
          <MenuTrigger asChild>
            <IconButton label="Attach" showTooltip={false} disabled={uploading}>
              <Paperclip size={20} strokeWidth={1.75} />
            </IconButton>
          </MenuTrigger>
          <MenuContent align="start" side="top">
            <MenuItem onSelect={() => imageInputRef.current?.click()}>Photo & video</MenuItem>
            <MenuItem onSelect={() => setCameraOpen(true)}>Camera</MenuItem>
            <MenuItem onSelect={() => fileInputRef.current?.click()}>File</MenuItem>
          </MenuContent>
        </Menu>

        <CameraCaptureDialog open={cameraOpen} onOpenChange={setCameraOpen} onCapture={handleCameraCapture} />

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
          label={canSubmit ? "Send message" : "Record voice message"}
          showTooltip={false}
          onClick={canSubmit ? handleSend : () => toast("Voice messages are coming soon")}
          className={cn(
            "transition-colors duration-[120ms] ease-signal",
            canSubmit && "bg-accent text-on-accent hover:bg-accent-hover hover:text-on-accent"
          )}
        >
          {canSubmit ? <Send size={18} strokeWidth={2} /> : <Mic size={20} strokeWidth={1.75} />}
        </IconButton>
      </div>
    </div>
  );
}
